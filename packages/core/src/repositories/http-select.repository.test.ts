import { describe, it, expect, vi } from 'vitest';
import type { IHttpClient } from '../types';
import { HttpSelectRepository } from './http-select.repository';

interface IItem {
	id: string;
	name: string;
}

class TestRepository extends HttpSelectRepository<IItem> {}

function makeClient(impl: Partial<IHttpClient>): IHttpClient {
	return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), ...impl } as IHttpClient;
}

describe('HttpSelectRepository', () => {
	it('get() encodes the id twice (mirrors legacy behavior)', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: { id: 'a/b', name: 'x' }, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.get('a/b');
		expect(client.get).toHaveBeenCalledWith('https://api.test/items/a%252Fb');
	});

	it('getListByIdList() repeats `ids` and includes pagination', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.getListByIdList(['1', '2'], { page: 3, pageSize: 50 });
		expect(client.get).toHaveBeenCalledWith('https://api.test/items', {
			params: { ids: ['1', '2'], page: 3, pageSize: 50 },
		});
	});

	it('getListByIdList() omits pagination when not provided', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.getListByIdList(['1']);
		expect(client.get).toHaveBeenCalledWith('https://api.test/items', { params: { ids: ['1'] } });
	});
});
