import { describe, it, expect, vi } from 'vitest';
import type { IHttpClient } from '../types/http-client';
import type { IResponseList } from '../types/response';
import { HttpListRepository } from './http-list.repository';

interface IItem {
	id: string;
	name: string;
}

class TestRepository extends HttpListRepository<IItem> {}

function makeClient(impl: Partial<IHttpClient>): IHttpClient {
	return {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		...impl,
	} as IHttpClient;
}

describe('HttpListRepository', () => {
	it('throws if instantiated without baseUrl', () => {
		expect(() => new TestRepository({ baseUrl: '' })).toThrow(/baseUrl/);
	});

	it('uses FetchHttpClient by default when none is provided', () => {
		const repo = new TestRepository({ baseUrl: 'https://api.test/items' });
		expect(repo).toBeInstanceOf(HttpListRepository);
	});

	it('getList() calls httpClient.get with baseUrl and params', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.getList({ page: 2 });
		expect(client.get).toHaveBeenCalledWith('https://api.test/items', { params: { page: 2 } });
	});

	it('getList() applies a custom responseListMapper', async () => {
		const raw = { items: [{ id: '1', name: 'a' }], total: 1 };
		const client = makeClient({ get: vi.fn().mockResolvedValue(raw) });
		const mapper = (r: unknown): IResponseList<IItem[]> => {
			const obj = r as { items: IItem[]; total: number };
			return { result: obj.items, totalCount: obj.total, isSuccess: true };
		};
		const repo = new TestRepository({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			responseListMapper: mapper,
		});
		const out = await repo.getList();
		expect(out).toStrictEqual({ result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true });
	});

	it('bulkDelete() issues DELETE to {baseUrl}/bulk_delete with the ids body', async () => {
		const client = makeClient({
			delete: vi.fn().mockResolvedValue({ result: 'ok', isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.bulkDelete(['1', '2']);
		expect(client.delete).toHaveBeenCalledWith('https://api.test/items/bulk_delete', { body: ['1', '2'] });
	});

	it('routes to the search endpoint when a search param is present', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({
			baseUrl: 'https://api.test/products',
			httpClient: client,
			searchEndpoint: '/search',
			queryKeys: { search: 'q' },
		});
		await repo.getList({ q: 'phone', limit: 10 });
		expect(client.get).toHaveBeenCalledWith('https://api.test/products/search', {
			params: { q: 'phone', limit: 10 },
		});
	});

	it('uses the base URL when search is absent or empty', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({
			baseUrl: 'https://api.test/products',
			httpClient: client,
			searchEndpoint: '/search',
			queryKeys: { search: 'q' },
		});
		await repo.getList({ limit: 10 });
		expect(client.get).toHaveBeenCalledWith('https://api.test/products', { params: { limit: 10 } });
		await repo.getList({ q: '', limit: 10 });
		expect(client.get).toHaveBeenLastCalledWith('https://api.test/products', { params: { q: '', limit: 10 } });
	});
});
