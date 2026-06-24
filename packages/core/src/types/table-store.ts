import type { IReadonlyObservable } from '../state/observable';
import type { IFilterParams } from './filter';
import type { IPaginationParams } from './pagination';
import type { IResponse } from './response';
import type { ISortParams } from './sort';

/**
 * Reactive contract for a table's state container.
 *
 * @remarks
 * State is exposed as read-only observables (the `$`-suffixed members) that UI
 * bindings subscribe to, while the `update*` mutators and query methods drive
 * changes. The canonical implementation is {@link TableStore}.
 *
 * @typeParam T - Row type held by the store.
 */
export interface ITableStore<T> {
	/** Current page of rows. */
	readonly data$: IReadonlyObservable<readonly T[]>;
	/** Total number of rows matching the current query across all pages. */
	readonly total$: IReadonlyObservable<number>;
	/** Whether a fetch is in flight. */
	readonly loading$: IReadonlyObservable<boolean>;
	/** Current pagination state. */
	readonly pagination$: IReadonlyObservable<IPaginationParams>;
	/** Current sort state, or `undefined` when unsorted. */
	readonly sort$: IReadonlyObservable<ISortParams | undefined>;
	/** Currently applied filters. */
	readonly filters$: IReadonlyObservable<readonly IFilterParams[]>;
	/** Current free-text search term. */
	readonly search$: IReadonlyObservable<string>;

	/**
	 * Builds query parameters from the given table state and fetches the
	 * matching page, updating {@link ITableStore.data$}, {@link ITableStore.total$},
	 * and {@link ITableStore.loading$}.
	 */
	getData(
		pagination: IPaginationParams,
		sort?: ISortParams,
		filters?: readonly IFilterParams[],
		search?: string,
	): void;

	/** Deletes the given rows by id, then refreshes the current page. */
	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	/** Re-fetches the current page using the present pagination, sort, filters, and search. */
	refresh(): void;
	/** Restores the store to its initial state and re-fetches. */
	reset(): void;

	/** Replaces the current rows. */
	updateData(data: readonly T[]): void;
	/** Sets the total row count. */
	updateTotal(total: number): void;
	/** Sets the loading flag. */
	updateLoading(loading: boolean): void;
	/** Updates pagination, triggering an auto-refresh when subscribed. */
	updatePagination(pagination: IPaginationParams): void;
	/** Updates sort state, triggering an auto-refresh when subscribed. */
	updateSort(sort: ISortParams | undefined): void;
	/** Updates filters, triggering an auto-refresh when subscribed. */
	updateFilter(filters: readonly IFilterParams[]): void;
	/** Updates the search term, triggering an auto-refresh when subscribed. */
	updateSearch(search: string): void;

	/** Tears down internal subscriptions; call when the store is no longer needed. */
	destroy(): void;
}
