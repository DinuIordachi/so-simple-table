import { ESortOrder, type ISortParams } from '@bridgebyte/sst-core';
import type { IDomColumn } from '../types';

/**
 * Options for {@link renderHead}.
 *
 * @typeParam T - The shape of a single row in the table data set.
 */
export interface IRenderHeadOptions<T> {
	/** Column definitions used to build the header cells, in render order. */
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	/** Invoked with the clicked column when a sortable header is activated. */
	readonly onSortClick: (column: IDomColumn<T>) => void;
}

/**
 * The rendered table head together with a callback to reflect sort state.
 */
export interface IRenderHeadResult {
	/** The `<thead>` element to insert into the table. */
	readonly element: HTMLTableSectionElement;
	/**
	 * Updates the sort indicators on every sortable header to match the given
	 * sort state. Pass `undefined` to clear all indicators.
	 */
	readonly updateSort: (sort: ISortParams | undefined) => void;
}

/**
 * Builds the table `<thead>` row from the column definitions.
 *
 * Each column becomes a `<th>` carrying its key and a `data-sort` attribute.
 * Sortable columns gain a click handler that invokes `onSortClick` and an
 * indicator span. The returned `updateSort` sets each sortable header's
 * `data-sort` to `asc`, `desc`, or `none` according to the active sort.
 *
 * @typeParam T - The shape of a single row in the table data set.
 * @param options - The columns to render and the sort-click handler.
 * @returns The `<thead>` element and a sort-state updater.
 */
export function renderHead<T>(options: IRenderHeadOptions<T>): IRenderHeadResult {
	const thead = document.createElement('thead');
	thead.className = 'sst-table__head';
	const tr = document.createElement('tr');
	thead.appendChild(tr);

	const cells = new Map<string, HTMLTableCellElement>();

	for (const column of options.columns) {
		const th = document.createElement('th');
		th.className = 'sst-table__head-cell';
		th.dataset['key'] = column.key;
		th.dataset['sort'] = 'none';

		const label = document.createElement('span');
		label.className = 'sst-table__head-label';
		label.textContent = column.name;
		th.appendChild(label);

		if (column.sortable === true) {
			th.classList.add('sst-table__head-cell--sortable');
			const indicator = document.createElement('span');
			indicator.className = 'sst-table__head-indicator';
			indicator.setAttribute('aria-hidden', 'true');
			th.appendChild(indicator);
			th.addEventListener('click', () => options.onSortClick(column));
		}

		tr.appendChild(th);
		cells.set(column.key, th);
	}

	const updateSort = (sort: ISortParams | undefined): void => {
		for (const [key, th] of cells) {
			if (!th.classList.contains('sst-table__head-cell--sortable')) {
				continue;
			}
			if (sort && sort.field === key) {
				th.dataset['sort'] = sort.order === ESortOrder.DESC ? 'desc' : 'asc';
			} else {
				th.dataset['sort'] = 'none';
			}
		}
	};

	return { element: thead, updateSort };
}
