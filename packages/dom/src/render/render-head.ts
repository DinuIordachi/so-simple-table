import { ESortOrder, type ISortParams } from '@sst/core';
import type { IDomColumn } from '../types';

export interface IRenderHeadOptions<T> {
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	readonly onSortClick: (column: IDomColumn<T>) => void;
}

export interface IRenderHeadResult {
	readonly element: HTMLTableSectionElement;
	readonly updateSort: (sort: ISortParams | undefined) => void;
}

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
