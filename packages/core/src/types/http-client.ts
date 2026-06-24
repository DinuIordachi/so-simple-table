/**
 * Query parameters serialized onto a request URL.
 *
 * @remarks
 * Array values are expanded into repeated `key=value` pairs and `undefined`
 * values are skipped (see {@link FetchHttpClient}).
 */
export type HttpQueryParams = Record<
	string,
	string | number | boolean | ReadonlyArray<string | number | boolean> | undefined
>;

/**
 * Per-request options accepted by every {@link IHttpClient} method.
 */
export interface IHttpRequestOptions {
	/** Query parameters appended to the request URL. */
	readonly params?: HttpQueryParams;
	/** Additional request headers, merged over any client-level defaults. */
	readonly headers?: Record<string, string>;
	/** Request payload; JSON-serialized by {@link FetchHttpClient}. */
	readonly body?: unknown;
	/** Signal used to cancel the request. */
	readonly signal?: AbortSignal;
}

/**
 * Transport abstraction used by the HTTP repositories.
 *
 * @remarks
 * Each method resolves with the parsed response body typed as `T`. Provide a
 * custom implementation (e.g. wrapping Axios or adding auth) via
 * {@link IRepositoryConfig.httpClient}; {@link FetchHttpClient} is the default.
 */
export interface IHttpClient {
	/** Performs a `GET` request and resolves with the parsed body. */
	get<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	/** Performs a `POST` request and resolves with the parsed body. */
	post<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	/** Performs a `PUT` request and resolves with the parsed body. */
	put<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	/** Performs a `DELETE` request and resolves with the parsed body. */
	delete<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
}
