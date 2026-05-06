import { ListRepository } from './list.repository';
import type { IPaginationParams } from '../types/pagination';
import type { IResponse, IResponseList } from '../types/response';

export abstract class SelectRepository<T> extends ListRepository<T> {
	public abstract get(id: string): Promise<IResponse<T>>;
	public abstract getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>>;
}
