import { describe, it, expect } from 'vitest';
import { ESortOrder } from '../types/sort';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';
import { mapTableParams } from './map-table-params';

describe('mapTableParams', () => {
	it('emits page/pageSize using default keys', () => {
		const params = mapTableParams({
			pagination: { page: 2, pageSize: 25 },
			sortMap: {},
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({ page: 2, pageSize: 25 });
	});

	it('emits page/pageSize using custom keys', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sortMap: {},
			queryKeys: { ...DEFAULT_QUERY_KEYS, page: 'pageNumber', pageSize: 'limit' },
		});
		expect(params).toStrictEqual({ pageNumber: 1, limit: 10 });
	});

	it('translates a known sort field through sortMap', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'createdAt-DESC', field: 'createdAt', order: ESortOrder.DESC },
			sortMap: { createdAt: 'ByCreationDate' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			orderBy: 'ByCreationDate',
			orderByDescending: true,
		});
	});

	it('omits sort entirely when the sort field is not in sortMap', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'unknown-ASC', field: 'unknown', order: ESortOrder.ASC },
			sortMap: { createdAt: 'ByCreationDate' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({ page: 1, pageSize: 10 });
	});

	it('groups multiple filter values for the same key into an array', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			filters: [
				{ key: 'status', value: 'active' },
				{ key: 'status', value: 'paused' },
				{ key: 'origin', value: 'web' },
			],
			sortMap: {},
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			status: ['active', 'paused'],
			origin: ['web'],
		});
	});

	it('translates filter keys via filterMap when provided', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			filters: [{ key: 'status', value: 'active' }],
			sortMap: {},
			filterMap: { status: 'FilterStatus' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			FilterStatus: ['active'],
		});
	});

	it('emits the search term under the configured search key when present', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			search: 'alpha',
			sortMap: {},
			queryKeys: { ...DEFAULT_QUERY_KEYS, search: 'q' },
		});
		expect(params).toStrictEqual({ page: 1, pageSize: 10, q: 'alpha' });
	});

	it('omits the search key when search is empty', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			search: '',
			sortMap: {},
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({ page: 1, pageSize: 10 });
	});

	it('applies a custom paramFormatting.formatSortField', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'createdAt-ASC', field: 'createdAt', order: ESortOrder.ASC },
			sortMap: { createdAt: 'creation_date' },
			queryKeys: DEFAULT_QUERY_KEYS,
			paramFormatting: { formatSortField: (field) => `sort.${field}` },
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			orderBy: 'sort.creation_date',
			orderByDescending: false,
		});
	});
});
