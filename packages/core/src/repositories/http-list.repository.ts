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
	}

	/**
	 * Fetches a page from `baseUrl` and normalizes it through
	 * {@link HttpListRepository.responseListMapper}.
	 */
	public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const raw = await this.httpClient.get<unknown>(this.baseUrl, params ? { params } : undefined);
		return this.responseListMapper(raw);
	}

	/** Deletes the given ids via `DELETE {baseUrl}/bulk_delete` with the ids as the body. */
	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.baseUrl}/bulk_delete`, { body: [...ids] });
	}
}
