import type {HttpQueryParams, IResponse, IResponseList} from '../types';

export abstract class ListRepository<T> {
	public abstract getList(params?: HttpQueryParams): Promise<IResponseList<T[]>>;

	public abstract bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
}
