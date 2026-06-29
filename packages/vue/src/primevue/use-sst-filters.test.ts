import { describe, it, expect, vi } from 'vitest';
import { effectScope } from 'vue';
import { useSstFilters } from './use-sst-filters';

function syncTarget() {
	return { updateSearch: vi.fn(), updateFilter: vi.fn(), setPage: vi.fn() };
}

describe('useSstFilters — model building', () => {
	it("builds a 'row' model: { field: { value, matchMode } }", () => {
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters([
				{ field: 'name', matchMode: 'contains' },
				{ field: 'status', matchMode: 'equals', value: 'active' },
			]);
			expect(f.filters.value).toStrictEqual({
				name: { value: null, matchMode: 'contains' },
				status: { value: 'active', matchMode: 'equals' },
			});
		});
		scope.stop();
	});

	it("builds a 'menu' model with operator + constraints", () => {
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters([{ field: 'name', matchMode: 'contains' }], { mode: 'menu' });
			expect(f.filters.value).toStrictEqual({
				name: { operator: 'and', constraints: [{ value: null, matchMode: 'contains' }] },
			});
		});
		scope.stop();
	});
});

describe('useSstFilters — programmatic changes sync to the store', () => {
	it('setFilterValue writes the model (preserving matchMode) and pushes to the store + page 1', () => {
		const store = syncTarget();
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters(
				[
					{ field: 'global', matchMode: 'contains' },
					{ field: 'category', matchMode: 'equals', value: null },
				],
				{ store },
			);
			f.setFilterValue('category', 'phones');
			expect(f.getFilter('category')).toBe('phones');
			expect(f.filters.value.category).toStrictEqual({ value: 'phones', matchMode: 'equals' });
			expect(store.updateFilter).toHaveBeenLastCalledWith([{ key: 'category', value: 'phones' }]);
			expect(store.setPage).toHaveBeenLastCalledWith(1);

			f.setFilterValue('global', 'phone');
			expect(store.updateSearch).toHaveBeenLastCalledWith('phone');
		});
		scope.stop();
	});

	it('reset() restores defaults, clears the store filters, and resets page', () => {
		const store = syncTarget();
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters([{ field: 'category', matchMode: 'equals', value: null }], { store });
			f.setFilterValue('category', 'beauty');
			expect(f.activeFilterCount.value).toBe(1);

			f.reset();
			expect(f.getFilter('category')).toBeNull();
			expect(f.activeFilterCount.value).toBe(0);
			expect(store.updateFilter).toHaveBeenLastCalledWith([]);
			expect(store.setPage).toHaveBeenLastCalledWith(1);
		});
		scope.stop();
	});

	it('works on a menu-mode model too (writes constraints[0].value)', () => {
		const store = syncTarget();
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters([{ field: 'category', matchMode: 'equals', value: null }], { store, mode: 'menu' });
			f.setFilterValue('category', 'beauty');
			expect(f.getFilter('category')).toBe('beauty');
			expect(f.filters.value.category).toStrictEqual({
				operator: 'and',
				constraints: [{ value: 'beauty', matchMode: 'equals' }],
			});
			expect(store.updateFilter).toHaveBeenLastCalledWith([{ key: 'category', value: 'beauty' }]);
		});
		scope.stop();
	});
});

describe('useSstFilters — activeFilterCount + standalone', () => {
	it('counts non-empty fields and excludes global', () => {
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters([
				{ field: 'global', matchMode: 'contains', value: 'hi' },
				{ field: 'a', matchMode: 'equals', value: 'x' },
				{ field: 'b', matchMode: 'equals', value: null },
			]);
			expect(f.activeFilterCount.value).toBe(1); // 'a' only; global excluded, b empty
		});
		scope.stop();
	});

	it('standalone (no store): toMappedFilters reflects the model, no throw', () => {
		const scope = effectScope();
		scope.run(() => {
			const f = useSstFilters(
				[
					{ field: 'global', matchMode: 'contains', value: 'q' },
					{ field: 'category', matchMode: 'equals', value: 'phones' },
				],
				{ store: null },
			);
			expect(f.toMappedFilters()).toStrictEqual({ search: 'q', filters: [{ key: 'category', value: 'phones' }] });
			f.setFilterValue('category', 'beauty'); // must not throw without a store
			expect(f.getFilter('category')).toBe('beauty');
		});
		scope.stop();
	});
});
