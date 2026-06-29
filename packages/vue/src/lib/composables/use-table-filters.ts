import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { IFilterParams } from '@bridgebyte/sst-core';

/**
 * A single managed filter: its `key`, current `value`, and the `defaultValue`
 * it resets to.
 */
export interface ISstFilter {
	/** Field the filter targets (matches the store/back-end filter key). */
	readonly key: string;
	/** Current value. May be a scalar, an array (multi-select), or empty (`null`/`''`/`[]`). */
	value: unknown;
	/** Value restored by {@link IUseTableFiltersReturn.resetFilter | resetFilter}/`resetFilters`. */
	readonly defaultValue: unknown;
}

/** Minimal store surface {@link useTableFilters} drives when integrated. */
export interface IFilterSyncTarget {
	/** Replaces the active filters and re-fetches. */
	updateFilter(filters: readonly IFilterParams[]): void;
	/** Resets to the first page and re-fetches. */
	setPage(page: number): void;
}

/** Options for {@link useTableFilters}. */
export interface IUseTableFiltersOptions {
	/** Debounce (ms) before syncing changes to the store. Default `300`. */
	readonly debounceMs?: number;
}

/** Reactive surface returned by {@link useTableFilters}. */
export interface IUseTableFiltersReturn {
	/** The managed filters (reactive). */
	readonly filters: Ref<ISstFilter[]>;
	/** Find a filter by key. */
	getFilter(key: string): ISstFilter | undefined;
	/** Set a filter's value by key (no-op if the key is unknown). */
	setFilterValue(key: string, value: unknown): void;
	/** Reset a single filter to its `defaultValue`. */
	resetFilter(key: string): void;
	/** Reset every filter to its `defaultValue`. */
	resetFilters(): void;
	/** Number of filters whose value is non-empty — handy for a "Filters (N)" badge. */
	readonly activeFilterCount: ComputedRef<number>;
	/**
	 * Project the active filters to {@link IFilterParams}: empty values are
	 * dropped, scalars become one param, and arrays expand to one param per
	 * element (the store regroups same-key values into an array).
	 */
	toFilterParams(): IFilterParams[];
}

function isEmptyValue(value: unknown): boolean {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function buildFilterParams(filters: readonly ISstFilter[]): IFilterParams[] {
	const params: IFilterParams[] = [];
	for (const filter of filters) {
		if (isEmptyValue(filter.value)) continue;
		if (Array.isArray(filter.value)) {
			for (const item of filter.value) {
				if (!isEmptyValue(item)) params.push({ key: filter.key, value: String(item) });
			}
		} else {
			params.push({ key: filter.key, value: String(filter.value) });
		}
	}
	return params;
}

/**
 * Filter-state manager: holds a set of `{ key, value, defaultValue }` filters
 * with helpers to read, set, and reset them.
 *
 * When a `store` is provided the manager is **integrated**: a debounced deep
 * watch syncs the active filters into the store (via `updateFilter`) and resets
 * to the first page, so the table re-fetches automatically. Pass `null` to use
 * it as standalone state and call {@link IUseTableFiltersReturn.toFilterParams}
 * yourself.
 *
 * @param store - Store to sync into, or `null`/`undefined` for standalone state.
 * @param initial - Initial filters (each with `key`, `value`, `defaultValue`).
 * @param options - Optional behaviour (e.g. `debounceMs`).
 * @returns Reactive filters plus get/set/reset helpers and `toFilterParams`.
 *
 * @remarks
 * Must be called synchronously inside a component `setup` or active effect
 * scope — the integrated watch is torn down via {@link onScopeDispose}.
 *
 * @example
 * ```ts
 * const filters = useTableFilters(store, [
 * 	{ key: 'status', value: null, defaultValue: null },
 * 	{ key: 'role', value: [], defaultValue: [] },
 * ]);
 * filters.setFilterValue('status', 'active'); // → store re-fetches (debounced)
 * filters.resetFilters(); // → back to defaults + re-fetch
 * ```
 */
export function useTableFilters(
	store: IFilterSyncTarget | null | undefined,
	initial: ISstFilter[],
	options: IUseTableFiltersOptions = {},
): IUseTableFiltersReturn {
	const filters = ref<ISstFilter[]>(initial.map((f) => ({ ...f }))) as Ref<ISstFilter[]>;
	const debounceMs = options.debounceMs ?? 300;

	const getFilter = (key: string): ISstFilter | undefined => filters.value.find((f) => f.key === key);

	const setFilterValue = (key: string, value: unknown): void => {
		const filter = getFilter(key);
		if (filter) filter.value = value;
	};

	const resetFilter = (key: string): void => {
		const filter = getFilter(key);
		if (filter) filter.value = filter.defaultValue;
	};

	const resetFilters = (): void => {
		for (const filter of filters.value) filter.value = filter.defaultValue;
	};

	const activeFilterCount = computed(() => filters.value.filter((f) => !isEmptyValue(f.value)).length);

	const toFilterParams = (): IFilterParams[] => buildFilterParams(filters.value);

	if (store) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const stop = watch(
			filters,
			() => {
				if (timer !== undefined) clearTimeout(timer);
				timer = setTimeout(() => {
					store.updateFilter(toFilterParams());
					store.setPage(1);
				}, debounceMs);
			},
			{ deep: true },
		);
		onScopeDispose(() => {
			if (timer !== undefined) clearTimeout(timer);
			stop();
		});
	}

	return { filters, getFilter, setFilterValue, resetFilter, resetFilters, activeFilterCount, toFilterParams };
}
