import { Injectable } from '@angular/core';
import type { HttpQueryParams, IPaginationParams, IResponse, IResponseList } from '@sst/core';
import { SstNgListRepository } from './sst-ng-list.repository';

@Injectable()
export abstract class SstNgSelectRepository<T> extends SstNgListRepository<T> {
	public get(id: string): Promise<IResponse<T>> {
		const encoded = encodeURIComponent(encodeURIComponent(id));
		return this.httpClient.get<IResponse<T>>(`${this.requireBaseUrl()}/${encoded}`);
	}

	public getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>> {
		const params: HttpQueryParams = { ids: [...ids] };
		if (pagination) {
			params.page = pagination.page;
			params.pageSize = pagination.pageSize;
		}
		return this.getList(params);
	}
}
