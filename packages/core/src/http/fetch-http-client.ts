import type { HttpQueryParams, IHttpClient, IHttpRequestOptions } from '../types';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface IFetchHttpClientOptions {
	readonly baseHeaders?: Record<string, string>;
}

export class FetchHttpClient implements IHttpClient {
	public constructor(private readonly options: IFetchHttpClientOptions = {}) {}

	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('GET', url, options);
	}

	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('POST', url, options);
	}

	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('PUT', url, options);
	}

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
