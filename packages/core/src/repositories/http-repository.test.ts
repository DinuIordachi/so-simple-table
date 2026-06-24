import { describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '../types';
import { HttpRepository } from './http-repository';

interface IItem {
	id: string;
	name: string;
}

class TestRepo extends HttpRepository<IItem> {}

function makeClient(impl: Partial<IHttpClient>): IHttpClient {
	return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), ...impl } as IHttpClient;
}

describe('HttpRepository', () => {
	it('create() POSTs to baseUrl with the dto body', async () => {
		const client = makeClient({ post: vi.fn().mockResolvedValue({ result: 'id-1', isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.create({ name: 'x' });
		expect(client.post).toHaveBeenCalledWith('https://api.test/items', { body: { name: 'x' } });
	});

	it('update() PUTs to {baseUrl}/{id} with the dto body', async () => {
		const client = makeClient({ put: vi.fn().mockResolvedValue({ result: {}, isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.update('1', { name: 'y' });
		expect(client.put).toHaveBeenCalledWith('https://api.test/items/1', { body: { name: 'y' } });
	});

	it('delete() DELETEs {baseUrl}/{id} when id is provided', async () => {
		const client = makeClient({ delete: vi.fn().mockResolvedValue({ result: {}, isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.delete('1');
		expect(client.delete).toHaveBeenCalledWith('https://api.test/items/1');
	});

	it('delete() DELETEs baseUrl when no id is provided', async () => {
		const client = makeClient({ delete: vi.fn().mockResolvedValue({ result: {}, isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.delete();
		expect(client.delete).toHaveBeenCalledWith('https://api.test/items');
	});

	it('duplicate() POSTs to {baseUrl}/{id}/duplication with empty body', async () => {
		const client = makeClient({ post: vi.fn().mockResolvedValue({ result: 'id-2', isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.duplicate('1');
		expect(client.post).toHaveBeenCalledWith('https://api.test/items/1/duplication', { body: {} });
	});
});
