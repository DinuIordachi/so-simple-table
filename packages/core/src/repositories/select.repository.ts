import {ListRepository} from './list.repository';
import type {IPaginationParams, IResponse, IResponseList} from '../types';

export abstract class SelectRepository<T> extends ListRepository<T> {
	public abstract get(id: string): Promise<IResponse<T>>;

	public abstract getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>>;
}
