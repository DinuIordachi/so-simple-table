import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { HttpQueryParams, IHttpClient, IHttpRequestOptions } from '@bridgebyte/sst-core';

/**
 * Adapts Angular's {@link HttpClient} to the framework-agnostic {@link IHttpClient}
 * contract consumed by `@bridgebyte/sst-core` repositories.
 *
 * @remarks
 * Each verb resolves the Angular `Observable` to a `Promise` via `firstValueFrom`,
 * returning the parsed JSON response body. The `@bridgebyte/sst-ng` repositories inject this
 * client by default, so registering it (as a root-provided service it requires no
 * manual provider wiring beyond `provideHttpClient`) is normally the only setup needed.
 *
 * Query parameters from {@link IHttpRequestOptions.params} are translated to Angular
 * `HttpParams`; `undefined` values are skipped and array values are appended once per
 * element. The `signal` field of {@link IHttpRequestOptions} is not forwarded.
 */
@Injectable({ providedIn: 'root' })
export class NgHttpClient implements IHttpClient {
	private readonly httpClient = inject(HttpClient);

	/**
	 * Issues an HTTP `GET` request and resolves with the parsed JSON body.
	 *
	 * @typeParam T - Expected shape of the response body.
	 * @param url - Absolute or app-relative request URL.
	 * @param options - Optional query params and headers.
	 * @returns A promise resolving to the response body.
	 */
	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		const built = this.buildOptions(options);
		return firstValueFrom(
			this.httpClient.get<T>(url, {
				observe: 'body',
				responseType: 'json',
				...built,
			}),
		);
	}

	/**
	 * Issues an HTTP `POST` request and resolves with the parsed JSON body.
	 *
	 * @typeParam T - Expected shape of the response body.
	 * @param url - Absolute or app-relative request URL.
	 * @param options - Optional request body, query params, and headers. The
	 * {@link IHttpRequestOptions.body} is sent as the payload (`null` when omitted).
	 * @returns A promise resolving to the response body.
	 */
	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		const built = this.buildOptions(options);
		return firstValueFrom(
			this.httpClient.post<T>(url, options?.body ?? null, {
				observe: 'body',
				responseType: 'json',
				...built,
			}),
		);
	}

	/**
	 * Issues an HTTP `PUT` request and resolves with the parsed JSON body.
	 *
	 * @typeParam T - Expected shape of the response body.
	 * @param url - Absolute or app-relative request URL.
	 * @param options - Optional request body, query params, and headers. The
	 * {@link IHttpRequestOptions.body} is sent as the payload (`null` when omitted).
	 * @returns A promise resolving to the response body.
	 */
	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		const built = this.buildOptions(options);
		return firstValueFrom(
			this.httpClient.put<T>(url, options?.body ?? null, {
				observe: 'body',
				responseType: 'json',
				...built,
			}),
		);
	}

	/**
	 * Issues an HTTP `DELETE` request and resolves with the parsed JSON body.
	 *
	 * @remarks
	 * Sent via `HttpClient.request('DELETE', …)` so that an optional request body
	 * (e.g. a list of ids for bulk deletion) can be included, which the shorthand
	 * `HttpClient.delete` does not support cleanly.
	 *
	 * @typeParam T - Expected shape of the response body.
	 * @param url - Absolute or app-relative request URL.
	 * @param options - Optional request body, query params, and headers.
	 * @returns A promise resolving to the response body.
	 */
	public delete<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		const built = this.buildOptions(options);
		return firstValueFrom(
			this.httpClient.request<T>('DELETE', url, {
				observe: 'body',
				responseType: 'json',
				body: options?.body,
				...built,
			}),
		);
	}

	private buildOptions(options: IHttpRequestOptions | undefined): {
		params?: HttpParams;
		headers?: Record<string, string>;
	} {
		const result: { params?: HttpParams; headers?: Record<string, string> } = {};
		const params = this.buildParams(options?.params);
		if (params !== undefined) result.params = params;
		if (options?.headers !== undefined) result.headers = options.headers;
		return result;
	}

	private buildParams(params: HttpQueryParams | undefined): HttpParams | undefined {
		if (!params) return undefined;
		let result = new HttpParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) continue;
			if (Array.isArray(value)) {
				for (const v of value) result = result.append(key, String(v));
			} else {
				result = result.append(key, String(value));
			}
		}
		return result;
	}
}
