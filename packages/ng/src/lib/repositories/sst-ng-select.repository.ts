import { Injectable } from '@angular/core';
import type { HttpQueryParams, IPaginationParams, IResponse, IResponseList } from '@bridgebyte/sst-core';
import { SstNgListRepository } from './sst-ng-list.repository';

/**
 * Extends {@link SstNgListRepository} with single-entity and id-list reads, for
 * scenarios that need lookups but not mutations.
 *
 * @remarks
 * Inherits the same override contract as its base: subclasses must override
 * {@link SstNgListRepository.baseUrl | baseUrl} (and optionally `queryKeys` /
 * `responseListMapper`).
 *
 * @typeParam T - The entity type managed by this repository.
 *
 * @see {@link SstNgRepository} for the full create/read/update/delete surface.
 */
@Injectable()
export abstract class SstNgSelectRepository<T> extends SstNgListRepository<T> {
	/**
	 * Fetches a single entity by id from `GET {baseUrl}/{id}`.
	 *
	 * @remarks
	 * The id is double-encoded with `encodeURIComponent` so that values containing
	 * already-encoded characters (e.g. a percent sign, or a slash within a composite
	 * key) survive intermediaries that decode the path segment once before routing.
	 *
	 * @param id - Identifier of the entity to fetch.
	 * @returns A promise resolving to the single-entity response.
	 * @throws Error if `baseUrl` is empty.
	 */
	public get(id: string): Promise<IResponse<T>> {
		const encoded = encodeURIComponent(encodeURIComponent(id));
		return this.httpClient.get<IResponse<T>>(`${this.requireBaseUrl()}/${encoded}`);
	}

	/**
	 * Fetches the subset of entities whose ids are in `ids`, with optional pagination.
	 *
	 * @remarks
	 * Delegates to {@link SstNgListRepository.getList} with an `ids` query parameter (and
	 * `page`/`pageSize` when `pagination` is supplied), so the same response mapping and
	 * URL apply.
	 *
	 * @param ids - The ids to retrieve.
	 * @param pagination - Optional page and page-size constraints.
	 * @returns A promise resolving to the matching list response.
	 * @throws Error if `baseUrl` is empty.
	 */
	public getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>> {
		const params: HttpQueryParams = { ids: [...ids] };
		if (pagination) {
			params.page = pagination.page;
			params.pageSize = pagination.pageSize;
		}
		return this.getList(params);
	}
}
