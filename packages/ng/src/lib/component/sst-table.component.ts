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

	public readonly columns = input.required<readonly IColumn[]>();
	public readonly service = input.required<SstTableService<T>>();
	public readonly bulk = input<boolean>(false);
	public readonly searchEnabled = input<boolean>(false);
	public readonly searchPlaceholder = input<string>('Search');
	public readonly searchDebounceMs = input<number>(500);
	public readonly emptyText = input<string>('No results');
	public readonly bulkDeleteLabel = input<string>('Delete selected');
	public readonly testIdPrefix = input<string>('sst');

	@ContentChild('headerCell') public readonly headerCell?: TemplateRef<{ $implicit: IColumn }>;
	@ContentChild('bodyCell') public readonly bodyCell?: TemplateRef<{ $implicit: T; column: IColumn; index: number }>;
	@ContentChild('emptyState') public readonly emptyState?: TemplateRef<unknown>;
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
		if (checked) next.add(id); else next.delete(id);
		this.bulkSelected.set(next);
	}

	protected onAllChecked(checked: boolean): void {
		if (!checked) {
			this.bulkSelected.set(new Set<string>());
			return;
		}
		const all = new Set(this.service().data().map((r) => r.id));
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

	protected get totalPages(): number {
		const total = this.service().total();
		const size = this.service().pagination().pageSize;
		return Math.max(1, Math.ceil(total / size));
	}
}
