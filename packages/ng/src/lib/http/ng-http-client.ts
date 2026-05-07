import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { HttpQueryParams, IHttpClient, IHttpRequestOptions } from '@sst/core';

@Injectable({ providedIn: 'root' })
export class NgHttpClient implements IHttpClient {
	private readonly httpClient = inject(HttpClient);

	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.get<T>(url, {
				params: this.buildParams(options?.params),
				headers: options?.headers,
			}),
		);
	}

	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.post<T>(url, options?.body ?? null, {
				params: this.buildParams(options?.params),
				headers: options?.headers,
			}),
		);
	}

	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.put<T>(url, options?.body ?? null, {
				params: this.buildParams(options?.params),
				headers: options?.headers,
			}),
		);
	}

	public delete<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.request<T>('DELETE', url, {
				body: options?.body,
				params: this.buildParams(options?.params),
				headers: options?.headers,
				responseType: 'json',
			}),
		);
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
