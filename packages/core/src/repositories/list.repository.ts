import type { HttpQueryParams } from '../types/http-client';
import type { IResponse, IResponseList } from '../types/response';

export abstract class ListRepository<T> {
	public abstract getList(params?: HttpQueryParams): Promise<IResponseList<T[]>>;
	public abstract bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
}
