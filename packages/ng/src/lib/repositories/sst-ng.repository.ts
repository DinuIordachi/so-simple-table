import { Injectable } from '@angular/core';
import type { IResponse } from '@bridgebyte/sst-core';
import { SstNgSelectRepository } from './sst-ng-select.repository';

/**
 * Full CRUD repository: the complete create / read / update / delete surface over a
 * single REST resource, layered on top of {@link SstNgSelectRepository}'s reads and
 * {@link SstNgListRepository}'s list operations.
 *
 * @remarks
 * This is the primary repository entry point for Angular consumers. Extend it, mark it
 * `@Injectable`, and override the {@link SstNgListRepository.baseUrl | baseUrl} getter
 * (and optionally `queryKeys` / `responseListMapper`) to bind it to an endpoint. The
 * instance is then passed to a {@link SstTableService} as `options.repository`.
 *
 * @typeParam T - The entity type managed by this repository.
 *
 * @example
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class UsersRepository extends SstNgRepository<User> {
 *   protected get baseUrl(): string {
 *     return 'https://api.example.com/users';
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class SstNgRepository<T> extends SstNgSelectRepository<T> {
	/**
	 * Creates a new entity via `POST {baseUrl}` with `dto` as the request body.
	 *
	 * @param dto - The payload describing the entity to create.
	 * @returns A promise resolving to the server response.
	 * @throws Error if `baseUrl` is empty.
	 */
	public create(dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.post<IResponse<unknown>>(this.requireBaseUrl(), { body: dto });
	}

	/**
	 * Updates an existing entity via `PUT {baseUrl}/{id}` with `dto` as the request body.
	 *
	 * @param id - Identifier of the entity to update.
	 * @param dto - The payload describing the new state of the entity.
	 * @returns A promise resolving to the server response.
	 * @throws Error if `baseUrl` is empty.
	 */
	public update(id: string, dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.put<IResponse<unknown>>(`${this.requireBaseUrl()}/${id}`, { body: dto });
	}

	/**
	 * Deletes an entity via `DELETE {baseUrl}/{id}`, or the entire collection via
	 * `DELETE {baseUrl}` when `id` is omitted.
	 *
	 * @param id - Identifier of the entity to delete; omit to target the collection root.
	 * @returns A promise resolving to the server response.
	 * @throws Error if `baseUrl` is empty.
	 */
	public delete(id?: string): Promise<IResponse<unknown>> {
		const url = id !== undefined ? `${this.requireBaseUrl()}/${id}` : this.requireBaseUrl();
		return this.httpClient.delete<IResponse<unknown>>(url);
	}

	/**
	 * Duplicates an entity via `POST {baseUrl}/{id}/duplication` with an empty body.
	 *
	 * @param id - Identifier of the entity to duplicate.
	 * @returns A promise resolving to the server response (typically the new id).
	 * @throws Error if `baseUrl` is empty.
	 */
	public duplicate(id: string): Promise<IResponse<string>> {
		return this.httpClient.post<IResponse<string>>(`${this.requireBaseUrl()}/${id}/duplication`, { body: {} });
	}
}
