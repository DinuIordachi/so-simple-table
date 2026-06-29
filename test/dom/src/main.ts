import * as sst from '@bridgebyte/sst-core';
import {
	HttpListRepository,
	type HttpQueryParams,
	type IHttpClient,
	type IHttpRequestOptions,
	type IResponseList,
	TableStore,
} from '@bridgebyte/sst-core';
import { mountTable, type IDomColumn } from '@bridgebyte/sst-dom';
import '@bridgebyte/sst-dom/style.css';

interface IBreed {
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

const $ = <T extends Element>(selector: string): T => {
	const el = document.querySelector<T>(selector);
	if (!el) {
		throw new Error(`element not found: ${selector}`);
	}
	return el;
};

// 1. Imported exports — confirms Verdaccio → npm install → Vite → browser bundle works.
const exportsList = $('#exports-list');
for (const name of Object.keys(sst).sort()) {
	const li = document.createElement('li');
	li.textContent = name;
	exportsList.appendChild(li);
}
$('#lib-version').textContent = `loaded ${Object.keys(sst).length} exports from @bridgebyte/sst-core`;

// 2. Wrap @bridgebyte/sst-core's FetchHttpClient so we can log every request as it goes out.
// (Helps demonstrate that pagination clicks actually hit the network.)
const callLog: string[] = [];
const renderCallLog = (): void => {
	$('#call-log').textContent = callLog.slice(-20).join('\n');
};

// Minimal IHttpClient — dogapi serves `application/vnd.api+json`, which @bridgebyte/sst-core's
// FetchHttpClient won't auto-parse (it checks for `application/json` specifically).
// Logs every outgoing request so the call log on the page reflects real network activity.
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

class JsonApiHttpClient implements IHttpClient {
	private async request<T>(method: string, url: string, options?: IHttpRequestOptions): Promise<T> {
		const fullUrl = buildUrl(url, options?.params as Record<string, unknown> | undefined);
		callLog.push(`${method} ${url}${options?.params ? `  params=${JSON.stringify(options.params)}` : ''}`);
		renderCallLog();
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

// dogapi.dog returns JSON:API: nested attributes, totalCount lives in meta.pagination.records.
// Flatten to a friendlier IBreed shape so columns can use simple keys.
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

class BreedRepository extends HttpListRepository<IBreed> {
	public override async getList(params?: HttpQueryParams): Promise<IResponseList<IBreed[]>> {
		// Strip orderBy / orderByDescending — dogapi doesn't accept them and would 400.
		const sanitized: HttpQueryParams = {};
		for (const [key, value] of Object.entries(params ?? {})) {
			if (key === 'orderBy' || key === 'orderByDescending' || key === 'name') {
				continue;
			}
			sanitized[key] = value;
		}
		return super.getList(sanitized);
	}
}

const repository = new BreedRepository({
	baseUrl: 'https://dogapi.dog/api/v2/breeds',
	httpClient: new JsonApiHttpClient(),
	responseListMapper,
});

const store = new TableStore<IBreed>({
	repository,
	sortMap: {}, // sorting not supported by dogapi
	initialPagination: { page: 1, pageSize: 10 },
	queryKeys: {
		page: 'page[number]',
		pageSize: 'page[size]',
	},
});

// Per-column render — colored hypoallergenic badge.
const yesNoBadge = (yes: boolean): HTMLElement => {
	const span = document.createElement('span');
	span.className = `badge badge--${yes ? 'yes' : 'no'}`;
	span.textContent = yes ? 'YES' : 'no';
	return span;
};

const truncate = (text: string, max = 90): string => (text.length > max ? `${text.slice(0, max)}…` : text);

const columns: ReadonlyArray<IDomColumn<IBreed>> = [
	{ key: 'name', name: 'Breed' },
	{ key: 'description', name: 'Description', render: (row) => truncate(row.description) },
	{ key: 'hypoallergenic', name: 'Hypoallergenic', render: (row) => yesNoBadge(row.hypoallergenic) },
	{ key: 'life', name: 'Lifespan', render: (row) => `${row.lifeMin}–${row.lifeMax} yrs` },
];

const handle = mountTable<IBreed>({
	target: '#my-table',
	store,
	columns,
	loadingMessage: 'Fetching breeds…',
});

$('#refresh-btn').addEventListener('click', () => handle.refresh());
$('#reset-btn').addEventListener('click', () => store.reset());
