/**
 * A single active filter applied to the table.
 *
 * @remarks
 * Multiple entries may share the same `key`; the store groups same-key values
 * into an array when building query parameters (see {@link mapTableParams}).
 */
export interface IFilterParams {
	/** Field the filter targets; mapped through the store's `filterMap` if provided. */
	readonly key: string;
	/** Value to filter by. */
	readonly value: string;
}
