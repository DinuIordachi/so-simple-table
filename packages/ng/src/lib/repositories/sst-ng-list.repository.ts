import { Injectable, inject } from '@angular/core';
import {
	ListRepository,
	type HttpQueryParams,
	type IHttpClient,
	type IRepositoryQueryKeys,
	type IResponse,
	type IResponseList,
	type ResponseListMapper,
} from '@bridgebyte/sst-core';
import { NgHttpClient } from '../http/ng-http-client';

/**
 * Angular-flavored abstract base for list-only repositories: read a collection and
 * bulk-delete by id. Inject-and-extend rather than instantiate directly.
 *
 * @remarks
 * Subclasses must override the {@link SstNgListRepository.baseUrl | baseUrl} getter.
 * The {@link SstNgListRepository.queryKeys | queryKeys} and
 * {@link SstNgListRepository.responseListMapper | responseListMapper} getters may be
 * overridden when the target API differs from the defaults.
 *
 * **Why this extends `ListRepository<T>` directly instead of `HttpListRepository<T>`:**
 * the core `HttpListRepository` validates `baseUrl` in its constructor. Under Angular DI
 * the subclass's `get baseUrl()` getter is not bound when the parent constructor runs,
 * so we'd have to pass a sentinel and skip validation. It's simpler to extend
 * `ListRepository<T>` directly and read `this.baseUrl` on every call —
 * {@link SstNgListRepository.requireBaseUrl | requireBaseUrl} does the validation lazily.
 *
 * @typeParam T - The entity type returned by the list endpoint.
 *
 * @see {@link SstNgSelectRepository} for adding single-item reads.
 * @see {@link SstNgRepository} for the full create/read/update/delete surface.
 */
@Injectable()
export abstract class SstNgListRepository<T> extends ListRepository<T> {
	/**
	 * HTTP client used for every request, defaulting to {@link NgHttpClient}
	 * (the Angular `HttpClient` adapter) resolved through DI.
	 */
	protected readonly httpClient: IHttpClient = inject(NgHttpClient);

	/**
	 * Base URL for all of this repository's requests, e.g.
	 * `https://api.example.com/users`. **Required** — subclasses must override this
	 * getter. Read lazily on every call (see the class remarks), and validated to be
	 * non-empty by {@link SstNgListRepository.requireBaseUrl}.
	 */
	protected abstract get baseUrl(): string;

	/**
	 * Optional override for the outgoing query-parameter key names (page, pageSize,
	 * orderBy, orderByDescending, search) consumed by the table store. Returns
	 * `undefined` by default, meaning the core {@link DEFAULT_QUERY_KEYS} are used.
	 * Override to align with a non-default API contract; the returned partial is
	 * merged over the defaults.
	 */
	protected get queryKeys(): Partial<IRepositoryQueryKeys> | undefined {
		return undefined;
	}

	/**
	 * Optional override that maps a non-canonical API payload into the canonical
	 * {@link IResponseList} shape. Returns `undefined` by default, in which case the
	 * raw payload is assumed to already match `IResponseList<T[]>`.
	 */
	protected get responseListMapper(): ResponseListMapper<T> | undefined {
		return undefined;
	}

	/**
	 * Fetches the collection from {@link SstNgListRepository.baseUrl}, applying
	 * {@link SstNgListRepository.responseListMapper} (when provided) to the raw payload.
	 *
	 * @param params - Optional query parameters (pagination, sort, filters, search),
	 * typically assembled by the table store.
	 * @returns A promise resolving to the canonical list response.
	 * @throws Error if `baseUrl` is empty. See {@link SstNgListRepository.requireBaseUrl}.
	 */
	public override getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const url = this.requireBaseUrl();
		const mapper = this.responseListMapper ?? ((r) => r as IResponseList<T[]>);
		return this.httpClient.get<unknown>(url, params ? { params } : undefined).then(mapper);
	}

	/**
	 * Deletes multiple entities in a single request by issuing
	 * `DELETE {baseUrl}/bulk_delete` with the ids as the request body.
	 *
	 * @param ids - The ids of the entities to delete.
	 * @returns A promise resolving to the server response.
	 * @throws Error if `baseUrl` is empty. See {@link SstNgListRepository.requireBaseUrl}.
	 */
	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.requireBaseUrl()}/bulk_delete`, { body: [...ids] });
	}

	/**
	 * Reads and validates {@link SstNgListRepository.baseUrl}, returning it when set.
	 * Centralizes the lazy validation that the parent `ListRepository` does not perform.
	 *
	 * @returns The non-empty base URL.
	 * @throws Error if `baseUrl` is empty or otherwise falsy.
	 */
	protected requireBaseUrl(): string {
		const url = this.baseUrl;
		if (!url) {
			throw new Error(`[${this.constructor.name}] baseUrl is required.`);
		}
		return url;
	}
}
