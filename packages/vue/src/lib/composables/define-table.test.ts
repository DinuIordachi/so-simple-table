import { describe, it, expect, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { ESortOrder, type IHttpClient, type IHttpRequestOptions, type IResponseList } from '@sst/core';
import { defineTable } from './define-table';

interface IItem {
	id: string;
	name: string;
}
interface IRaw {
	rows: Array<{ id: string; title: string }>;
	count: number;
}

// A stub IHttpClient that records GET calls and returns a canned raw payload.
function stubClient(raw: unknown): { client: IHttpClient; get: ReturnType<typeof vi.fn> } {
	const get = vi.fn().mockResolvedValue(raw);
	const client: IHttpClient = {
		get: get as IHttpClient['get'],
		post: vi.fn() as IHttpClient['post'],
		put: vi.fn() as IHttpClient['put'],
		delete: vi.fn() as IHttpClient['delete'],
	};
	return { client, get };
}

// Flush the microtask queue the store uses between an action and its fetch.
async function flush(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await nextTick();
}

function lastParams(get: ReturnType<typeof vi.fn>): Record<string, unknown> {
	const options = get.mock.calls.at(-1)?.[1] as IHttpRequestOptions | undefined;
	return (options?.params as Record<string, unknown>) ?? {};
}

describe('defineTable', () => {
	it('returns a composable that produces a working table store', async () => {
		const raw: IResponseList<IItem[]> = { result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true };
		const { client } = stubClient(raw);
		const useTable = defineTable<IItem>({ baseUrl: 'https://api.test/items', httpClient: client });
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.refresh();
			await flush();
			expect(t.data.value).toStrictEqual([{ id: '1', name: 'a' }]);
			expect(t.total.value).toBe(1);
		});
		scope.stop();
	});

	it('applies mapResponse to the raw payload', async () => {
		const raw: IRaw = { rows: [{ id: '7', title: 'seven' }], count: 1 };
		const { client } = stubClient(raw);
		const useTable = defineTable<IItem, IRaw>({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			mapResponse: (r) => ({
				result: r.rows.map((x) => ({ id: x.id, name: x.title })),
				totalCount: r.count,
				isSuccess: true,
			}),
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.refresh();
			await flush();
			expect(t.data.value).toStrictEqual([{ id: '7', name: 'seven' }]);
			expect(t.total.value).toBe(1);
		});
		scope.stop();
	});

	it('defaults sortMap to {} so no sort params are sent', async () => {
		const raw: IResponseList<IItem[]> = { result: [], totalCount: 0, isSuccess: true };
		const { client, get } = stubClient(raw);
		const useTable = defineTable<IItem>({ baseUrl: 'https://api.test/items', httpClient: client });
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.updateSort({ id: `name-${ESortOrder.ASC}`, field: 'name', order: ESortOrder.ASC });
			await flush();
			const params = lastParams(get);
			expect(params).not.toHaveProperty('orderBy');
			expect(params).not.toHaveProperty('orderByDescending');
		});
		scope.stop();
	});

	it('honors queryKeys when formatting pagination params', async () => {
		const raw: IResponseList<IItem[]> = { result: [], totalCount: 0, isSuccess: true };
		const { client, get } = stubClient(raw);
		const useTable = defineTable<IItem>({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.updatePagination({ page: 3, pageSize: 25 });
			await flush();
			expect(lastParams(get)).toMatchObject({ 'page[number]': 3, 'page[size]': 25 });
		});
		scope.stop();
	});

	it('passes headers as baseHeaders to the default fetch client', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ result: [], totalCount: 0, isSuccess: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
		const useTable = defineTable<IItem>({
			baseUrl: 'https://api.test/items',
			headers: { Accept: 'application/vnd.api+json' },
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.refresh();
			await flush();
			expect(fetchMock).toHaveBeenCalled();
			const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
			expect((init.headers as Record<string, string>).Accept).toBe('application/vnd.api+json');
		});
		scope.stop();
		vi.unstubAllGlobals();
	});
});
