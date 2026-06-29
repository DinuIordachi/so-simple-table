import { ESortOrder, type ISortParams, type Unsubscribe } from '@bridgebyte/sst-core';
import type { IDomColumn, IMountOptions, ITableHandle } from './types';
import { resolveTarget } from './target';
import { renderBody } from './render/render-body';
import { renderHead } from './render/render-head';
import { renderPagination } from './render/render-pagination';

const DEFAULT_EMPTY_MESSAGE = 'No rows to display';
const DEFAULT_LOADING_MESSAGE = 'Loading…';

/**
 * Mounts a reactive HTML table into the page and keeps it synchronized with a
 * {@link @bridgebyte/sst-core#ITableStore}.
 *
 * The table is rendered as a `<div class="sst-table">` wrapper containing a
 * `<table>` (head + body) and a pagination `<nav>`. After the initial render,
 * the function subscribes to the store's `data$`, `loading$`, `total$`,
 * `pagination$`, and `sort$` observables and updates the corresponding DOM in
 * place as they change. Clicking a sortable header cycles its sort through
 * ascending, descending, and unsorted; the pagination buttons advance or
 * rewind `store.pagination$` within bounds. The wrapper's `data-sst-loading`
 * attribute mirrors `store.loading$`. Finally, `store.refresh()` is called to
 * trigger the initial data load.
 *
 * @typeParam T - The shape of a single row in the table data set.
 * @param options - Mount target, store, columns, and optional state messages.
 * @returns A handle for refreshing the data or tearing the table down.
 * @throws Error If `options.target` is a selector that matches no element.
 *
 * @example
 * ```ts
 * const handle = mountTable({
 * 	target: '#app',
 * 	store,
 * 	columns: [
 * 		{ name: 'Name', key: 'name', sortable: true },
 * 		{ name: 'Email', key: 'email' },
 * 	],
 * });
 *
 * // later…
 * handle.refresh();
 * handle.destroy();
 * ```
 */
export function mountTable<T>(options: IMountOptions<T>): ITableHandle {
	const root = resolveTarget(options.target);

	const wrapper = document.createElement('div');
	wrapper.className = 'sst-table';
	wrapper.dataset['sstLoading'] = String(options.store.loading$.get());

	const table = document.createElement('table');
	table.className = 'sst-table__table';

	const head = renderHead<T>({
		columns: options.columns,
		onSortClick: (column) => cycleSort(column, options),
	});

	const body = renderBody<T>({
		columns: options.columns,
		emptyMessage: options.emptyMessage ?? DEFAULT_EMPTY_MESSAGE,
		loadingMessage: options.loadingMessage ?? DEFAULT_LOADING_MESSAGE,
	});

	const pagination = renderPagination({
		onPrev: () => {
			const current = options.store.pagination$.get();
			if (current.page > 1) {
				options.store.updatePagination({ ...current, page: current.page - 1 });
			}
		},
		onNext: () => {
			const current = options.store.pagination$.get();
			const total = options.store.total$.get();
			const totalPages = Math.max(1, Math.ceil(total / current.pageSize));
			if (current.page < totalPages) {
				options.store.updatePagination({ ...current, page: current.page + 1 });
			}
		},
	});

	table.appendChild(head.element);
	table.appendChild(body.element);
	wrapper.appendChild(table);
	wrapper.appendChild(pagination.element);
	root.appendChild(wrapper);

	// Initial render with current store state — subscriptions skip initial.
	body.update(options.store.data$.get(), options.store.loading$.get());
	head.updateSort(options.store.sort$.get());
	const p0 = options.store.pagination$.get();
	pagination.update({ page: p0.page, pageSize: p0.pageSize, total: options.store.total$.get() });

	const unsubs: Unsubscribe[] = [];
	unsubs.push(
		options.store.data$.subscribe((data) => body.update(data, options.store.loading$.get()), {
			emitOnSubscribe: false,
		}),
	);
	unsubs.push(
		options.store.loading$.subscribe(
			(loading) => {
				wrapper.dataset['sstLoading'] = String(loading);
				if (options.store.data$.get().length === 0) {
					body.update([], loading);
				}
			},
			{ emitOnSubscribe: false },
		),
	);
	unsubs.push(
		options.store.total$.subscribe(
			(total) => {
				const p = options.store.pagination$.get();
				pagination.update({ page: p.page, pageSize: p.pageSize, total });
			},
			{ emitOnSubscribe: false },
		),
	);
	unsubs.push(
		options.store.pagination$.subscribe(
			(p) => pagination.update({ page: p.page, pageSize: p.pageSize, total: options.store.total$.get() }),
			{ emitOnSubscribe: false },
		),
	);
	unsubs.push(options.store.sort$.subscribe(head.updateSort, { emitOnSubscribe: false }));

	// Trigger the initial data load.
	options.store.refresh();

	let destroyed = false;
	return {
		destroy: () => {
			if (destroyed) {
				return;
			}
			destroyed = true;
			for (const u of unsubs) {
				u();
			}
			wrapper.remove();
		},
		refresh: () => options.store.refresh(),
	};
}

function cycleSort<T>(column: IDomColumn<T>, options: IMountOptions<T>): void {
	const current = options.store.sort$.get();
	if (!current || current.field !== column.key) {
		const next: ISortParams = { id: `${column.key}-${ESortOrder.ASC}`, field: column.key, order: ESortOrder.ASC };
		options.store.updateSort(next);
		return;
	}
	if (current.order === ESortOrder.ASC) {
		const next: ISortParams = { id: `${column.key}-${ESortOrder.DESC}`, field: column.key, order: ESortOrder.DESC };
		options.store.updateSort(next);
		return;
	}
	options.store.updateSort(undefined);
}
