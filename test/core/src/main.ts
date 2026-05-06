import * as sst from '@sst/core';
import {
	ESortOrder,
	Observable,
	TableStore,
	type HttpQueryParams,
	type IFilterParams,
	type IPaginationParams,
	type IResponse,
	type IResponseList,
	type ISortParams,
	type ListRepository,
} from '@sst/core';

interface IItem {
	id: string;
	title: string;
	status: 'active' | 'paused' | 'archived';
	createdAt: string;
}

const $ = <T extends Element>(selector: string): T => {
	const el = document.querySelector<T>(selector);
	if (!el) {
		throw new Error(`element not found: ${selector}`);
	}
	return el;
};

// 1. Imported exports — render the public surface so we can confirm tree-shaking + module
// resolution worked end-to-end (Verdaccio → npm install → Vite → browser bundle).
const exportsList = $('#exports-list');
for (const name of Object.keys(sst).sort()) {
	const li = document.createElement('li');
	li.textContent = name;
	exportsList.appendChild(li);
}
$('#lib-version').textContent = `loaded ${Object.keys(sst).length} exports from @sst/core`;

// 2. Observable — drive a counter and verify Object.is dedup
const counter = new Observable<number>(0);
let notifications = 0;
counter.subscribe((value) => {
	$('#counter-value').textContent = String(value);
	notifications += 1;
	$('#counter-notifications').textContent = String(notifications);
});
$('#counter-inc').addEventListener('click', () => counter.set(counter.get() + 1));
$('#counter-reset').addEventListener('click', () => counter.set(0));

// 3. TableStore — build a stub ListRepository so we don't depend on a backend.
// This exercises the full reactive pipeline: param mapping, fetch, observables, auto-refresh.
const SEED: IItem[] = Array.from({ length: 47 }, (_, i) => ({
	id: String(i + 1),
	title: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'][i % 6] + ` ${i + 1}`,
	status: (['active', 'paused', 'archived'] as const)[i % 3]!,
	createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
}));

const callLog: string[] = [];
const logCall = (params: HttpQueryParams | undefined): void => {
	const line = `getList(${JSON.stringify(params ?? {})})`;
	callLog.push(line);
	$('#call-log').textContent = callLog.slice(-20).join('\n');
};

class StubRepository implements ListRepository<IItem> {
	public async getList(params?: HttpQueryParams): Promise<IResponseList<IItem[]>> {
		logCall(params);
		// Simulate a small network round-trip so the loading badge is visible.
		await new Promise((r) => setTimeout(r, 250));

		let rows = [...SEED];
		const search = params?.['name'];
		if (typeof search === 'string' && search.length > 0) {
			const needle = search.toLowerCase();
			rows = rows.filter((r) => r.title.toLowerCase().includes(needle));
		}
		const status = params?.['status'];
		if (Array.isArray(status) && status.length > 0) {
			rows = rows.filter((r) => (status as ReadonlyArray<string>).includes(r.status));
		}
		const orderBy = params?.['orderBy'];
		const orderByDescending = params?.['orderByDescending'];
		if (typeof orderBy === 'string') {
			rows.sort((a, b) => {
				const av = (a as unknown as Record<string, string>)[orderBy] ?? '';
				const bv = (b as unknown as Record<string, string>)[orderBy] ?? '';
				const cmp = av < bv ? -1 : av > bv ? 1 : 0;
				return orderByDescending === true ? -cmp : cmp;
			});
		}
		const total = rows.length;
		const page = Number(params?.['page'] ?? 1);
		const pageSize = Number(params?.['pageSize'] ?? 10);
		const start = (page - 1) * pageSize;
		const slice = rows.slice(start, start + pageSize);
		return { result: slice, totalCount: total, isSuccess: true };
	}

	public async bulkDelete(_ids: readonly string[]): Promise<IResponse<string>> {
		return { result: 'ok', isSuccess: true };
	}
}

const store = new TableStore<IItem>({
	repository: new StubRepository(),
	sortMap: { title: 'title', createdAt: 'createdAt' },
	filterMap: { status: 'status' },
	initialPagination: { page: 1, pageSize: 10 },
});

const tbody = $('#rows');
const renderRows = (rows: readonly IItem[]): void => {
	tbody.innerHTML = '';
	if (rows.length === 0) {
		const tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="4" class="muted">no rows</td>';
		tbody.appendChild(tr);
		return;
	}
	for (const row of rows) {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td>${row.id}</td><td>${row.title}</td><td>${row.status}</td><td>${row.createdAt.slice(0, 10)}</td>`;
		tbody.appendChild(tr);
	}
};

store.data$.subscribe(renderRows);

store.loading$.subscribe((isLoading) => {
	const badge = $('#loading-badge');
	badge.dataset['state'] = isLoading ? 'loading' : 'idle';
	badge.textContent = isLoading ? 'loading' : 'idle';
});

store.total$.subscribe((total) => {
	$('#total-display').textContent = String(total);
	const pageSize = store.pagination$.get().pageSize;
	$('#totalpages-display').textContent = String(Math.max(1, Math.ceil(total / pageSize)));
});

store.pagination$.subscribe((p) => {
	$('#page-display').textContent = String(p.page);
	const total = store.total$.get();
	$('#totalpages-display').textContent = String(Math.max(1, Math.ceil(total / p.pageSize)));
});

// Wire UI controls to update store observables — auto-refresh kicks in on change.
$<HTMLInputElement>('#search-input').addEventListener('input', (e) => {
	const value = (e.currentTarget as HTMLInputElement).value;
	// Resetting page to 1 is conventional when the search/filter changes.
	store.updatePagination({ ...store.pagination$.get(), page: 1 });
	store.updateSearch(value);
});

$<HTMLSelectElement>('#sort-select').addEventListener('change', (e) => {
	const raw = (e.currentTarget as HTMLSelectElement).value;
	if (!raw) {
		store.updateSort(undefined);
		return;
	}
	const [field, order] = raw.split('-');
	if (!field || !order) {
		return;
	}
	const sort: ISortParams = { id: raw, field, order: order as ESortOrder };
	store.updateSort(sort);
});

$<HTMLSelectElement>('#filter-select').addEventListener('change', (e) => {
	const value = (e.currentTarget as HTMLSelectElement).value;
	const filters: IFilterParams[] = value ? [{ key: 'status', value }] : [];
	store.updatePagination({ ...store.pagination$.get(), page: 1 });
	store.updateFilter(filters);
});

$('#refresh-btn').addEventListener('click', () => store.refresh());
$('#reset-btn').addEventListener('click', () => {
	store.reset();
	$<HTMLInputElement>('#search-input').value = '';
	$<HTMLSelectElement>('#sort-select').value = '';
	$<HTMLSelectElement>('#filter-select').value = '';
});

const movePage = (delta: number): void => {
	const current = store.pagination$.get();
	const total = store.total$.get();
	const totalPages = Math.max(1, Math.ceil(total / current.pageSize));
	const next = Math.min(Math.max(1, current.page + delta), totalPages);
	if (next !== current.page) {
		store.updatePagination({ ...current, page: next } as IPaginationParams);
	}
};

$('#prev-btn').addEventListener('click', () => movePage(-1));
$('#next-btn').addEventListener('click', () => movePage(1));

// Kick off the first fetch — auto-refresh only fires on subsequent observable changes.
store.refresh();
