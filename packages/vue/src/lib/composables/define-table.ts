import {
	FetchHttpClient,
	HttpListRepository,
	type IHttpClient,
	type IPaginationParams,
	type IParamFormattingStrategy,
	type IRepositoryQueryKeys,
	type IResponseList,
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
}

/**
 * Declarative table definition for Vue. Returns a `useTable()` composable that,
 * when called inside `setup`, builds the repository + store and auto-disposes
 * it on scope teardown.
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
		});

		return useTableStore<T>({
			repository,
			sortMap: config.sortMap ?? {},
			...(config.filterMap ? { filterMap: config.filterMap } : {}),
			...(config.initialPagination ? { initialPagination: config.initialPagination } : {}),
			...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
			...(config.paramFormatting ? { paramFormatting: config.paramFormatting } : {}),
		});
	};
}
