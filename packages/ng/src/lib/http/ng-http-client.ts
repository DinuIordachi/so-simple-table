import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { HttpQueryParams, IHttpClient, IHttpRequestOptions } from '@sst/core';

@Injectable({ providedIn: 'root' })
export class NgHttpClient implements IHttpClient {
	private readonly httpClient = inject(HttpClient);

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
