import { describe, it, expect, vi } from 'vitest';
import { ESortOrder } from '../types/sort';
import { TableStore } from './table-store';
import type { ListRepository } from '../repositories/list.repository';
import type { IResponse, IResponseList } from '../types/response';

interface IItem { id: string; name: string; }

class StubListRepository implements ListRepository<IItem> {
	public readonly getListMock = vi.fn<(...args: unknown[]) => Promise<IResponseList<IItem[]>>>();
	public readonly bulkDeleteMock = vi.fn<(ids: readonly string[]) => Promise<IResponse<string>>>();
	public getList(params?: unknown): Promise<IResponseList<IItem[]>> {
		return this.getListMock(params);
	}
	public bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.bulkDeleteMock(ids);
	}
}

function createStore(overrides: Partial<ConstructorParameters<typeof TableStore<IItem>>[0]> = {}) {
	const repository = new StubListRepository();
	const store = new TableStore<IItem>({
		repository,
		sortMap: { createdAt: 'ByCreationDate' },
		...overrides,
	});
	return { store, repository };
}

describe('TableStore — initial state', () => {
	it('exposes the canonical default state', () => {
		const { store } = createStore();
		expect(store.data$.get()).toStrictEqual([]);
		expect(store.total$.get()).toBe(0);
		expect(store.loading$.get()).toBe(false);
		expect(store.pagination$.get()).toStrictEqual({ page: 1, pageSize: 10 });
		expect(store.sort$.get()).toBeUndefined();
		expect(store.filters$.get()).toStrictEqual([]);
		expect(store.search$.get()).toBe('');
	});

	it('respects custom initialPagination', () => {
		const { store } = createStore({ initialPagination: { page: 3, pageSize: 25 } });
		expect(store.pagination$.get()).toStrictEqual({ page: 3, pageSize: 25 });
	});
});

describe('TableStore — update methods', () => {
	it('updateData / updateTotal / updateLoading mutate the corresponding observables', () => {
		const { store } = createStore();
		store.updateData([{ id: '1', name: 'a' }]);
		store.updateTotal(42);
		store.updateLoading(true);
		expect(store.data$.get()).toStrictEqual([{ id: '1', name: 'a' }]);
		expect(store.total$.get()).toBe(42);
		expect(store.loading$.get()).toBe(true);
	});

	it('updatePagination mutates pagination$', () => {
		const { store } = createStore();
		store.updatePagination({ page: 2, pageSize: 20 });
		expect(store.pagination$.get()).toStrictEqual({ page: 2, pageSize: 20 });
	});

	it('updateSort mutates sort$', () => {
		const { store } = createStore();
		const sort = { id: 'name-ASC', field: 'name', order: ESortOrder.ASC };
		store.updateSort(sort);
		expect(store.sort$.get()).toStrictEqual(sort);
	});

	it('updateFilter mutates filters$', () => {
		const { store } = createStore();
		store.updateFilter([{ key: 'status', value: 'active' }]);
		expect(store.filters$.get()).toStrictEqual([{ key: 'status', value: 'active' }]);
	});

	it('updateSearch mutates search$', () => {
		const { store } = createStore();
		store.updateSearch('alpha');
		expect(store.search$.get()).toBe('alpha');
	});
});
