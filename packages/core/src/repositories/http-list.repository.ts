import { FetchHttpClient } from '../http/fetch-http-client';
import { ListRepository } from './list.repository';
import type {
	HttpQueryParams,
	IHttpClient,
	IRepositoryConfig,
	IResponse,
	IResponseList,
	ResponseListMapper,
} from '../types';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';

/**
 * HTTP-backed {@link ListRepository}: fetches list pages from `baseUrl` and
 * bulk-deletes via `POST`/`DELETE` against a `bulk_delete` sub-resource.
 *
 * @remarks
 * The base of the HTTP repository family; {@link HttpSelectRepository} and
 * {@link HttpRepository} extend it with reads and full CRUD. Configure the
 * transport, query keys, and response shaping through {@link IRepositoryConfig}.
 *
 * @typeParam T - Row type.
 */
export class HttpListRepository<T> extends ListRepository<T> {
	/** Base URL all requests are issued against. */
	protected readonly baseUrl: string;
	/** Transport used for requests; the configured client or a default {@link FetchHttpClient}. */
	protected readonly httpClient: IHttpClient;
	/** Maps a raw list payload into an {@link IResponseList}; identity by default. */
	protected readonly responseListMapper: ResponseListMapper<T>;
	/** When set, list requests with an active search route to `` `${baseUrl}${searchEndpoint}` ``. */
	protected readonly searchEndpoint: string | undefined;
	/** Resolved query key carrying the search term; used to detect an active search. */
	private readonly searchKey: string;

	/**
	 * @param config - Repository configuration; {@link IRepositoryConfig.baseUrl} is required.
	 * @throws Error if `config.baseUrl` is empty.
	 */
	public constructor(config: IRepositoryConfig<T>) {
		super();
		if (!config.baseUrl) {
			throw new Error('[HttpListRepository] config.baseUrl is required.');
		}
		this.baseUrl = config.baseUrl;
		this.httpClient = config.httpClient ?? new FetchHttpClient();
		this.responseListMapper = config.responseListMapper ?? ((raw) => raw as IResponseList<T[]>);
		this.searchEndpoint = config.searchEndpoint;
		this.searchKey = { ...DEFAULT_QUERY_KEYS, ...config.queryKeys }.search;
	}

	/**
	 * Fetches a page and normalizes it through
	 * {@link HttpListRepository.responseListMapper}. When `searchEndpoint` is
	 * configured and the search param is present, routes to that sub-endpoint.
	 */
	public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const url =
			this.searchEndpoint !== undefined && params !== undefined && this.isSearchActive(params)
				? `${this.baseUrl}${this.searchEndpoint}`
				: this.baseUrl;
		const raw = await this.httpClient.get<unknown>(url, params ? { params } : undefined);
		return this.responseListMapper(raw);
	}

	private isSearchActive(params: HttpQueryParams): boolean {
		const value = params[this.searchKey];
		return value !== undefined && value !== null && value !== '';
	}

	/** Deletes the given ids via `DELETE {baseUrl}/bulk_delete` with the ids as the body. */
	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.baseUrl}/bulk_delete`, { body: [...ids] });
	}
}
