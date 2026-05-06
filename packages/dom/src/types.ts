import type { IColumn, ITableStore } from '@sst/core';

export interface IDomColumn<T> extends IColumn {
	/**
	 * Optional per-cell renderer. When present, replaces the default
	 * `String(row[column.key] ?? '')` behavior.
	 *
	 * Returning a string sets `textContent` (no HTML interpretation).
	 * Returning an `HTMLElement` appends it directly via `appendChild`.
	 */
	readonly render?: (row: T, column: IDomColumn<T>) => string | HTMLElement;
}

export interface IMountOptions<T> {
	/** CSS selector or HTMLElement to mount into. */
	readonly target: string | HTMLElement;
	/** Reactive table state source. */
	readonly store: ITableStore<T>;
	/** Column definitions, in render order. */
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	/** Message shown when `store.data$` is empty and not loading. */
	readonly emptyMessage?: string;
	/** Message shown when `store.loading$` is true and `store.data$` is empty. */
	readonly loadingMessage?: string;
}

export interface ITableHandle {
	/** Unsubscribe from the store, remove DOM nodes, drop event listeners. Idempotent. */
	readonly destroy: () => void;
	/** Convenience pass-through to `store.refresh()`. */
	readonly refresh: () => void;
}
