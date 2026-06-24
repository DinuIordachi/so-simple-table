/**
 * Direction in which a column is sorted.
 */
export enum ESortOrder {
	/** Ascending order. */
	ASC = 'ASC',
	/** Descending order. */
	DESC = 'DESC',
}

/**
 * Active sort state for a table query.
 */
export interface ISortParams {
	/** Identifier of the sort, typically the column key. */
	readonly id: string;
	/** Field to sort by; mapped through the store's `sortMap` before being sent. */
	readonly field: string;
	/** Sort direction. */
	readonly order: ESortOrder;
}
