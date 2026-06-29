import {
	FetchHttpClient,
	HttpListRepository,
	type IHttpClient,
	type IPaginationParams,
	type IParamFormattingStrategy,
	type IRepositoryQueryKeys,
	type IResponseList,
	type ISortDirections,
	type ITableFetchState,
	type PaginationStyle,
	type SortStyle,
} from '@bridgebyte/sst-core';
import { useTableStore, type IUseTableStoreReturn } from './use-table-store';

/** Options shared by both the HTTP and custom-fetch table definitions. */
export interface IDefineTableCommon {
	/** Initial pagination. Default `{ page: 1, pageSize: 10 }`. */
	readonly initialPagination?: IPaginationParams;
	/**
	 * Handle a fetch rejection (e.g. show a toast). When omitted, the store
	 * logs the error and never leaves it as an unhandled rejection.
	 */
	readonly catchError?: (error: unknown) => void;
}

/**
 * HTTP-backed table definition: the store builds requests from `baseUrl` and
 * the param-mapping options, fetching through a {@link HttpListRepository}.
 */
export interface IDefineTableHttpConfig<T extends { id: string | number }, TRaw = unknown> extends IDefineTableCommon {
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
	/** Not available on the HTTP path — use the custom-fetch definition instead. */
	readonly fetchData?: never;
	/** Not available on the HTTP path — use the custom-fetch definition instead. */
	readonly deleteRows?: never;
}

/**
 * Custom-fetch table definition: you own how data is loaded. `fetchData`
 * receives the raw {@link ITableFetchState} and returns the page; the built-in
 * HTTP path and its param-mapping options are bypassed entirely.
 */
export interface IDefineTableFetchConfig<T extends { id: string | number }> extends IDefineTableCommon {
	/** Load a page from the raw table state. Returns the rows and the total count. */
	readonly fetchData: (state: ITableFetchState) => Promise<{ data: T[]; total: number }>;
	/** Optional bulk-delete handler, enabling `removeSelected`/`bulkDelete` on this table. */
	readonly deleteRows?: (ids: readonly string[]) => Promise<unknown>;
	/** Not used on the custom-fetch path. */
	readonly baseUrl?: never;
}

/**
 * Declarative table configuration: either {@link IDefineTableHttpConfig | HTTP}
 * (provide `baseUrl`) or {@link IDefineTableFetchConfig | custom fetch} (provide
 * `fetchData`) — the two are mutually exclusive.
 */
export type IDefineTableConfig<T extends { id: string | number }, TRaw = unknown> =
	| IDefineTableHttpConfig<T, TRaw>
	| IDefineTableFetchConfig<T>;

/**
 * Declarative table definition for Vue. Returns a `useTable()` composable that,
 * when called inside `setup`, builds the data source + store and auto-disposes
 * it on scope teardown.
 *
 * @typeParam T - Row/entity type; must carry a string or number `id`.
 * @typeParam TRaw - Shape of the raw API payload, when a {@link IDefineTableHttpConfig.mapResponse | mapResponse} mapper is supplied.
 * @param config - Declarative configuration; HTTP (`baseUrl`) or custom (`fetchData`).
 * @returns A `useTable()` composable yielding a {@link IUseTableStoreReturn}.
 *
 * @remarks
 * The returned `useTable()` composable must be called synchronously inside a
 * component `setup` or other active effect scope, since the store is disposed
 * on scope teardown.
 *
 * @example
 * ```ts
 * // HTTP path — users-table.ts
 * import { defineTable } from '@bridgebyte/sst-vue';
 *
 * export const useUsersTable = defineTable<{ id: string; name: string }>({
 * 	baseUrl: 'https://api.example.com/users',
 * 	initialPagination: { page: 1, pageSize: 25 },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Custom-fetch path — own the request entirely
 * export const useUsersTable = defineTable<User>({
 * 	fetchData: async ({ pagination, sort, filters, search }) => {
 * 		const res = await myApi.users({ page: pagination.page, size: pagination.pageSize, q: search });
 * 		return { data: res.items, total: res.count };
 * 	},
 * 	deleteRows: (ids) => myApi.deleteUsers(ids),
 * 	catchError: (error) => toast.error(String(error)),
 * });
 * ```
 */
export function defineTable<T extends { id: string | number }, TRaw = unknown>(
	config: IDefineTableConfig<T, TRaw>,
): () => IUseTableStoreReturn<T> {
	return function useTable(): IUseTableStoreReturn<T> {
		if (config.fetchData) {
			const userFetch = config.fetchData;
			const userDelete = config.deleteRows;
			return useTableStore<T>({
				sortMap: {},
				fetchData: (state): Promise<IResponseList<T[]>> =>
					userFetch(state).then((r) => ({ result: r.data, totalCount: r.total, isSuccess: true })),
				...(userDelete
					? {
							deleteRows: (ids: readonly string[]) =>
								userDelete(ids).then(() => ({ result: '', isSuccess: true })),
						}
					: {}),
				...(config.catchError ? { catchError: config.catchError } : {}),
				...(config.initialPagination ? { initialPagination: config.initialPagination } : {}),
			});
		}

		const { mapResponse } = config;
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
			...(config.catchError ? { catchError: config.catchError } : {}),
		});
	};
}
