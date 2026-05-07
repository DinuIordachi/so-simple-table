import { Injectable, inject } from '@angular/core';
import {
	ListRepository,
	type HttpQueryParams,
	type IHttpClient,
	type IRepositoryQueryKeys,
	type IResponse,
	type IResponseList,
	type ResponseListMapper,
} from '@sst/core';
import { NgHttpClient } from '../http/ng-http-client';

/**
 * Angular-flavored base for list-only repositories.
 * Subclasses must override `baseUrl`. `queryKeys` and `responseListMapper`
 * may be overridden as getters when an API differs from the defaults.
 *
 * Why this extends `ListRepository<T>` directly instead of `HttpListRepository<T>`:
 * the core `HttpListRepository` validates `baseUrl` in its constructor. Under Angular DI
 * the subclass's `get baseUrl()` getter is not bound when the parent constructor runs,
 * so we'd have to pass a sentinel and skip validation. It's simpler to extend
 * `ListRepository<T>` directly and read `this.baseUrl` on every call —
 * `requireBaseUrl()` does the validation lazily.
 */
@Injectable()
export abstract class SstNgListRepository<T> extends ListRepository<T> {
	protected readonly httpClient: IHttpClient = inject(NgHttpClient);

	/** Required. Subclasses must override. */
	protected abstract get baseUrl(): string;

	/** Optional. Override to customize the four query keys (consumed by the table store). */
	protected get queryKeys(): Partial<IRepositoryQueryKeys> | undefined {
		return undefined;
	}

	/** Optional. Override to remap a non-canonical API response shape. */
	protected get responseListMapper(): ResponseListMapper<T> | undefined {
		return undefined;
	}

	public override getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const url = this.requireBaseUrl();
		const mapper = this.responseListMapper ?? ((r) => r as IResponseList<T[]>);
		return this.httpClient.get<unknown>(url, params ? { params } : undefined).then(mapper);
	}

	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.requireBaseUrl()}/bulk_delete`, { body: [...ids] });
	}

	protected requireBaseUrl(): string {
		const url = this.baseUrl;
		if (!url) {
			throw new Error(`[${this.constructor.name}] baseUrl is required.`);
		}
		return url;
	}
}
