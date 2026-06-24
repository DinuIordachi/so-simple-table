import type { HttpQueryParams, IResponse, IResponseList } from '../types';

/**
 * Smallest data-source contract the table store depends on: fetching a list and
 * bulk-deleting rows.
 *
 * @remarks
 * Extend this to back the store with a custom source, or use
 * {@link HttpListRepository} for a `fetch`-based implementation. Wider
 * capabilities are layered on by {@link SelectRepository} and {@link Repository}.
 *
 * @typeParam T - Row type.
 */
export abstract class ListRepository<T> {
	/** Fetches a page of rows for the given query parameters. */
	public abstract getList(params?: HttpQueryParams): Promise<IResponseList<T[]>>;

	/** Deletes the rows identified by `ids` in a single operation. */
	public abstract bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
}
