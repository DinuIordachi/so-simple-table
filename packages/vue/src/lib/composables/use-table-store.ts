import { onScopeDispose, type Ref } from 'vue';
import {
	TableStore,
	type IFilterParams,
	type IPaginationParams,
	type IResponse,
	type ISortParams,
	type ITableStoreOptions,
} from '@bridgebyte/sst-core';
import { useObservable } from './use-observable';

/**
 * Reactive surface returned by {@link useTableStore}.
 *
 * Exposes the underlying core {@link TableStore} together with its observable
 * state projected as read-only Vue refs and its actions pre-bound to the store
 * instance, so they can be destructured and called freely.
 *
 * @typeParam T - Row/entity type managed by the table store.
 */
export interface IUseTableStoreReturn<T> {
	/** The wrapped core {@link TableStore} instance, for advanced or escape-hatch access. */
	readonly store: TableStore<T>;
	/** Current page of rows. */
	readonly data: Readonly<Ref<readonly T[]>>;
	/** Total number of records reported by the server across all pages. */
	readonly total: Readonly<Ref<number>>;
	/** Whether a fetch is currently in flight. */
	readonly loading: Readonly<Ref<boolean>>;
	/** Active pagination state (page and page size). */
	readonly pagination: Readonly<Ref<IPaginationParams>>;
	/** Active sort descriptor, or `undefined` when unsorted. */
	readonly sort: Readonly<Ref<ISortParams | undefined>>;
	/** Active filter descriptors. */
	readonly filters: Readonly<Ref<readonly IFilterParams[]>>;
	/** Active free-text search query. */
	readonly search: Readonly<Ref<string>>;

	/**
	 * Fetches data for an explicit combination of query parameters, replacing
	 * the current pagination, sort, filters, and search in one call.
	 *
	 * @param pagination - Page and page size to request.
	 * @param sort - Optional sort descriptor.
	 * @param filters - Optional filter descriptors.
	 * @param search - Optional free-text search query.
	 */
	getData(
		pagination: IPaginationParams,
		sort?: ISortParams,
		filters?: readonly IFilterParams[],
		search?: string,
	): void;
	/**
	 * Deletes multiple records by id and resolves once the request completes.
	 *
	 * @param ids - Identifiers of the records to delete.
	 * @returns The server response for the bulk delete operation.
	 */
	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	/** Re-fetches the current page using the active query parameters. */
	refresh(): void;
	/** Restores pagination, sort, filters, and search to their initial values and re-fetches. */
	reset(): void;
	/** Updates pagination and re-fetches. */
	updatePagination(p: IPaginationParams): void;
	/** Sets the current page (1-based), keeping the page size, and re-fetches. */
	setPage(page: number): void;
	/** Sets the page size, keeping the current page, and re-fetches. */
	setPageSize(pageSize: number): void;
	/** Updates the sort descriptor (pass `undefined` to clear) and re-fetches. */
	updateSort(sort: ISortParams | undefined): void;
	/** Replaces the active filters and re-fetches. */
	updateFilter(filters: readonly IFilterParams[]): void;
	/** Updates the search query and re-fetches. */
	updateSearch(search: string): void;
	/** Sets the current rows locally, without performing a fetch. */
	updateData(data: readonly T[]): void;
	/** Sets the total record count locally, without performing a fetch. */
	updateTotal(total: number): void;
}

/**
 * Wraps a core {@link TableStore} as an idiomatic Vue composable.
 *
 * Instantiates a store from the given options, projects each of its observable
 * state streams into a read-only Vue {@link Ref} (via {@link useObservable}),
 * and exposes its actions pre-bound to the instance. The store is disposed
 * automatically when the surrounding scope is torn down.
 *
 * @typeParam T - Row/entity type managed by the table store.
 * @param options - Core table store options (repository, sort/filter maps,
 * initial pagination, query keys, etc.).
 * @returns A {@link IUseTableStoreReturn} with reactive state and bound actions.
 *
 * @remarks
 * Must be called synchronously inside a component `setup` or other active
 * effect scope, since teardown relies on {@link onScopeDispose} to call
 * {@link TableStore.destroy}.
 *
 * @example
 * ```ts
 * import { useTableStore, HttpListRepository, FetchHttpClient } from '@bridgebyte/sst-vue';
 *
 * const { data, loading, total, updatePagination } = useTableStore({
 * 	repository: new HttpListRepository({
 * 		baseUrl: 'https://api.example.com/users',
 * 		httpClient: new FetchHttpClient(),
 * 	}),
 * });
 * ```
 */
export function useTableStore<T>(options: ITableStoreOptions<T>): IUseTableStoreReturn<T> {
	const store = new TableStore<T>(options);
	onScopeDispose(() => store.destroy());

	const pagination = useObservable(store.pagination$);

	return {
		store,
		data: useObservable(store.data$),
		total: useObservable(store.total$),
		loading: useObservable(store.loading$),
		pagination,
		sort: useObservable(store.sort$),
		filters: useObservable(store.filters$),
		search: useObservable(store.search$),

		getData: store.getData.bind(store),
		bulkDelete: store.bulkDelete.bind(store),
		refresh: store.refresh.bind(store),
		reset: store.reset.bind(store),
		updatePagination: store.updatePagination.bind(store),
		setPage: (page: number) => store.updatePagination({ ...pagination.value, page }),
		setPageSize: (pageSize: number) => store.updatePagination({ ...pagination.value, pageSize }),
		updateSort: store.updateSort.bind(store),
		updateFilter: store.updateFilter.bind(store),
		updateSearch: store.updateSearch.bind(store),
		updateData: store.updateData.bind(store),
		updateTotal: store.updateTotal.bind(store),
	};
}
