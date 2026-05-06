import {HttpListRepository} from './http-list.repository';
import {SelectRepository} from './select.repository';
import type {HttpQueryParams, IPaginationParams, IResponse, IResponseList} from '../types';

export class HttpSelectRepository<T> extends HttpListRepository<T> implements SelectRepository<T> {
	public get(id: string): Promise<IResponse<T>> {
		// Double-encode mirrors the legacy `encodeURIComponent(encodeURIComponent(id))` behavior.
		const encoded = encodeURIComponent(encodeURIComponent(id));
		return this.httpClient.get<IResponse<T>>(`${this.baseUrl}/${encoded}`);
	}

	public async getListByIdList(
		ids: readonly string[],
		pagination?: IPaginationParams,
	): Promise<IResponseList<T[]>> {
		const params: HttpQueryParams = {ids: [...ids]};
		if (pagination) {
			params.page = pagination.page;
			params.pageSize = pagination.pageSize;
		}
		return this.getList(params);
	}
}
