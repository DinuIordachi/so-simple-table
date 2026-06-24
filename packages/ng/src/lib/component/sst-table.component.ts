import {
	Component,
	ContentChild,
	DestroyRef,
	OnInit,
	TemplateRef,
	computed,
	inject,
	input,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ESortOrder, type IColumn, type ISortParams } from '@sst/core';
import { SstTableService } from '../store/sst-table.service';

/**
 * `<sst-table>` — a standalone, presentational data-table component driven by an
 * {@link SstTableService}.
 *
 * @remarks
 * The component owns rendering and user interaction (sorting, pagination, search
 * debouncing, row/all selection, and bulk delete) while delegating all data and state
 * to the bound {@link SstTableComponent.service | service}. On init it syncs the local
 * search box from the service and triggers the first `refresh()`.
 *
 * Appearance is customized through optional content-projection slots, supplied as named
 * templates inside the component's tag:
 *
 * - `#headerCell` — context `{ $implicit: IColumn }`; renders a column header.
 * - `#bodyCell` — context `{ $implicit: T; column: IColumn; index: number }`; renders a cell.
 * - `#emptyState` — no context; replaces the default empty-results message.
 * - `#bulkActions` — context `{ $implicit: ReadonlySet<string> }`; renders custom actions
 *   for the current selection.
 *
 * @typeParam T - The row entity type; must expose a string `id` used for selection and
 * bulk operations.
 *
 * @example
 * ```html
 * <sst-table
 *   [columns]="columns"
 *   [service]="usersTable"
 *   [bulk]="true"
 *   [searchEnabled]="true"
 * >
 *   <ng-template #bodyCell let-row let-column="column">
 *     {{ row[column.key] }}
 *   </ng-template>
 * </sst-table>
 * ```
 */
@Component({
	selector: 'sst-table',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './sst-table.component.html',
	styleUrl: './sst-table.component.scss',
	host: { class: 'sst-table-host' },
})
export class SstTableComponent<T extends { id: string }> implements OnInit {
	private readonly destroyRef = inject(DestroyRef);

	/** Required. Column definitions describing each table column (key, label, sortable, …). */
	public readonly columns = input.required<readonly IColumn[]>();
	/** Required. The reactive store that supplies rows and table state and receives user actions. */
	public readonly service = input.required<SstTableService<T>>();
	/** When `true`, enables row selection checkboxes and the bulk-delete action. Defaults to `false`. */
	public readonly bulk = input<boolean>(false);
	/** When `true`, renders the search input. Defaults to `false`. */
	public readonly searchEnabled = input<boolean>(false);
	/** Placeholder text for the search input. Defaults to `'Search'`. */
	public readonly searchPlaceholder = input<string>('Search');
	/** Debounce delay, in milliseconds, before a search term is pushed to the service. Defaults to `500`. */
	public readonly searchDebounceMs = input<number>(500);
	/** Message shown when there are no rows (unless overridden by the `#emptyState` slot). Defaults to `'No results'`. */
	public readonly emptyText = input<string>('No results');
	/** Label for the bulk-delete button. Defaults to `'Delete selected'`. */
	public readonly bulkDeleteLabel = input<string>('Delete selected');
	/** Prefix applied to generated `data-testid` attributes, for end-to-end testing. Defaults to `'sst'`. */
	public readonly testIdPrefix = input<string>('sst');

	/** Optional projected template for rendering a column header. Context: `{ $implicit: IColumn }`. */
	@ContentChild('headerCell') public readonly headerCell?: TemplateRef<{ $implicit: IColumn }>;
	/** Optional projected template for rendering a body cell. Context: `{ $implicit: T; column: IColumn; index: number }`. */
	@ContentChild('bodyCell') public readonly bodyCell?: TemplateRef<{ $implicit: T; column: IColumn; index: number }>;
	/** Optional projected template shown in place of the default empty-state message. No context. */
	@ContentChild('emptyState') public readonly emptyState?: TemplateRef<unknown>;
	/** Optional projected template for custom bulk actions. Context: `{ $implicit: ReadonlySet<string> }` (the selected ids). */
	@ContentChild('bulkActions') public readonly bulkActions?: TemplateRef<{ $implicit: ReadonlySet<string> }>;

	protected readonly searchInput = signal<string>('');
	protected readonly bulkSelected = signal<ReadonlySet<string>>(new Set<string>());
	protected readonly bulkDeleteLoading = signal<boolean>(false);
	private searchTimer: ReturnType<typeof setTimeout> | undefined;

	protected readonly allChecked = computed(() => {
		const data = this.service().data();
		const selected = this.bulkSelected();
		return data.length > 0 && data.every((row) => selected.has(row.id));
	});

	protected readonly indeterminate = computed(() => {
		const data = this.service().data();
		const selected = this.bulkSelected();
		const someSelected = data.some((row) => selected.has(row.id));
		return someSelected && !this.allChecked();
	});

	/**
	 * Angular lifecycle hook. Seeds the local search box from the service's current
	 * search term, triggers the initial data load via `refresh()`, and registers cleanup
	 * for the pending search debounce timer.
	 */
	public ngOnInit(): void {
		// Sync local search state from the service in case it was preset.
		this.searchInput.set(this.service().search());
		// Trigger initial data load.
		this.service().refresh();
		this.destroyRef.onDestroy(() => {
			if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
		});
	}

	protected onSearchInput(value: string): void {
		this.searchInput.set(value);
		if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
		this.searchTimer = setTimeout(() => {
			this.service().updateSearch(value);
		}, this.searchDebounceMs());
	}

	protected onClearSearch(): void {
		this.searchInput.set('');
		this.service().updateSearch('');
	}

	protected onSortClick(column: IColumn): void {
		if (!column.sortable) return;
		const current = this.service().sort();
		const next: ISortParams | undefined =
			!current || current.field !== column.key
				? { id: `${column.key}-${ESortOrder.ASC}`, field: column.key, order: ESortOrder.ASC }
				: current.order === ESortOrder.ASC
					? { id: `${column.key}-${ESortOrder.DESC}`, field: column.key, order: ESortOrder.DESC }
					: undefined;
		this.service().updateSort(next);
	}

	protected sortIndicator(column: IColumn): '↑' | '↓' | '' {
		const sort = this.service().sort();
		if (!sort || sort.field !== column.key) return '';
		return sort.order === ESortOrder.ASC ? '↑' : '↓';
	}

	protected onRowChecked(id: string, checked: boolean): void {
		const next = new Set(this.bulkSelected());
		if (checked) next.add(id);
		else next.delete(id);
		this.bulkSelected.set(next);
	}

	protected onAllChecked(checked: boolean): void {
		if (!checked) {
			this.bulkSelected.set(new Set<string>());
			return;
		}
		const all = new Set(
			this.service()
				.data()
				.map((r) => r.id),
		);
		this.bulkSelected.set(all);
	}

	protected async onBulkDelete(): Promise<void> {
		const ids = [...this.bulkSelected()];
		if (ids.length === 0) return;
		this.bulkDeleteLoading.set(true);
		try {
			await this.service().bulkDelete(ids);
			this.bulkSelected.set(new Set<string>());
		} finally {
			this.bulkDeleteLoading.set(false);
		}
	}

	protected onPageChange(page: number): void {
		const current = this.service().pagination();
		this.service().updatePagination({ ...current, page });
	}

	/**
	 * Total number of pages, derived from the service's total row count and current
	 * page size. Always at least `1`.
	 */
	protected get totalPages(): number {
		const total = this.service().total();
		const size = this.service().pagination().pageSize;
		return Math.max(1, Math.ceil(total / size));
	}
}
