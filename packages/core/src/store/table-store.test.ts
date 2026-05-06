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
	repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
	repository.bulkDeleteMock.mockResolvedValue({ result: '', isSuccess: true });
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

describe('TableStore — getData and fetchData', () => {
	it('fetchData() flips loading to true, calls repository.getList, then to false', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true });
		const loadings: boolean[] = [];
		store.loading$.subscribe((v) => loadings.push(v), { emitOnSubscribe: false });
		store.getData(store.pagination$.get());
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalledTimes(1);
		expect(store.data$.get()).toStrictEqual([{ id: '1', name: 'a' }]);
		expect(store.total$.get()).toBe(1);
		expect(loadings).toStrictEqual([true, false]);
	});

	it('getData() builds query params using mapTableParams and the configured queryKeys', async () => {
		const { store, repository } = createStore({
			queryKeys: { page: 'pageNumber', pageSize: 'limit' },
		});
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.getData({ page: 4, pageSize: 50 }, undefined, [{ key: 'status', value: 'active' }], 'alpha');
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalledWith({
			pageNumber: 4,
			limit: 50,
			status: ['active'],
			name: 'alpha',
		});
	});

	it('decrements page when an empty result is returned and we are past page 1', async () => {
		const { store, repository } = createStore();
		store.updatePagination({ page: 5, pageSize: 10 });
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.getData({ page: 5, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(store.pagination$.get()).toStrictEqual({ page: 4, pageSize: 10 });
	});

	it('does not decrement page when at page 1 even on empty result', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.getData({ page: 1, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(store.pagination$.get()).toStrictEqual({ page: 1, pageSize: 10 });
	});

	it('auto-refreshes when pagination/sort/filters/search change and coalesces sync updates', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.updatePagination({ page: 2, pageSize: 10 });
		store.updateSearch('hello');
		store.updateFilter([{ key: 'status', value: 'active' }]);
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalledTimes(1);
	});

	it('does not fetch on construction (subscriptions skip the initial value)', async () => {
		const { repository } = createStore();
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).not.toHaveBeenCalled();
	});
});

describe('TableStore — bulkDelete', () => {
	it('delegates to repository.bulkDelete and refreshes after completion', async () => {
		const { store, repository } = createStore();
		repository.bulkDeleteMock.mockResolvedValue({ result: 'ok', isSuccess: true });
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		await store.bulkDelete(['1', '2']);
		expect(repository.bulkDeleteMock).toHaveBeenCalledWith(['1', '2']);
		// Refresh fires asynchronously through the auto-refresh path.
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalled();
	});
});

describe('TableStore — reset', () => {
	it('clears all observables to defaults and detaches the existing subscription', () => {
		const { store, repository } = createStore();
		store.updateData([{ id: '1', name: 'a' }]);
		store.updateTotal(99);
		store.updateFilter([{ key: 'status', value: 'active' }]);
		store.updateSearch('alpha');
		store.updatePagination({ page: 7, pageSize: 25 });
		store.updateSort({ id: 'name-ASC', field: 'name', order: 'ASC' as never });
		repository.getListMock.mockClear();

		store.reset();

		expect(store.data$.get()).toStrictEqual([]);
		expect(store.total$.get()).toBe(0);
		expect(store.filters$.get()).toStrictEqual([]);
		expect(store.search$.get()).toBe('');
		expect(store.pagination$.get()).toStrictEqual({ page: 1, pageSize: 10 });
		expect(store.sort$.get()).toBeUndefined();
	});
});

describe('TableStore — destroy', () => {
	it('detaches the subscription so subsequent updates do not refresh', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.destroy();
		store.updatePagination({ page: 2, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).not.toHaveBeenCalled();
	});
});
