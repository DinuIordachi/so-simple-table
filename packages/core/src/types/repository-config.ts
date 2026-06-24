import type { IHttpClient } from './http-client';
import type { IResponseList } from './response';

/**
 * Names of the query-string keys the store emits for paging, sorting, and
 * search.
 *
 * @remarks
 * Override individual keys via {@link IRepositoryConfig.queryKeys} to match a
 * backend's API conventions; see {@link DEFAULT_QUERY_KEYS} for the defaults.
 */
export interface IRepositoryQueryKeys {
	/** Query key carrying the current page number. */
	readonly page: string;
	/** Query key carrying the page size. */
	readonly pageSize: string;
	/** Query key carrying the field to order by. */
	readonly orderBy: string;
	/** Query key carrying the descending-order flag. */
	readonly orderByDescending: string;
	/** Query key carrying the free-text search term. */
	readonly search: string;
}

/** Pagination wire style: `'page'` (page + pageSize) or `'offset'` (skip + limit). */
export type PaginationStyle = 'page' | 'offset';

/** Sort wire style: `'flag'` (orderBy + boolean) or `'direction'` (sortBy + asc/desc token). */
export type SortStyle = 'flag' | 'direction';

/** Tokens emitted for ascending/descending order in the `'direction'` {@link SortStyle}. */
export interface ISortDirections {
	readonly asc: string;
	readonly desc: string;
}

/**
 * Strategy used by the table store to format filters and sort fields
 * into the outgoing query params object.
 */
export interface IParamFormattingStrategy {
	/**
	 * Format a filter into a (key, value) pair appended to query params.
	 * Default: `{ [filter.key]: [...existingValues, filter.value] }`.
	 */
	readonly formatFilter?: (filter: { key: string; value: string }, existing: unknown) => unknown;
	/**
	 * Format a sort field name into the value sent for the `orderBy` key.
	 * Default: pass-through.
	 */
	readonly formatSortField?: (field: string) => string;
}

/**
 * Maps a raw HTTP payload to the canonical IResponseList shape.
 * Default: assumes the payload already matches `IResponseList<T[]>`.
 */
export type ResponseListMapper<T> = (raw: unknown) => IResponseList<T[]>;

/**
 * Configuration accepted by the HTTP repository constructors.
 *
 * @typeParam T - Row type the repository returns.
 */
export interface IRepositoryConfig<T = unknown> {
	/** Required. Base URL for all repository requests, e.g. `https://api.example.com/users`. */
	readonly baseUrl: string;
	/** Transport to use; defaults to a new {@link FetchHttpClient} when omitted. */
	readonly httpClient?: IHttpClient;
	/** Overrides for individual query-string keys; merged over {@link DEFAULT_QUERY_KEYS}. */
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	/** Strategy for formatting filter and sort params. */
	readonly paramFormatting?: IParamFormattingStrategy;
	/** Maps a raw list payload into the canonical {@link IResponseList} shape. */
	readonly responseListMapper?: ResponseListMapper<T>;
}

/**
 * Default {@link IRepositoryQueryKeys} used when none are supplied: `page`,
 * `pageSize`, `orderBy`, `orderByDescending`, and `name` (for search).
 */
export const DEFAULT_QUERY_KEYS: IRepositoryQueryKeys = {
	page: 'page',
	pageSize: 'pageSize',
	orderBy: 'orderBy',
	orderByDescending: 'orderByDescending',
	search: 'name',
};
