import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { IFilterParams } from '@bridgebyte/sst-core';
import type {
	DataTableFilterMeta,
	DataTableFilterMetaData,
	DataTableOperatorFilterMetaData,
} from 'primevue/datatable';
import { defaultMapFilters } from './use-sst-data-table';

/** Default match mode used when a filter definition omits one. */
const DEFAULT_MATCH_MODE = 'contains';

/** Declares one managed filter for {@link useSstFilters}. */
export interface ISstFilterDef {
	/** Column field (or `'global'` for the global search entry). */
	readonly field: string;
	/** PrimeVue match mode (e.g. `FilterMatchMode.CONTAINS`). Default `'contains'`. */
	readonly matchMode?: string;
	/** Initial/default value restored by `resetFilter`/`reset`. Default `null`. */
	readonly value?: unknown;
}

/** Minimal store surface {@link useSstFilters} pushes into on programmatic changes. */
export interface ISstFilterSyncTarget {
	/** Updates the search term and re-fetches. */
	updateSearch(search: string): void;
	/** Replaces the active filters and re-fetches. */
	updateFilter(filters: readonly IFilterParams[]): void;
	/** Resets to a given page and re-fetches. */
	setPage(page: number): void;
}

/** Options for {@link useSstFilters}. */
export interface IUseSstFiltersOptions {
	/** Store to sync into on programmatic changes; `null`/omitted ⇒ standalone model. */
	readonly store?: ISstFilterSyncTarget | null;
	/** Maps the PrimeVue filter object to store `search`/`filters`. Default `defaultMapFilters`. */
	readonly mapFilters?: (filters: DataTableFilterMeta) => { search?: string; filters?: IFilterParams[] };
	/** Filter-model shape: `'row'` (`{ value, matchMode }`) or `'menu'` (`{ operator, constraints }`). Default `'row'`. */
	readonly mode?: 'row' | 'menu';
}

/** Reactive surface returned by {@link useSstFilters}. */
export interface IUseSstFiltersReturn {
	/** The PrimeVue filter model — bind with `v-model:filters` on `<SstDataTable>`. */
	readonly filters: Ref<DataTableFilterMeta>;
	/** Current value of a field's filter (shape-agnostic). */
	getFilter(field: string): unknown;
	/** Set a field's filter value (preserving its match mode) and sync to the store. */
	setFilterValue(field: string, value: unknown): void;
	/** Reset a single field to its default value and sync. */
	resetFilter(field: string): void;
	/** Reset every field to its default value and sync. */
	reset(): void;
	/** Number of non-empty filters, excluding `global` — handy for a "Filters (N)" badge. */
	readonly activeFilterCount: ComputedRef<number>;
	/** The current model mapped to store `search`/`filters` (e.g. for standalone use). */
	toMappedFilters(): { search?: string; filters?: IFilterParams[] };
}

type SstFilterMeta = DataTableFilterMetaData | DataTableOperatorFilterMetaData;

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function hasConstraints(meta: unknown): meta is { constraints: Array<{ value?: unknown; matchMode?: unknown }> } {
	return !!meta && typeof meta === 'object' && Array.isArray((meta as { constraints?: unknown }).constraints);
}

/** Read a field's value regardless of `row` (`value`) or `menu` (`constraints[0]`) shape. */
function readMetaValue(meta: unknown): unknown {
	if (hasConstraints(meta)) return meta.constraints.length > 0 ? meta.constraints[0]?.value : undefined;
	if (meta && typeof meta === 'object' && 'value' in meta) return (meta as { value: unknown }).value;
	return undefined;
}

/** Return a new meta with `value` written into it, preserving its shape and match mode. */
function writeMetaValue(meta: unknown, value: unknown): SstFilterMeta {
	if (hasConstraints(meta)) {
		const constraints =
			meta.constraints.length > 0 ? meta.constraints : [{ value: null, matchMode: DEFAULT_MATCH_MODE }];
		const operator = (meta as { operator?: string }).operator ?? 'and';
		return {
			operator,
			constraints: [{ ...constraints[0], value }, ...constraints.slice(1)],
		} as DataTableOperatorFilterMetaData;
	}
	const matchMode =
		meta && typeof meta === 'object' && 'matchMode' in meta
			? (meta as { matchMode?: string }).matchMode
			: DEFAULT_MATCH_MODE;
	return { value, matchMode };
}

function buildMeta(def: ISstFilterDef, mode: 'row' | 'menu'): SstFilterMeta {
	const value = def.value ?? null;
	const matchMode = def.matchMode ?? DEFAULT_MATCH_MODE;
	return mode === 'menu' ? { operator: 'and', constraints: [{ value, matchMode }] } : { value, matchMode };
}

/**
 * PrimeVue filter-state manager: owns the `v-model:filters` model for an
 * `<SstDataTable>`, with per-field defaults, match modes, and reset helpers.
 *
 * User-driven column filtering already reaches the store through the table's
 * `@filter` event, so this composable adds no watcher. Its *programmatic*
 * methods (`setFilterValue`/`resetFilter`/`reset`) mutate the model — so the
 * PrimeVue menus update — and, when a `store` is provided, map the model and
 * push `search`/`filters` into it (resetting to page 1), which is what makes
 * `reset()` clear the menus and re-fetch.
 *
 * @param defs - Filter definitions (`field`, optional `matchMode`, default `value`).
 * @param options - `store` to sync into, `mapFilters` (default `defaultMapFilters`), and `mode`.
 * @returns The filter model plus get/set/reset helpers, `activeFilterCount`, and `toMappedFilters`.
 *
 * @example
 * ```ts
 * // Destructure so `filters` is a top-level ref (auto-unwrapped in the template).
 * const { filters, reset, activeFilterCount } = useSstFilters(
 * 	[
 * 		{ field: 'title', matchMode: FilterMatchMode.CONTAINS },
 * 		{ field: 'category', matchMode: FilterMatchMode.EQUALS, value: null },
 * 	],
 * 	{ store },
 * );
 * // <SstDataTable :store v-model:filters="filters" filter-display="row">
 * // reset() → clears menus + re-fetches; activeFilterCount → badge
 * ```
 */
export function useSstFilters(defs: ISstFilterDef[], options: IUseSstFiltersOptions = {}): IUseSstFiltersReturn {
	const mode = options.mode ?? 'row';
	const mapFilters = options.mapFilters ?? defaultMapFilters;
	const store = options.store;
	const defaults = new Map(defs.map((d) => [d.field, d.value ?? null]));

	const build = (): DataTableFilterMeta =>
		Object.fromEntries(defs.map((d) => [d.field, buildMeta(d, mode)])) as DataTableFilterMeta;

	const filters = ref<DataTableFilterMeta>(build());

	const toMappedFilters = (): { search?: string; filters?: IFilterParams[] } => mapFilters(filters.value);

	const sync = (): void => {
		if (!store) return;
		const mapped = toMappedFilters();
		store.updateSearch(mapped.search ?? '');
		store.updateFilter(mapped.filters ?? []);
		store.setPage(1);
	};

	const getFilter = (field: string): unknown => readMetaValue((filters.value as Record<string, unknown>)[field]);

	const setFilterValue = (field: string, value: unknown): void => {
		const current = (filters.value as Record<string, unknown>)[field];
		filters.value = { ...filters.value, [field]: writeMetaValue(current, value) } as DataTableFilterMeta;
		sync();
	};

	const resetFilter = (field: string): void => {
		if (!defaults.has(field)) return;
		setFilterValue(field, defaults.get(field) ?? null);
	};

	const reset = (): void => {
		filters.value = build();
		sync();
	};

	const activeFilterCount = computed(() => {
		let count = 0;
		for (const [field, meta] of Object.entries(filters.value)) {
			if (field === 'global') continue;
			if (!isEmpty(readMetaValue(meta))) count++;
		}
		return count;
	});

	return { filters, getFilter, setFilterValue, resetFilter, reset, activeFilterCount, toMappedFilters };
}
