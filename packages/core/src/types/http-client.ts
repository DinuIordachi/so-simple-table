export type HttpQueryParams = Record<string, string | number | boolean | ReadonlyArray<string | number | boolean> | undefined>;

export interface IHttpRequestOptions {
	readonly params?: HttpQueryParams;
	readonly headers?: Record<string, string>;
	readonly body?: unknown;
	readonly signal?: AbortSignal;
}

export interface IHttpClient {
	get<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	post<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	put<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	delete<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
}
