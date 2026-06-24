import {
	FetchHttpClient,
	HttpListRepository,
	type IHttpClient,
	type IPaginationParams,
	type IParamFormattingStrategy,
	type IRepositoryQueryKeys,
	type IResponseList,
	type ISortDirections,
	type PaginationStyle,
	type SortStyle,
} from '@sst/core';
import { useTableStore, type IUseTableStoreReturn } from './use-table-store';

export interface IDefineTableConfig<T extends { id: string }, TRaw = unknown> {
	/** Required. Base URL for all requests, e.g. `https://api.example.com/users`. */
	readonly baseUrl: string;
	/** Default-client headers (e.g. a JSON:API `Accept`). Ignored when `httpClient` is provided. */
	readonly headers?: Record<string, string>;
	/** Escape hatch: supply a custom client (logging, interceptors, auth). Overrides `headers`. */
	readonly httpClient?: IHttpClient;
	/** Map a non-canonical API payload to `IResponseList<T[]>`. */
	readonly mapResponse?: (raw: TRaw) => IResponseList<T[]>;
	/** Override the query-string keys consumed by the table store. */
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	/** Map a column key to the server sort field. Default `{}` → no server-side sort. */
	readonly sortMap?: Readonly<Record<string, string>>;
	/** Map a filter key to a server param name. */
	readonly filterMap?: Readonly<Record<string, string>>;
	/** Initial pagination. Default `{ page: 1, pageSize: 10 }`. */
	readonly initialPagination?: IPaginationParams;
	/** Advanced filter/sort formatting strategy. */
	readonly paramFormatting?: IParamFormattingStrategy;
	/** Pagination wire style; `'page'` (default) or `'offset'` (skip + limit). */
	readonly paginationStyle?: PaginationStyle;
	/** Sort wire style; `'flag'` (default) or `'direction'` (sortBy + asc/desc). */
	readonly sortStyle?: SortStyle;
	/** Tokens for `'direction'` sort style; defaults to `{ asc: 'asc', desc: 'desc' }`. */
	readonly sortDirections?: ISortDirections;
	/** When search is active, route to `` `${baseUrl}${searchEndpoint}` `` (e.g. `'/search'`). */
	readonly searchEndpoint?: string;
}

/**
 * Declarative table definition for Vue. Returns a `useTable()` composable that,
 * when called inside `setup`, builds the repository + store and auto-disposes
 * it on scope teardown.
 *
 * @typeParam T - Row/entity type; must carry a string `id`.
 * @typeParam TRaw - Shape of the raw API payload, when a {@link IDefineTableConfig.mapResponse | mapResponse} mapper is supplied.
 * @param config - Declarative configuration for the table's data source.
 * @returns A `useTable()` composable yielding a {@link IUseTableStoreReturn}.
 *
 * @remarks
 * The returned `useTable()` composable must be called synchronously inside a
 * component `setup` or other active effect scope, since the store is disposed
 * on scope teardown.
 *
 * @example
 * ```ts
 * // users-table.ts
 * import { defineTable } from '@sst/vue';
 *
 * export const useUsersTable = defineTable<{ id: string; name: string }>({
 * 	baseUrl: 'https://api.example.com/users',
 * 	initialPagination: { page: 1, pageSize: 25 },
 * });
 * ```
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useUsersTable } from './users-table';
 *
 * const { data, loading, total, updatePagination } = useUsersTable();
 * </script>
 * ```
 */
export function defineTable<T extends { id: string }, TRaw = unknown>(
	config: IDefineTableConfig<T, TRaw>,
): () => IUseTableStoreReturn<T> {
	const { mapResponse } = config;

	return function useTable(): IUseTableStoreReturn<T> {
		const httpClient: IHttpClient =
			config.httpClient ?? new FetchHttpClient(config.headers ? { baseHeaders: config.headers } : {});

		const repository = new HttpListRepository<T>({
			baseUrl: config.baseUrl,
			httpClient,
			...(mapResponse
				? { responseListMapper: (raw: unknown): IResponseList<T[]> => mapResponse(raw as TRaw) }
				: {}),
			...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
			...(config.searchEndpoint ? { searchEndpoint: config.searchEndpoint } : {}),
		});

		return useTableStore<T>({
			repository,
			sortMap: config.sortMap ?? {},
			...(config.filterMap ? { filterMap: config.filterMap } : {}),
			...(config.initialPagination ? { initialPagination: config.initialPagination } : {}),
			...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
			...(config.paramFormatting ? { paramFormatting: config.paramFormatting } : {}),
			...(config.paginationStyle ? { paginationStyle: config.paginationStyle } : {}),
			...(config.sortStyle ? { sortStyle: config.sortStyle } : {}),
			...(config.sortDirections ? { sortDirections: config.sortDirections } : {}),
		});
	};
}
