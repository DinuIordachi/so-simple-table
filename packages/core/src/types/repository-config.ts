import type { IHttpClient } from './http-client';
import type { IResponseList } from './response';

export interface IRepositoryQueryKeys {
	readonly page: string;
	readonly pageSize: string;
	readonly orderBy: string;
	readonly orderByDescending: string;
	readonly search: string;
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

export interface IRepositoryConfig<T = unknown> {
	/** Required. Base URL for all repository requests, e.g. `https://api.example.com/users`. */
	readonly baseUrl: string;
	readonly httpClient?: IHttpClient;
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	readonly paramFormatting?: IParamFormattingStrategy;
	readonly responseListMapper?: ResponseListMapper<T>;
}

export const DEFAULT_QUERY_KEYS: IRepositoryQueryKeys = {
	page: 'page',
	pageSize: 'pageSize',
	orderBy: 'orderBy',
	orderByDescending: 'orderByDescending',
	search: 'name',
};
