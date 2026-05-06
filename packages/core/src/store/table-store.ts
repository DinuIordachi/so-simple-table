import { Observable, type IReadonlyObservable, type Unsubscribe } from '../state/observable';
import { watch } from '../state/watch';
import { mapTableParams } from './map-table-params';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { ISortParams } from '../types/sort';
import type { IResponse, IResponseList } from '../types/response';
import type { ITableStore } from '../types/table-store';
import type { ListRepository } from '../repositories/list.repository';
import type { IRepositoryQueryKeys, IParamFormattingStrategy } from '../types/repository-config';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';

export interface ITableStoreOptions<T> {
	readonly repository: ListRepository<T>;
	readonly sortMap: Readonly<Record<string, string>>;
	readonly filterMap?: Readonly<Record<string, string>>;
	readonly initialPagination?: IPaginationParams;
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	readonly paramFormatting?: IParamFormattingStrategy;
}

const DEFAULT_INITIAL_PAGINATION: IPaginationParams = { page: 1, pageSize: 10 };

export class TableStore<T> implements ITableStore<T> {
	private readonly _data = new Observable<readonly T[]>([]);
	private readonly _total = new Observable<number>(0);
	private readonly _loading = new Observable<boolean>(false);
	private readonly _pagination: Observable<IPaginationParams>;
	private readonly _sort = new Observable<ISortParams | undefined>(undefined);
	private readonly _filters = new Observable<readonly IFilterParams[]>([]);
	private readonly _search = new Observable<string>('');

	public readonly data$: IReadonlyObservable<readonly T[]> = this._data.asReadonly();
	public readonly total$: IReadonlyObservable<number> = this._total.asReadonly();
	public readonly loading$: IReadonlyObservable<boolean> = this._loading.asReadonly();
	public readonly pagination$: IReadonlyObservable<IPaginationParams>;
	public readonly sort$: IReadonlyObservable<ISortParams | undefined> = this._sort.asReadonly();
	public readonly filters$: IReadonlyObservable<readonly IFilterParams[]> = this._filters.asReadonly();
	public readonly search$: IReadonlyObservable<string> = this._search.asReadonly();

	protected readonly repository: ListRepository<T>;
	protected readonly sortMap: Readonly<Record<string, string>>;
	protected readonly filterMap: Readonly<Record<string, string>> | undefined;
	protected readonly queryKeys: IRepositoryQueryKeys;
	protected readonly paramFormatting: IParamFormattingStrategy | undefined;
	private querySubscription: Unsubscribe = () => {};

	public constructor(options: ITableStoreOptions<T>) {
		this.repository = options.repository;
		this.sortMap = options.sortMap;
		this.filterMap = options.filterMap;
		this.queryKeys = { ...DEFAULT_QUERY_KEYS, ...(options.queryKeys ?? {}) };
		this.paramFormatting = options.paramFormatting;
		this._pagination = new Observable<IPaginationParams>(options.initialPagination ?? DEFAULT_INITIAL_PAGINATION);
		this.pagination$ = this._pagination.asReadonly();
		this.subscribeToTableQueryChanges();
	}

	public updateData(data: readonly T[]): void { this._data.set(data); }
	public updateTotal(total: number): void { this._total.set(total); }
	public updateLoading(loading: boolean): void { this._loading.set(loading); }
	public updatePagination(p: IPaginationParams): void { this._pagination.set(p); }
	public updateSort(sort: ISortParams | undefined): void { this._sort.set(sort); }
	public updateFilter(filters: readonly IFilterParams[]): void { this._filters.set(filters); }
	public updateSearch(search: string): void { this._search.set(search); }

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
		});
		this.fetchData(this.repository.getList(params));
	}

	protected fetchData(promise: Promise<IResponseList<T[]>>): void {
		if (!promise) {
			return;
		}
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

	public async bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		const result = await this.repository.bulkDelete(ids);
		this.refresh();
		return result;
	}

	public refresh(): void {
		this.getData(this._pagination.get(), this._sort.get(), this._filters.get(), this._search.get());
	}

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

	public destroy(): void {
		this.querySubscription();
	}

	private subscribeToTableQueryChanges(): void {
		this.querySubscription = watch(
			[this.pagination$, this.sort$, this.filters$, this.search$],
			() => this.refresh(),
		);
	}

	private checkIfNeedToGoPrevious(dataLength: number, pagination: IPaginationParams): void {
		if (dataLength === 0 && pagination.page > 1) {
			// Detach subscription so this internal pagination adjustment does not trigger
			// a new auto-refresh cycle; reattach immediately after.
			const prev = this.querySubscription;
			prev(); // unsubscribe
			this._pagination.set({ ...pagination, page: pagination.page - 1 });
			this.querySubscription = watch(
				[this.pagination$, this.sort$, this.filters$, this.search$],
				() => this.refresh(),
			);
		}
	}
}
