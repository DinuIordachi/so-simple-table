import { Observable, type IReadonlyObservable } from '../state/observable';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { ISortParams } from '../types/sort';
import type { IResponse } from '../types/response';
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

	public constructor(options: ITableStoreOptions<T>) {
		this.repository = options.repository;
		this.sortMap = options.sortMap;
		this.filterMap = options.filterMap;
		this.queryKeys = { ...DEFAULT_QUERY_KEYS, ...(options.queryKeys ?? {}) };
		this.paramFormatting = options.paramFormatting;
		this._pagination = new Observable<IPaginationParams>(options.initialPagination ?? DEFAULT_INITIAL_PAGINATION);
		this.pagination$ = this._pagination.asReadonly();
	}

	public updateData(data: readonly T[]): void { this._data.set(data); }
	public updateTotal(total: number): void { this._total.set(total); }
	public updateLoading(loading: boolean): void { this._loading.set(loading); }
	public updatePagination(p: IPaginationParams): void { this._pagination.set(p); }
	public updateSort(sort: ISortParams | undefined): void { this._sort.set(sort); }
	public updateFilter(filters: readonly IFilterParams[]): void { this._filters.set(filters); }
	public updateSearch(search: string): void { this._search.set(search); }

	// Methods filled in by Task 15 / 16.
	public getData(): void { throw new Error('Not yet implemented'); }
	public bulkDelete(): Promise<IResponse<string>> { throw new Error('Not yet implemented'); }
	public refresh(): void { throw new Error('Not yet implemented'); }
	public reset(): void { throw new Error('Not yet implemented'); }
	public destroy(): void { /* filled in Task 16 */ }
}
