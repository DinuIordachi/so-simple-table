import {FetchHttpClient} from '../http/fetch-http-client';
import {ListRepository} from './list.repository';
import type {
	HttpQueryParams,
	IHttpClient,
	IRepositoryConfig,
	IResponse,
	IResponseList,
	ResponseListMapper
} from '../types';

export class HttpListRepository<T> extends ListRepository<T> {
	protected readonly baseUrl: string;
	protected readonly httpClient: IHttpClient;
	protected readonly responseListMapper: ResponseListMapper<T>;

	public constructor(config: IRepositoryConfig<T>) {
		super();
		if (!config.baseUrl) {
			throw new Error('[HttpListRepository] config.baseUrl is required.');
		}
		this.baseUrl = config.baseUrl;
		this.httpClient = config.httpClient ?? new FetchHttpClient();
		this.responseListMapper = config.responseListMapper ?? ((raw) => raw as IResponseList<T[]>);
	}

	public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const raw = await this.httpClient.get<unknown>(this.baseUrl, params ? {params} : undefined);
		return this.responseListMapper(raw);
	}

	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.baseUrl}/bulk_delete`, {body: [...ids]});
	}
}
