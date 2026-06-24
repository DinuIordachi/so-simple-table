/**
 * Pagination state for a table query.
 */
export interface IPaginationParams {
	/** One-based page index. */
	readonly page: number;
	/** Number of rows per page. */
	readonly pageSize: number;
}
