import { getCurrentInstance, onMounted, reactive, ref } from 'vue';
import { ESortOrder, type IFilterParams, type IResponse } from '@sst/core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import type {
	DataTableCellEditCompleteEvent,
	DataTableFilterEvent,
	DataTableFilterMeta,
	DataTablePageEvent,
	DataTableRowEditSaveEvent,
	DataTableSortEvent,
} from 'primevue/datatable';

/** PrimeVue encodes ascending as `1` and descending as `-1` in `sortOrder`. */
const PRIME_ASC = 1;
const PRIME_DESC = -1;

/** Options for {@link useSstDataTable}. */
export interface IUseSstDataTableOptions<T extends { id: string | number }> {
	/** Call `store.refresh()` on mount (PrimeVue lazy does not auto-fetch). Default `true`. */
	readonly immediate?: boolean;
	/** Debounce (ms) before a `@filter` is pushed to the store. Default `300`. */
	readonly filterDebounceMs?: number;
	/** Override how PrimeVue's filter object maps to store search/filters (e.g. to encode `matchMode`). */
	readonly mapFilters?: (filters: DataTableFilterMeta) => { search?: string; filters?: IFilterParams[] };
	/** Persist an inline edit. The row is updated optimistically and reverted if this rejects. */
	readonly onSave?: (edit: ISstDataTableEdit<T>) => Promise<void> | void;
}

/** A persisted edit emitted by PrimeVue's cell/row editing. */
export interface ISstDataTableEdit<T extends { id: string | number }> {
	/** The original row (`event.data`). */
	readonly row: T;
	/** The row with the edit applied (`event.newData`). */
	readonly newData: T;
	/** The edited field (cell-edit mode only). */
	readonly field?: string;
	/** The new value (cell-edit mode only). */
	readonly newValue?: unknown;
}

/**
 * Scoped props passed to a responsive layout slot (`#xs`…`#2xl`) of
 * `<SstDataTable>`. The row type flows through, so `#xs="{ rows }"` gives a typed
 * `rows: readonly T[]` (each `row` is `T`) with no annotation needed.
 *
 * @typeParam T - Row type; carries a string or number `id`.
 */
export interface ISstLayoutSlotProps<T extends { id: string | number }> {
	/** Current page of rows (from `store.data`). */
	readonly rows: readonly T[];
	/** Whether a fetch is in flight (from `store.loading`). */
	readonly loading: boolean;
	/** The backing store — escape hatch for pagination/sort/search/refresh. */
	readonly store: IUseTableStoreReturn<T>;
}

/**
 * Reactive, `v-bind`-able bag of PrimeVue `DataTable` lazy props plus the
 * `@page` / `@sort` / `@filter` handlers and a `removeSelected` helper.
 *
 * @typeParam T - Row type; must carry a string or number `id` (coerced to a
 *   string for `bulkDelete`).
 */
export interface ISstDataTableBindings<T extends { id: string | number }> {
	/** Always `true` — the adapter drives PrimeVue in lazy (server-side) mode. */
	readonly lazy: true;
	/** Current page of rows (from `store.data`). */
	readonly value: readonly T[];
	/** Total record count across all pages (from `store.total`). */
	readonly totalRecords: number;
	/** Whether a fetch is in flight (from `store.loading`). */
	readonly loading: boolean;
	/** Zero-based row offset of the current page: `(page - 1) * pageSize`. */
	readonly first: number;
	/** Page size (from `store.pagination.pageSize`). */
	readonly rows: number;
	/** Active sort field, or `undefined` when unsorted. */
	readonly sortField: string | undefined;
	/** Active sort order encoded the PrimeVue way (`1` asc / `-1` desc), or `undefined`. */
	readonly sortOrder: number | undefined;
	/** Handle PrimeVue's `@page`: updates store pagination (PrimeVue page is 0-based). */
	onPage(event: DataTablePageEvent): void;
	/** Handle PrimeVue's `@sort`: updates store sort (single-column), clearing on a null field. */
	onSort(event: DataTableSortEvent): void;
	/** Handle PrimeVue's `@filter`: maps the filter object to store search/filters (debounced). */
	onFilter(event: DataTableFilterEvent): void;
	/** Handle PrimeVue's `@cell-edit-complete`: optimistic update + `onSave`. */
	onCellEditComplete(event: DataTableCellEditCompleteEvent): void;
	/** Handle PrimeVue's `@row-edit-save`: optimistic update + `onSave`. */
	onRowEditSave(event: DataTableRowEditSaveEvent): void;
	/** Currently selected rows (PrimeVue `v-model:selection`). */
	readonly selection: readonly T[];
	/** PrimeVue `@update:selection` handler; normalizes single/array/null to an array. */
	'onUpdate:selection'(value: T | readonly T[] | null | undefined): void;
	/** Clear the current selection. */
	clearSelection(): void;
	/** Delete row(s) by id via `store.bulkDelete`; defaults to the current selection. */
	removeSelected(rows?: T | readonly T[]): Promise<IResponse<string>>;
}

function extractFilterValue(meta: unknown): unknown {
	if (meta && typeof meta === 'object') {
		if ('value' in meta) return (meta as { value: unknown }).value;
		if ('constraints' in meta) {
			const constraints = (meta as { constraints?: ReadonlyArray<{ value: unknown }> }).constraints;
			return constraints && constraints.length > 0 ? constraints[0]?.value : undefined;
		}
	}
	return undefined;
}

/** Default filter mapping: `global` → search; every other non-empty value → a `{ key, value }` filter. */
function defaultMapFilters(filters: DataTableFilterMeta): { search?: string; filters?: IFilterParams[] } {
	const result: { search?: string; filters?: IFilterParams[] } = {};
	const out: IFilterParams[] = [];
	for (const [key, meta] of Object.entries(filters ?? {})) {
		const value = extractFilterValue(meta);
		if (value === null || value === undefined || value === '') continue;
		if (key === 'global') {
			result.search = String(value);
		} else {
			out.push({ key, value: String(value) });
		}
	}
	if (out.length > 0) result.filters = out;
	return result;
}

/**
 * Bind a So Simple Table {@link IUseTableStoreReturn | store} to a PrimeVue v4
 * `DataTable` running in lazy mode. Spread the result onto `<DataTable v-bind>`.
 *
 * @typeParam T - Row type; must carry a string or number `id` (coerced to a
 *   string for `bulkDelete`).
 * @param store - A store from `useTableStore` / `defineTable`.
 * @param options - See {@link IUseSstDataTableOptions}.
 * @returns Reactive bindings ({@link ISstDataTableBindings}).
 *
 * @remarks Call inside a component `setup`; `immediate` relies on `onMounted`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import DataTable from 'primevue/datatable';
 * import Column from 'primevue/column';
 * import { useSstDataTable } from '@sst/vue/primevue';
 * const bindings = useSstDataTable(table);
 * </script>
 * <template>
 *   <DataTable v-bind="bindings" dataKey="id" paginator :rows="10">
 *     <Column field="name" header="Name" sortable />
 *   </DataTable>
 * </template>
 * ```
 */
export function useSstDataTable<T extends { id: string | number }>(
	store: IUseTableStoreReturn<T>,
	options: IUseSstDataTableOptions<T> = {},
): ISstDataTableBindings<T> {
	const { immediate = true, filterDebounceMs = 300, mapFilters = defaultMapFilters, onSave } = options;
	let filterTimer: ReturnType<typeof setTimeout> | undefined;

	if (getCurrentInstance()) {
		onMounted(() => {
			if (immediate) store.refresh();
		});
	}

	const selectionRef = ref<readonly T[]>([]);

	function applyEdit(edit: ISstDataTableEdit<T>): void {
		const previous = store.data.value;
		store.updateData(previous.map((row) => (row.id === edit.row.id ? edit.newData : row)));
		if (!onSave) return;
		Promise.resolve(onSave(edit)).catch(() => store.updateData(previous));
	}

	const bindings = reactive({
		lazy: true as const,
		get value() {
			return store.data.value;
		},
		get totalRecords() {
			return store.total.value;
		},
		get loading() {
			return store.loading.value;
		},
		get first() {
			const pagination = store.pagination.value;
			return (pagination.page - 1) * pagination.pageSize;
		},
		get rows() {
			return store.pagination.value.pageSize;
		},
		get sortField() {
			return store.sort.value?.field;
		},
		get sortOrder() {
			const sort = store.sort.value;
			if (!sort) return undefined;
			return sort.order === ESortOrder.ASC ? PRIME_ASC : PRIME_DESC;
		},
		onPage(event: DataTablePageEvent) {
			store.updatePagination({ page: event.page + 1, pageSize: event.rows });
		},
		onSort(event: DataTableSortEvent) {
			const field = event.sortField;
			if (typeof field !== 'string' || field.length === 0) {
				store.updateSort(undefined);
				return;
			}
			const order = event.sortOrder === PRIME_DESC ? ESortOrder.DESC : ESortOrder.ASC;
			store.updateSort({ id: `${field}-${order}`, field, order });
		},
		onFilter(event: DataTableFilterEvent) {
			if (filterTimer !== undefined) clearTimeout(filterTimer);
			filterTimer = setTimeout(() => {
				const mapped = mapFilters(event.filters);
				const current = store.pagination.value;
				if (current.page !== 1) store.updatePagination({ ...current, page: 1 });
				store.updateSearch(mapped.search ?? '');
				store.updateFilter(mapped.filters ?? []);
			}, filterDebounceMs);
		},
		onCellEditComplete(event: DataTableCellEditCompleteEvent) {
			applyEdit({
				row: event.data as T,
				newData: event.newData as T,
				field: event.field,
				newValue: event.newValue,
			});
		},
		onRowEditSave(event: DataTableRowEditSaveEvent) {
			applyEdit({ row: event.data as T, newData: event.newData as T });
		},
		get selection() {
			return selectionRef.value;
		},
		'onUpdate:selection'(value: T | readonly T[] | null | undefined) {
			selectionRef.value = Array.isArray(value) ? (value as readonly T[]) : value ? [value as T] : [];
		},
		clearSelection() {
			selectionRef.value = [];
		},
		removeSelected(rows?: T | readonly T[]): Promise<IResponse<string>> {
			const source = rows ?? selectionRef.value;
			const list: readonly T[] = Array.isArray(source) ? (source as readonly T[]) : [source as T];
			return store.bulkDelete(list.map((row) => String(row.id)));
		},
	});

	return bindings as ISstDataTableBindings<T>;
}
