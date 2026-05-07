import {
	HttpListRepository,
	type HttpQueryParams,
	type IHttpClient,
	type IHttpRequestOptions,
	type IResponseList,
} from '@sst/vue';

export interface IBreed {
	id: string;
	name: string;
	description: string;
	hypoallergenic: boolean;
	lifeMin: number;
	lifeMax: number;
}

interface IDogApiResponse {
	data: ReadonlyArray<{
		id: string;
		type: 'breed';
		attributes: {
			name: string;
			description: string;
			hypoallergenic: boolean;
			life: { min: number; max: number };
		};
	}>;
	meta: { pagination: { records: number } };
}

const buildUrl = (url: string, params: Record<string, unknown> | undefined): string => {
	if (!params) return url;
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
	return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
};

export const callLog: string[] = [];
export const callLogListeners = new Set<() => void>();
const notify = (): void => callLogListeners.forEach((cb) => cb());

class JsonApiHttpClient implements IHttpClient {
	private async request<T>(method: string, url: string, options?: IHttpRequestOptions): Promise<T> {
		const fullUrl = buildUrl(url, options?.params as Record<string, unknown> | undefined);
		callLog.push(`${method} ${url}${options?.params ? `  params=${JSON.stringify(options.params)}` : ''}`);
		notify();
		const init: RequestInit = { method, headers: { Accept: 'application/vnd.api+json', ...(options?.headers ?? {}) } };
		if (options?.body !== undefined) {
			init.body = JSON.stringify(options.body);
			(init.headers as Record<string, string>)['Content-Type'] = 'application/vnd.api+json';
		}
		const response = await fetch(fullUrl, init);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText} for ${method} ${fullUrl}`);
		}
		if (response.status === 204) return null as T;
		return (await response.json()) as T;
	}
	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> { return this.request<T>('GET', url, options); }
	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> { return this.request<T>('POST', url, options); }
	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> { return this.request<T>('PUT', url, options); }
	public delete<T>(url: string, options?: IHttpRequestOptions): Promise<T> { return this.request<T>('DELETE', url, options); }
}

const responseListMapper = (raw: unknown): IResponseList<IBreed[]> => {
	const r = raw as IDogApiResponse;
	const result: IBreed[] = r.data.map((b) => ({
		id: b.id,
		name: b.attributes.name,
		description: b.attributes.description,
		hypoallergenic: b.attributes.hypoallergenic,
		lifeMin: b.attributes.life.min,
		lifeMax: b.attributes.life.max,
	}));
	return { result, totalCount: r.meta.pagination.records, isSuccess: true };
};

export class BreedRepository extends HttpListRepository<IBreed> {
	public override async getList(params?: HttpQueryParams): Promise<IResponseList<IBreed[]>> {
		// Strip orderBy / orderByDescending — dogapi doesn't accept them and would 400.
		const sanitized: HttpQueryParams = {};
		for (const [key, value] of Object.entries(params ?? {})) {
			if (key === 'orderBy' || key === 'orderByDescending' || key === 'name') continue;
			sanitized[key] = value;
		}
		return super.getList(sanitized);
	}
}

export const breedRepository = new BreedRepository({
	baseUrl: 'https://dogapi.dog/api/v2/breeds',
	httpClient: new JsonApiHttpClient(),
	responseListMapper,
});
