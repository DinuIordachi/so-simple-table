/**
 * A single selectable value for a column's filter control.
 */
export interface IColumnFilterOption {
	/** Label shown to the user. */
	readonly text: string;
	/** Value emitted when the option is selected. */
	readonly value: string;
}

/**
 * Declarative description of a table column, consumed by UI bindings to render
 * headers and per-column controls (sorting, filtering, search, tooltips).
 */
export interface IColumn {
	/** Display name rendered in the column header. */
	readonly name: string;
	/** Field key identifying the column's value on each row. */
	readonly key: string;
	/** Fixed column width in pixels; left to the UI to interpret when omitted. */
	readonly width?: number;
	/** Whether the column can be sorted. */
	readonly sortable?: boolean;
	/** Tooltip shown on the column header. */
	readonly columnTooltip?: string;
	/** Whether each cell in the column shows a tooltip with its content. */
	readonly showCellTooltip?: boolean;
	/** Predefined options offered by the column's filter control. */
	readonly filters?: readonly IColumnFilterOption[];
	/** Whether more than one filter option may be selected at once. */
	readonly filterMultiple?: boolean;
	/** Whether overflowing cell text should be truncated. */
	readonly cutString?: boolean;
	/** Per-column free-text search configuration. */
	readonly search?: {
		/** Placeholder text for the search input. */
		readonly placeholder: string;
		/** Optional validation pattern the search term must match. */
		readonly pattern?: RegExp;
		/** Message shown when the search term fails {@link IColumn.search.pattern}. */
		readonly errorMessage?: string;
	};
}
