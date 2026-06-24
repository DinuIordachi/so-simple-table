import type { IHttpClient, IHttpRequestOptions } from '@sst/vue';

/**
 * Adapts So Simple Table's canonical query params to the DummyJSON Products API,
 * demonstrating the `httpClient` escape hatch for a non-canonical backend:
 *
 * - `page` → `skip` (offset), `pageSize` → `limit`
 * - `sortBy` + `order` (boolean from `orderByDescending`) → `sortBy` + `order=asc|desc`
 * - a non-empty `q` switches to the `/search` endpoint
 *
 * Read-only: only `get` is implemented (the table never writes).
 */
export class DummyJsonClient implements IHttpClient {
	public async get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		const params = (options?.params ?? {}) as Record<string, unknown>;
		const limit = Number(params['limit'] ?? 10);
		const page = Number(params['page'] ?? 1);

		const query = new URLSearchParams();
		query.set('limit', String(limit));
		query.set('skip', String((page - 1) * limit));
		query.set('select', 'title,brand,category,price,rating,stock');

		if (params['sortBy'] !== undefined) {
			query.set('sortBy', String(params['sortBy']));
			query.set('order', params['order'] === true ? 'desc' : 'asc');
		}

		const q = params['q'];
		let endpoint = url;
		if (typeof q === 'string' && q.length > 0) {
			endpoint = `${url}/search`;
			query.set('q', q);
		}

		const response = await fetch(`${endpoint}?${query.toString()}`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText} for ${endpoint}`);
		}
		return (await response.json()) as T;
	}

	public post<T>(): Promise<T> {
		return Promise.reject(new Error('DummyJsonClient is read-only'));
	}

	public put<T>(): Promise<T> {
		return Promise.reject(new Error('DummyJsonClient is read-only'));
	}

	public delete<T>(): Promise<T> {
		return Promise.reject(new Error('DummyJsonClient is read-only'));
	}
}
