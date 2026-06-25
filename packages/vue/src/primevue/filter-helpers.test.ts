import { describe, it, expect } from 'vitest';
import { searchColumn, withMatchModes } from './filter-helpers';

describe('searchColumn', () => {
	it('maps the named column value to search', () => {
		expect(searchColumn('title')({ title: { value: 'phone', matchMode: 'contains' } } as never)).toEqual({
			search: 'phone',
		});
	});

	it('returns empty search when the column is empty', () => {
		expect(searchColumn('title')({ title: { value: null, matchMode: 'contains' } } as never)).toEqual({
			search: '',
		});
	});
});

describe('withMatchModes', () => {
	it('emits value + companion matchMode params and routes global to search', () => {
		const out = withMatchModes()({
			global: { value: 'g', matchMode: 'contains' },
			price: { value: 10, matchMode: 'gte' },
		} as never);
		expect(out.search).toBe('g');
		expect(out.filters).toEqual([
			{ key: 'price', value: '10' },
			{ key: 'priceMatchMode', value: 'gte' },
		]);
	});

	it('honors a custom suffix', () => {
		const out = withMatchModes({ suffix: '_op' })({ name: { value: 'a', matchMode: 'equals' } } as never);
		expect(out.filters).toEqual([
			{ key: 'name', value: 'a' },
			{ key: 'name_op', value: 'equals' },
		]);
	});
});
