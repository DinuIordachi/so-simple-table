import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ESortOrder, type IResponse, type IResponseList, TableStore } from '@sst/core';
import type { IDomColumn } from './types';
import { mountTable } from './mount-table';

interface IItem { id: string; title: string; status: 'a' | 'b'; }

class StubRepo {
	public readonly getList = vi.fn<(params?: unknown) => Promise<IResponseList<IItem[]>>>();
	public readonly bulkDelete = vi.fn<(ids: readonly string[]) => Promise<IResponse<string>>>();
}

const COLUMNS: ReadonlyArray<IDomColumn<IItem>> = [
	{ key: 'id', name: 'ID' },
	{ key: 'title', name: 'Title', sortable: true },
	{ key: 'status', name: 'Status', render: (row) => `[${row.status}]` },
];

function createStore(seed: IItem[] = []) {
	const repo = new StubRepo();
	repo.getList.mockResolvedValue({ result: seed, totalCount: seed.length, isSuccess: true });
	repo.bulkDelete.mockResolvedValue({ result: '', isSuccess: true });
	const store = new TableStore<IItem>({ repository: repo, sortMap: { title: 'title' } });
	return { store, repo };
}

describe('mountTable', () => {
	let host: HTMLElement;

	beforeEach(() => {
		host = document.createElement('div');
		host.id = 'host';
		document.body.appendChild(host);
	});

	afterEach(() => {
		host.remove();
	});

	it('mounts into a string selector and renders thead/tbody/pagination', async () => {
		const { store } = createStore([{ id: '1', title: 'Alpha', status: 'a' }]);
		const handle = mountTable<IItem>({ target: '#host', store, columns: COLUMNS });
		await Promise.resolve();
		await Promise.resolve();
		expect(host.querySelector('.sst-table thead')).not.toBeNull();
		expect(host.querySelector('.sst-table tbody')).not.toBeNull();
		expect(host.querySelector('.sst-pagination')).not.toBeNull();
		handle.destroy();
	});

	it('mounts into an HTMLElement and reflects data$ updates', async () => {
		const { store } = createStore([{ id: '1', title: 'Alpha', status: 'a' }]);
		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		await Promise.resolve();
		await Promise.resolve();
		const cells = host.querySelectorAll('tr.sst-table__row td');
		expect(cells[0]!.textContent).toBe('1');
		expect(cells[1]!.textContent).toBe('Alpha');
		expect(cells[2]!.textContent).toBe('[a]');
		handle.destroy();
	});

	it('clicking a sortable header cycles ASC → DESC → undefined', async () => {
		const { store } = createStore();
		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		await Promise.resolve();
		await Promise.resolve();
		const titleHeader = host.querySelector('th[data-key="title"]') as HTMLElement;

		titleHeader.click();
		expect(store.sort$.get()).toMatchObject({ field: 'title', order: ESortOrder.ASC });

		titleHeader.click();
		expect(store.sort$.get()).toMatchObject({ field: 'title', order: ESortOrder.DESC });

		titleHeader.click();
		expect(store.sort$.get()).toBeUndefined();

		handle.destroy();
	});

	it('clicking a sortable header for a different column resets to ASC', async () => {
		const { store } = createStore();
		const cols: ReadonlyArray<IDomColumn<IItem>> = [
			{ key: 'id', name: 'ID', sortable: true },
			{ key: 'title', name: 'Title', sortable: true },
		];
		const handle = mountTable<IItem>({ target: host, store, columns: cols });
		await Promise.resolve();
		await Promise.resolve();
		(host.querySelector('th[data-key="title"]') as HTMLElement).click();
		expect(store.sort$.get()).toMatchObject({ field: 'title', order: ESortOrder.ASC });
		(host.querySelector('th[data-key="id"]') as HTMLElement).click();
		expect(store.sort$.get()).toMatchObject({ field: 'id', order: ESortOrder.ASC });
		handle.destroy();
	});

	it('next/prev buttons update store.pagination$ and stop at boundaries', async () => {
		const seed = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), title: `t${i}`, status: 'a' as const }));
		const { store, repo } = createStore(seed);
		// Override mock to honor the page param so next/prev produces non-empty results
		repo.getList.mockImplementation(async (params: unknown) => {
			const p = params as Record<string, unknown> | undefined;
			const page = Number(p?.['page'] ?? 1);
			const pageSize = Number(p?.['pageSize'] ?? 10);
			const start = (page - 1) * pageSize;
			return { result: seed.slice(start, start + pageSize), totalCount: seed.length, isSuccess: true };
		});

		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		await Promise.resolve();
		await Promise.resolve();

		const next = host.querySelector('.sst-pagination__btn--next') as HTMLButtonElement;
		const prev = host.querySelector('.sst-pagination__btn--prev') as HTMLButtonElement;

		next.click();
		expect(store.pagination$.get().page).toBe(2);
		next.click();
		expect(store.pagination$.get().page).toBe(3);
		// page 3 is the last (25 / 10 = 3 pages); guarded — clicking next is a no-op
		await Promise.resolve();
		await Promise.resolve();
		next.click();
		expect(store.pagination$.get().page).toBe(3);

		prev.click();
		expect(store.pagination$.get().page).toBe(2);

		handle.destroy();
	});

	it('throws when target selector matches nothing', () => {
		const { store } = createStore();
		expect(() => mountTable<IItem>({ target: '#missing', store, columns: COLUMNS })).toThrow(/target not found/);
	});

	it('destroy() unsubscribes — subsequent store updates do not touch the DOM', async () => {
		const { store } = createStore([{ id: '1', title: 'Alpha', status: 'a' }]);
		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		await Promise.resolve();
		await Promise.resolve();
		handle.destroy();
		expect(host.querySelector('.sst-table')).toBeNull();
		store.updateData([{ id: '99', title: 'Z', status: 'b' }]);
		await Promise.resolve();
		expect(host.querySelector('.sst-table')).toBeNull(); // still gone
	});

	it('destroy() is idempotent', async () => {
		const { store } = createStore();
		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		handle.destroy();
		expect(() => handle.destroy()).not.toThrow();
	});

	it('refresh() proxies store.refresh()', async () => {
		const { store, repo } = createStore();
		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		await Promise.resolve();
		await Promise.resolve();
		repo.getList.mockClear();
		handle.refresh();
		await Promise.resolve();
		expect(repo.getList).toHaveBeenCalledTimes(1);
		handle.destroy();
	});

	it('reflects loading$ via the wrapper data attribute', async () => {
		const { store } = createStore();
		const handle = mountTable<IItem>({ target: host, store, columns: COLUMNS });
		store.updateLoading(true);
		expect((host.querySelector('.sst-table') as HTMLElement).dataset['sstLoading']).toBe('true');
		store.updateLoading(false);
		expect((host.querySelector('.sst-table') as HTMLElement).dataset['sstLoading']).toBe('false');
		handle.destroy();
	});
});
