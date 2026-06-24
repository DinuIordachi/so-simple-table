import type { HttpQueryParams, IHttpClient, IHttpRequestOptions } from '../types';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Construction options for {@link FetchHttpClient}.
 */
export interface IFetchHttpClientOptions {
	/** Headers merged into every request; per-request headers take precedence. */
	readonly baseHeaders?: Record<string, string>;
}

/**
 * Default {@link IHttpClient} backed by the global `fetch` API.
 *
 * @remarks
 * Serializes request bodies as JSON (defaulting the `content-type` header to
 * `application/json` when a body is present), expands array query params into
 * repeated keys, and parses responses as JSON when the `content-type` is JSON
 * (including `+json` suffixes) or as text otherwise. A `204 No Content`
 * response resolves to `null`.
 *
 * @example
 * ```ts
 * const http = new FetchHttpClient({ baseHeaders: { authorization: 'Bearer token' } });
 * const users = await http.get<User[]>('https://api.example.com/users', {
 * 	params: { page: 1, pageSize: 20 },
 * });
 * ```
 */
export class FetchHttpClient implements IHttpClient {
	/**
	 * @param options - Client-level options such as default headers.
	 */
	public constructor(private readonly options: IFetchHttpClientOptions = {}) {}

	/**
	 * Performs a `GET` request.
	 *
	 * @throws Error if the response status is not in the 2xx range.
	 */
	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('GET', url, options);
	}

	/**
	 * Performs a `POST` request.
	 *
	 * @throws Error if the response status is not in the 2xx range.
	 */
	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('POST', url, options);
	}

	/**
	 * Performs a `PUT` request.
	 *
	 * @throws Error if the response status is not in the 2xx range.
	 */
	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('PUT', url, options);
	}

	/**
	 * Performs a `DELETE` request.
	 *
	 * @throws Error if the response status is not in the 2xx range.
	 */
	public delete<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('DELETE', url, options);
	}

	private async request<T>(method: Method, url: string, options: IHttpRequestOptions = {}): Promise<T> {
		const fullUrl = this.appendQueryString(url, options.params);
		const headers: Record<string, string> = { ...(this.options.baseHeaders ?? {}), ...(options.headers ?? {}) };
		const init: RequestInit = {
			method,
			headers,
			...(options.signal !== undefined ? { signal: options.signal } : {}),
		};
		if (options.body !== undefined) {
			init.body = JSON.stringify(options.body);
			if (!('content-type' in headers) && !('Content-Type' in headers)) {
				headers['content-type'] = 'application/json';
			}
		}
		const response = await fetch(fullUrl, init);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText} for ${method} ${fullUrl}`);
		}
		if (response.status === 204) {
			return null as T;
		}
		const contentType = response.headers.get('content-type') ?? '';
		if (this.isJsonContentType(contentType)) {
			return (await response.json()) as T;
		}
		return (await response.text()) as unknown as T;
	}

	/**
	 * Treats `application/json` and any structured-syntax `+json` suffix
	 * (RFC 6839) — e.g. `application/vnd.api+json` (JSON:API),
	 * `application/hal+json`, `application/problem+json` — as JSON.
	 */
	private isJsonContentType(contentType: string): boolean {
		const mediaType = (contentType.split(';')[0] ?? '').trim().toLowerCase();
		return mediaType === 'application/json' || mediaType.endsWith('+json');
	}

	private appendQueryString(url: string, params: HttpQueryParams | undefined): string {
		if (!params) {
			return url;
		}
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) continue;
			if (Array.isArray(value)) {
				for (const v of value) search.append(key, String(v));
			} else {
				search.append(key, String(value));
			}
		}
		const qs = search.toString();
		if (!qs) {
			return url;
		}
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}${qs}`;
	}
}
