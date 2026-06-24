import type { IDomColumn } from '../types';

/**
 * Options for {@link renderBody}.
 *
 * @typeParam T - The shape of a single row in the table data set.
 */
export interface IRenderBodyOptions<T> {
	/** Column definitions used to render each row's cells, in render order. */
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	/** Text shown in a single full-width row when there is no data and not loading. */
	readonly emptyMessage: string;
	/** Text shown in a single full-width row when there is no data and loading. */
	readonly loadingMessage: string;
}

/**
 * The rendered table body together with a callback to repopulate its rows.
 *
 * @typeParam T - The shape of a single row in the table data set.
 */
export interface IRenderBodyResult<T> {
	/** The `<tbody>` element to insert into the table. */
	readonly element: HTMLTableSectionElement;
	/**
	 * Replaces the body's rows with the given data, or shows the empty/loading
	 * placeholder row when `data` is empty.
	 */
	readonly update: (data: readonly T[], loading: boolean) => void;
}

/**
 * Builds the table `<tbody>` and returns an updater that re-renders its rows.
 *
 * The returned `update` clears the body and either renders one `<tr>` per datum
 * — one cell per column, using a column's `render` callback when provided and
 * otherwise the stringified `row[column.key]` value — or, when `data` is empty,
 * a single full-width state row showing the loading or empty message.
 *
 * @typeParam T - The shape of a single row in the table data set.
 * @param options - The columns to render and the empty/loading messages.
 * @returns The `<tbody>` element and a row updater.
 */
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
