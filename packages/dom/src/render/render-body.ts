import type { IDomColumn } from '../types';

export interface IRenderBodyOptions<T> {
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	readonly emptyMessage: string;
	readonly loadingMessage: string;
}

export interface IRenderBodyResult<T> {
	readonly element: HTMLTableSectionElement;
	readonly update: (data: readonly T[], loading: boolean) => void;
}

export function renderBody<T>(options: IRenderBodyOptions<T>): IRenderBodyResult<T> {
	const tbody = document.createElement('tbody');
	tbody.className = 'sst-table__body';

	const renderCell = (row: T, column: IDomColumn<T>): HTMLTableCellElement => {
		const td = document.createElement('td');
		td.className = 'sst-table__cell';
		td.dataset['key'] = column.key;
		if (column.render) {
			const result = column.render(row, column);
			if (typeof result === 'string') {
				td.textContent = result;
			} else {
				td.appendChild(result);
			}
		} else {
			const value = (row as unknown as Record<string, unknown>)[column.key];
			td.textContent = value === null || value === undefined ? '' : String(value);
		}
		return td;
	};

	const update = (data: readonly T[], loading: boolean): void => {
		tbody.replaceChildren();
		if (data.length === 0) {
			const tr = document.createElement('tr');
			tr.className = 'sst-table__state-row';
			const td = document.createElement('td');
			td.setAttribute('colspan', String(options.columns.length));
			td.textContent = loading ? options.loadingMessage : options.emptyMessage;
			tr.appendChild(td);
			tbody.appendChild(tr);
			return;
		}
		for (const row of data) {
			const tr = document.createElement('tr');
			tr.className = 'sst-table__row';
			for (const column of options.columns) {
				tr.appendChild(renderCell(row, column));
			}
			tbody.appendChild(tr);
		}
	};

	return { element: tbody, update };
}
