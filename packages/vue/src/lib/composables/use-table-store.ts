import { onScopeDispose, type Ref } from 'vue';
import {
	TableStore,
	type IFilterParams,
	type IPaginationParams,
	type IResponse,
	type ISortParams,
	type ITableStoreOptions,
} from '@sst/core';
import { useObservable } from './use-observable';

export interface IUseTableStoreReturn<T> {
	readonly store: TableStore<T>;
	readonly data: Readonly<Ref<readonly T[]>>;
	readonly total: Readonly<Ref<number>>;
	readonly loading: Readonly<Ref<boolean>>;
	readonly pagination: Readonly<Ref<IPaginationParams>>;
	readonly sort: Readonly<Ref<ISortParams | undefined>>;
	readonly filters: Readonly<Ref<readonly IFilterParams[]>>;
	readonly search: Readonly<Ref<string>>;

	getData(pagination: IPaginationParams, sort?: ISortParams, filters?: readonly IFilterParams[], search?: string): void;
	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	refresh(): void;
	reset(): void;
	updatePagination(p: IPaginationParams): void;
	updateSort(sort: ISortParams | undefined): void;
	updateFilter(filters: readonly IFilterParams[]): void;
	updateSearch(search: string): void;
}

export function useTableStore<T>(options: ITableStoreOptions<T>): IUseTableStoreReturn<T> {
	const store = new TableStore<T>(options);
	onScopeDispose(() => store.destroy());

	return {
		store,
		data: useObservable(store.data$),
		total: useObservable(store.total$),
		loading: useObservable(store.loading$),
		pagination: useObservable(store.pagination$),
		sort: useObservable(store.sort$),
		filters: useObservable(store.filters$),
		search: useObservable(store.search$),

		getData: store.getData.bind(store),
		bulkDelete: store.bulkDelete.bind(store),
		refresh: store.refresh.bind(store),
		reset: store.reset.bind(store),
		updatePagination: store.updatePagination.bind(store),
		updateSort: store.updateSort.bind(store),
		updateFilter: store.updateFilter.bind(store),
		updateSearch: store.updateSearch.bind(store),
	};
}
