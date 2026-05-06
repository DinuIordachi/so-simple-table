import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FetchHttpClient } from './fetch-http-client';

describe('FetchHttpClient', () => {
	const originalFetch = globalThis.fetch;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
		return new Response(JSON.stringify(body), {
			...init,
			headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
		});
	}

	it('issues a GET request with serialized scalar query params', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		const result = await client.get<{ ok: boolean }>('https://api.test/items', {
			params: { page: 1, pageSize: 10, includeArchived: false },
		});
		expect(result).toEqual({ ok: true });
		const [url, init] = mockFetch.mock.calls[0]!;
		expect(url).toBe('https://api.test/items?page=1&pageSize=10&includeArchived=false');
		expect((init as RequestInit).method).toBe('GET');
	});

	it('repeats array params per value', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.get('https://api.test/items', {
			params: { ids: ['a', 'b', 'c'] },
		});
		const [url] = mockFetch.mock.calls[0]!;
		expect(url).toBe('https://api.test/items?ids=a&ids=b&ids=c');
	});

	it('omits undefined query param values', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.get('https://api.test/items', {
			params: { page: 1, search: undefined },
		});
		const [url] = mockFetch.mock.calls[0]!;
		expect(url).toBe('https://api.test/items?page=1');
	});

	it('serializes JSON bodies for POST/PUT and sets content-type', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.post('https://api.test/items', { body: { name: 'x' } });
		const [, init] = mockFetch.mock.calls[0]!;
		expect((init as RequestInit).method).toBe('POST');
		expect((init as RequestInit).body).toBe(JSON.stringify({ name: 'x' }));
		expect(((init as RequestInit).headers as Record<string, string>)['content-type']).toBe('application/json');
	});

	it('sends DELETE with body when provided', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.delete('https://api.test/items', { body: ['a', 'b'] });
		const [, init] = mockFetch.mock.calls[0]!;
		expect((init as RequestInit).method).toBe('DELETE');
		expect((init as RequestInit).body).toBe(JSON.stringify(['a', 'b']));
	});

	it('returns null when the response has 204 No Content', async () => {
		mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
		const client = new FetchHttpClient();
		const result = await client.delete<unknown>('https://api.test/items/1');
		expect(result).toBeNull();
	});

	it('throws an Error containing the status when the response is not ok', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ message: 'nope' }, { status: 500 }));
		const client = new FetchHttpClient();
		await expect(client.get('https://api.test/items')).rejects.toThrow(/500/);
	});

	it('forwards an AbortSignal to fetch', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		const controller = new AbortController();
		await client.get('https://api.test/items', { signal: controller.signal });
		const [, init] = mockFetch.mock.calls[0]!;
		expect((init as RequestInit).signal).toBe(controller.signal);
	});
});
