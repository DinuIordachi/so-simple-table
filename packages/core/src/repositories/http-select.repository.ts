import { HttpListRepository } from './http-list.repository';
import { SelectRepository } from './select.repository';
import type { HttpQueryParams, IPaginationParams, IResponse, IResponseList } from '../types';

/**
 * HTTP-backed {@link SelectRepository}: adds single-row and id-list reads on top
 * of {@link HttpListRepository}.
 *
 * @typeParam T - Row type.
 */
export class HttpSelectRepository<T> extends HttpListRepository<T> implements SelectRepository<T> {
	/**
	 * Fetches a single row via `GET {baseUrl}/{id}`.
	 *
	 * @remarks
	 * The id is double-encoded with `encodeURIComponent`, mirroring legacy
	 * behavior so ids containing reserved characters survive proxies that decode
	 * the path once.
	 */
	public get(id: string): Promise<IResponse<T>> {
		// Double-encode mirrors the legacy `encodeURIComponent(encodeURIComponent(id))` behavior.
		const encoded = encodeURIComponent(encodeURIComponent(id));
		return this.httpClient.get<IResponse<T>>(`${this.baseUrl}/${encoded}`);
	}

	/**
	 * Fetches the rows for the given ids by issuing a list request with an `ids`
	 * query param, adding `page`/`pageSize` when `pagination` is provided.
	 */
	public async getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>> {
		const params: HttpQueryParams = { ids: [...ids] };
		if (pagination) {
			params.page = pagination.page;
			params.pageSize = pagination.pageSize;
		}
		return this.getList(params);
	}
}
