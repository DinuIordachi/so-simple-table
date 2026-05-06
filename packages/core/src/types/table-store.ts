import type { IReadonlyObservable } from '../state/observable';
import type { IFilterParams } from './filter';
import type { IPaginationParams } from './pagination';
import type { IResponse } from './response';
import type { ISortParams } from './sort';

export interface ITableStore<T> {
	readonly data$: IReadonlyObservable<readonly T[]>;
	readonly total$: IReadonlyObservable<number>;
	readonly loading$: IReadonlyObservable<boolean>;
	readonly pagination$: IReadonlyObservable<IPaginationParams>;
	readonly sort$: IReadonlyObservable<ISortParams | undefined>;
	readonly filters$: IReadonlyObservable<readonly IFilterParams[]>;
	readonly search$: IReadonlyObservable<string>;

	getData(
		pagination: IPaginationParams,
		sort?: ISortParams,
		filters?: readonly IFilterParams[],
		search?: string,
	): void;

	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	refresh(): void;
	reset(): void;

	updateData(data: readonly T[]): void;
	updateTotal(total: number): void;
	updateLoading(loading: boolean): void;
	updatePagination(pagination: IPaginationParams): void;
	updateSort(sort: ISortParams | undefined): void;
	updateFilter(filters: readonly IFilterParams[]): void;
	updateSearch(search: string): void;

	destroy(): void;
}
