import type { IColumn, ITableStore } from '@bridgebyte/sst-core';

/**
 * Column definition for the DOM table renderer.
 *
 * Extends the core {@link @bridgebyte/sst-core#IColumn} with an optional `render` callback
 * that lets a column produce custom cell content instead of relying on the
 * default value-to-text conversion.
 *
 * @typeParam T - The shape of a single row in the table data set.
 */
export interface IDomColumn<T> extends IColumn {
	/**
	 * Optional per-cell renderer. When present, replaces the default
	 * `String(row[column.key] ?? '')` behavior.
	 *
	 * Returning a string sets `textContent` (no HTML interpretation), so the
	 * output is escaped and safe from markup injection. Returning an
	 * `HTMLElement` appends it directly via `appendChild`, giving the column
	 * full control over the cell's DOM.
	 *
	 * @param row - The row datum being rendered.
	 * @param column - The column definition this cell belongs to.
	 * @returns The cell's text content, or an element to append into the cell.
	 */
	readonly render?: (row: T, column: IDomColumn<T>) => string | HTMLElement;
}

/**
 * Options accepted by {@link mountTable}.
 *
 * @typeParam T - The shape of a single row in the table data set.
 */
export interface IMountOptions<T> {
	/** CSS selector string or an existing `HTMLElement` to mount the table into. */
	readonly target: string | HTMLElement;
	/** Reactive table state source whose observables drive every render. */
	readonly store: ITableStore<T>;
	/** Column definitions, rendered left-to-right in the order given. */
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	/**
	 * Message shown when `store.data$` is empty and the store is not loading.
	 *
	 * @defaultValue `'No rows to display'`
	 */
	readonly emptyMessage?: string;
	/**
	 * Message shown when `store.loading$` is `true` and `store.data$` is empty.
	 *
	 * @defaultValue `'Loading…'`
	 */
	readonly loadingMessage?: string;
}

/**
 * Lifecycle handle returned by {@link mountTable}, used to control a mounted
 * table after it has been rendered.
 */
export interface ITableHandle {
	/**
	 * Tears the table down: unsubscribes from every store observable, removes
	 * the rendered DOM nodes, and drops the attached event listeners.
	 *
	 * @remarks Idempotent — calling it more than once is a no-op.
	 */
	readonly destroy: () => void;
	/** Convenience pass-through to `store.refresh()` to reload the data set. */
	readonly refresh: () => void;
}
