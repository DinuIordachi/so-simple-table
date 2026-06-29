import { describe, it, expect, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { ListRepository, type IResponse, type IResponseList } from '@bridgebyte/sst-core';
import { useTableStore } from './use-table-store';

interface IItem {
	id: string;
	name: string;
}

class StubRepository extends ListRepository<IItem> {
	public readonly getListMock = vi.fn<(...a: unknown[]) => Promise<IResponseList<IItem[]>>>().mockResolvedValue({
		result: [{ id: '1', name: 'a' }],
		totalCount: 1,
		isSuccess: true,
	});
	public readonly bulkDeleteMock = vi.fn<(...a: unknown[]) => Promise<IResponse<string>>>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
	public override getList(p: unknown): Promise<IResponseList<IItem[]>> {
		return this.getListMock(p);
	}
	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.bulkDeleteMock(ids);
	}
}

describe('useTableStore', () => {
	it('returns reactive refs for every observable on the store', () => {
		const repository = new StubRepository();
		const scope = effectScope();
		scope.run(() => {
			const t = useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } });
			expect(t.data.value).toStrictEqual([]);
			expect(t.total.value).toBe(0);
			expect(t.loading.value).toBe(false);
			expect(t.pagination.value).toStrictEqual({ page: 1, pageSize: 10 });
			expect(t.sort.value).toBeUndefined();
			expect(t.filters.value).toStrictEqual([]);
			expect(t.search.value).toBe('');
		});
		scope.stop();
	});

	it('refreshes data when an action mutates query state', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } });
			t.updatePagination({ page: 2, pageSize: 10 });
			await Promise.resolve();
			await Promise.resolve();
			await nextTick();
			expect(repository.getListMock).toHaveBeenCalledTimes(1);
			expect(t.data.value).toStrictEqual([{ id: '1', name: 'a' }]);
		});
		scope.stop();
	});

	it('cleans up the underlying TableStore subscription when the scope is disposed', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		const t = scope.run(() => useTableStore<IItem>({ repository, sortMap: {} }))!;
		scope.stop();
		t.updatePagination({ page: 5, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).not.toHaveBeenCalled();
	});

	it('setPage / setPageSize merge with the current pagination and refetch', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTableStore<IItem>({ repository, sortMap: {} });
			t.setPage(3);
			await Promise.resolve();
			await Promise.resolve();
			await nextTick();
			expect(t.pagination.value).toStrictEqual({ page: 3, pageSize: 10 }); // page set, size kept
			t.setPageSize(25);
			await Promise.resolve();
			await Promise.resolve();
			await nextTick();
			expect(t.pagination.value).toStrictEqual({ page: 3, pageSize: 25 }); // size set, page kept
			expect(repository.getListMock).toHaveBeenCalledTimes(2);
		});
		scope.stop();
	});

	it('exposes a bulkDelete that delegates to the repository', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTableStore<IItem>({ repository, sortMap: {} });
			await t.bulkDelete(['1']);
			expect(repository.bulkDeleteMock).toHaveBeenCalledWith(['1']);
		});
		scope.stop();
	});
});
