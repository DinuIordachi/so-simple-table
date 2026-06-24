import { Observable, type IReadonlyObservable, type Unsubscribe } from '../state/observable';
import { watch } from '../state/watch';
import { mapTableParams } from './map-table-params';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { ISortParams } from '../types/sort';
import type { IResponse, IResponseList } from '../types/response';
import type { ITableStore } from '../types/table-store';
import type { ListRepository } from '../repositories/list.repository';
import type {
	IRepositoryQueryKeys,
	IParamFormattingStrategy,
	ISortDirections,
	PaginationStyle,
	SortStyle,
} from '../types/repository-config';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';

/**
 * Construction options for {@link TableStore}.
 *
 * @typeParam T - Row type held by the store.
 */
export interface ITableStoreOptions<T> {
	/** Data source the store fetches from and deletes through. */
	readonly repository: ListRepository<T>;
	/** Maps sort field names to the values understood by the backend. */
	readonly sortMap: Readonly<Record<string, string>>;
	/** Optional mapping from filter keys to query-param names. */
	readonly filterMap?: Readonly<Record<string, string>>;
	/** Initial pagination; defaults to page 1 with a page size of 10. */
	readonly initialPagination?: IPaginationParams;
	/** Overrides for individual query-string keys; merged over {@link DEFAULT_QUERY_KEYS}. */
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	/** Optional hooks for customizing filter and sort formatting. */
	readonly paramFormatting?: IParamFormattingStrategy;
	/** Pagination wire style; `'page'` (default) or `'offset'` (skip + limit). */
	readonly paginationStyle?: PaginationStyle;
	/** Sort wire style; `'flag'` (default) or `'direction'` (sortBy + asc/desc). */
	readonly sortStyle?: SortStyle;
	/** Tokens for `'direction'` sort style; defaults to `{ asc: 'asc', desc: 'desc' }`. */
	readonly sortDirections?: ISortDirections;
}

const DEFAULT_INITIAL_PAGINATION: IPaginationParams = { page: 1, pageSize: 10 };

/**
 * Headless, reactive state container that orchestrates a data table.
 *
 * @remarks
 * Holds pagination, sort, filter, and search state as observables and
 * auto-refreshes whenever any of them changes: a {@link watch} subscription
 * coalesces synchronous mutations and re-fetches via the configured repository
 * on the next microtask. Read state through the `$`-suffixed observables and
 * drive it with the `update*` mutators; `refresh`, `reset`, and `bulkDelete`
 * are convenience operations. Call {@link TableStore.destroy} to release the
 * internal subscription.
 *
 * When a fetch returns an empty page beyond the first, the store steps back one
 * page (without cascading an extra refresh) so the user is not stranded on an
 * out-of-range page after deletions.
 *
 * @typeParam T - Row type held by the store.
 *
 * @example
 * ```ts
 * const store = new TableStore<User>({
 * 	repository: new HttpRepository<User>({ baseUrl: '/api/users' }),
 * 	sortMap: { name: 'fullName' },
 * });
 * const off = store.data$.subscribe((rows) => render(rows));
 * store.updateSearch('ada'); // triggers an auto-refresh
 * // ...later
 * off();
 * store.destroy();
 * ```
 */
export class TableStore<T> implements ITableStore<T> {
	private readonly _data = new Observable<readonly T[]>([]);
	private readonly _total = new Observable<number>(0);
	private readonly _loading = new Observable<boolean>(false);
	private readonly _pagination: Observable<IPaginationParams>;
	private readonly _sort = new Observable<ISortParams | undefined>(undefined);
	private readonly _filters = new Observable<readonly IFilterParams[]>([]);
	private readonly _search = new Observable<string>('');

	/** Current page of rows. */
	public readonly data$: IReadonlyObservable<readonly T[]> = this._data.asReadonly();
	/** Total number of rows matching the current query across all pages. */
	public readonly total$: IReadonlyObservable<number> = this._total.asReadonly();
	/** Whether a fetch is currently in flight. */
	public readonly loading$: IReadonlyObservable<boolean> = this._loading.asReadonly();
	/** Current pagination state. */
	public readonly pagination$: IReadonlyObservable<IPaginationParams>;
	/** Current sort state, or `undefined` when unsorted. */
	public readonly sort$: IReadonlyObservable<ISortParams | undefined> = this._sort.asReadonly();
	/** Currently applied filters. */
	public readonly filters$: IReadonlyObservable<readonly IFilterParams[]> = this._filters.asReadonly();
	/** Current free-text search term. */
	public readonly search$: IReadonlyObservable<string> = this._search.asReadonly();

	protected readonly repository: ListRepository<T>;
	protected readonly sortMap: Readonly<Record<string, string>>;
	protected readonly filterMap: Readonly<Record<string, string>> | undefined;
	protected readonly queryKeys: IRepositoryQueryKeys;
	protected readonly paramFormatting: IParamFormattingStrategy | undefined;
	protected readonly paginationStyle: PaginationStyle | undefined;
	protected readonly sortStyle: SortStyle | undefined;
	protected readonly sortDirections: ISortDirections | undefined;
	private querySubscription: Unsubscribe = () => {};

	/**
	 * Creates the store, seeds its state, and begins auto-refreshing on query
	 * changes.
	 *
	 * @param options - Repository, mappings, and optional initial state.
	 */
	public constructor(options: ITableStoreOptions<T>) {
		this.repository = options.repository;
		this.sortMap = options.sortMap;
		this.filterMap = options.filterMap;
		this.queryKeys = { ...DEFAULT_QUERY_KEYS, ...(options.queryKeys ?? {}) };
		this.paramFormatting = options.paramFormatting;
		this.paginationStyle = options.paginationStyle;
		this.sortStyle = options.sortStyle;
		this.sortDirections = options.sortDirections;
		this._pagination = new Observable<IPaginationParams>(options.initialPagination ?? DEFAULT_INITIAL_PAGINATION);
		this.pagination$ = this._pagination.asReadonly();
		this.subscribeToTableQueryChanges();
	}

	/** Replaces the current rows. */
	public updateData(data: readonly T[]): void {
		this._data.set(data);
	}
	/** Sets the total row count. */
	public updateTotal(total: number): void {
		this._total.set(total);
	}
	/** Sets the loading flag. */
	public updateLoading(loading: boolean): void {
		this._loading.set(loading);
	}
	/** Updates pagination; triggers an auto-refresh while subscribed. */
	public updatePagination(p: IPaginationParams): void {
		this._pagination.set(p);
	}
	/** Updates sort state; triggers an auto-refresh while subscribed. */
	public updateSort(sort: ISortParams | undefined): void {
		this._sort.set(sort);
	}
	/** Updates filters; triggers an auto-refresh while subscribed. */
	public updateFilter(filters: readonly IFilterParams[]): void {
		this._filters.set(filters);
	}
	/** Updates the search term; triggers an auto-refresh while subscribed. */
	public updateSearch(search: string): void {
		this._search.set(search);
	}

	/**
	 * Maps the given table state into query params and fetches the matching
	 * page, updating {@link TableStore.data$}, {@link TableStore.total$}, and
	 * {@link TableStore.loading$}.
	 */
	public getData(
		pagination: IPaginationParams,
		sort?: ISortParams,
		filters?: readonly IFilterParams[],
		search?: string,
	): void {
		const params = mapTableParams({
			pagination,
			...(sort !== undefined ? { sort } : {}),
			...(filters !== undefined ? { filters } : {}),
			...(search !== undefined ? { search } : {}),
			sortMap: this.sortMap,
			...(this.filterMap !== undefined ? { filterMap: this.filterMap } : {}),
			queryKeys: this.queryKeys,
			...(this.paramFormatting !== undefined ? { paramFormatting: this.paramFormatting } : {}),
			...(this.paginationStyle !== undefined ? { paginationStyle: this.paginationStyle } : {}),
			...(this.sortStyle !== undefined ? { sortStyle: this.sortStyle } : {}),
			...(this.sortDirections !== undefined ? { sortDirections: this.sortDirections } : {}),
		});
		this.fetchData(this.repository.getList(params));
	}

	/**
	 * Drives the loading flag and applies a list response to the store.
	 *
	 * @remarks
	 * Sets `loading` while `promise` is pending, then writes the result and
	 * total and runs the empty-page guard against the pagination captured at
	 * request time. Exposed as `protected` so subclasses can reuse the fetch
	 * lifecycle.
	 */
	protected fetchData(promise: Promise<IResponseList<T[]>>): void {
		// Capture pagination at request time so cascading post-fetch checks see the
		// page that was requested rather than a value mutated by an earlier resolution.
		const paginationSnapshot = this._pagination.get();
		this.updateLoading(true);
		promise
			.then((response) => {
				this.updateData(response.result);
				this.updateTotal(response.totalCount);
				this.checkIfNeedToGoPrevious(response.result.length, paginationSnapshot);
			})
			.finally(() => this.updateLoading(false));
	}

	/**
	 * Deletes the given rows through the repository, then refreshes the current
	 * page.
	 *
	 * @returns The repository's delete response.
	 */
	public async bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		const result = await this.repository.bulkDelete(ids);
		this.refresh();
		return result;
	}

	/** Re-fetches the current page using the present pagination, sort, filters, and search. */
	public refresh(): void {
		this.getData(this._pagination.get(), this._sort.get(), this._filters.get(), this._search.get());
	}

	/**
	 * Clears data, filters, and search and restores the default pagination and
	 * sort, then re-attaches the auto-refresh subscription (which triggers a
	 * fresh fetch).
	 */
	public reset(): void {
		this.querySubscription();
		this._data.set([]);
		this._total.set(0);
		this._filters.set([]);
		this._search.set('');
		this._pagination.set(DEFAULT_INITIAL_PAGINATION);
		this._sort.set(undefined);
		this.subscribeToTableQueryChanges();
	}

	/** Detaches the auto-refresh subscription; call when the store is discarded. */
	public destroy(): void {
		this.querySubscription();
	}

	private subscribeToTableQueryChanges(): void {
		this.querySubscription = watch([this.pagination$, this.sort$, this.filters$, this.search$], () =>
			this.refresh(),
		);
	}

	private checkIfNeedToGoPrevious(dataLength: number, pagination: IPaginationParams): void {
		if (dataLength === 0 && pagination.page > 1) {
			// Detach the auto-refresh subscription so this internal decrement does not
			// cascade through watch → refresh → fetchData (which would skip ahead by
			// more than one page on the next microtask flush). Re-attach immediately.
			this.querySubscription();
			this._pagination.set({ ...pagination, page: pagination.page - 1 });
			this.subscribeToTableQueryChanges();
		}
	}
}
