import { describe, it, expect, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useTableFilters } from './use-table-filters';

describe('useTableFilters — standalone state', () => {
	it('manages get/set/reset and computes activeFilterCount + toFilterParams', () => {
		const scope = effectScope();
		scope.run(() => {
			const f = useTableFilters(null, [
				{ key: 'status', value: 'active', defaultValue: null },
				{ key: 'role', value: ['admin'], defaultValue: [] },
				{ key: 'q', value: '', defaultValue: '' },
			]);

			expect(f.getFilter('status')?.value).toBe('active');
			expect(f.getFilter('missing')).toBeUndefined();
			expect(f.activeFilterCount.value).toBe(2); // status + role; q is empty

			expect(f.toFilterParams()).toStrictEqual([
				{ key: 'status', value: 'active' },
				{ key: 'role', value: 'admin' },
			]);

			f.setFilterValue('status', 'inactive');
			expect(f.getFilter('status')?.value).toBe('inactive');

			f.resetFilter('status');
			expect(f.getFilter('status')?.value).toBeNull();

			f.resetFilters();
			expect(f.getFilter('role')?.value).toStrictEqual([]);
			expect(f.activeFilterCount.value).toBe(0);
		});
		scope.stop();
	});

	it('expands array values and treats false/0 as active (not empty)', () => {
		const scope = effectScope();
		scope.run(() => {
			const f = useTableFilters(null, [
				{ key: 'tags', value: ['a', 'b'], defaultValue: [] },
				{ key: 'archived', value: false, defaultValue: null },
				{ key: 'empty', value: null, defaultValue: null },
			]);
			expect(f.toFilterParams()).toStrictEqual([
				{ key: 'tags', value: 'a' },
				{ key: 'tags', value: 'b' },
				{ key: 'archived', value: 'false' },
			]);
			expect(f.activeFilterCount.value).toBe(2);
		});
		scope.stop();
	});
});

describe('useTableFilters — store-integrated', () => {
	it('debounces, syncs active filters via updateFilter, and resets to page 1', async () => {
		vi.useFakeTimers();
		const updateFilter = vi.fn();
		const setPage = vi.fn();
		const scope = effectScope();
		await scope.run(async () => {
			const f = useTableFilters(
				{ updateFilter, setPage },
				[
					{ key: 'status', value: null, defaultValue: null },
					{ key: 'role', value: [], defaultValue: [] },
				],
				{ debounceMs: 200 },
			);

			f.setFilterValue('status', 'active');
			f.setFilterValue('role', ['admin', 'user']);
			await nextTick();
			expect(updateFilter).not.toHaveBeenCalled(); // still within the debounce window

			vi.advanceTimersByTime(200);
			expect(updateFilter).toHaveBeenCalledWith([
				{ key: 'status', value: 'active' },
				{ key: 'role', value: 'admin' },
				{ key: 'role', value: 'user' },
			]);
			expect(setPage).toHaveBeenCalledWith(1);
		});
		scope.stop();
		vi.useRealTimers();
	});

	it('resetFilters syncs the cleared filters back to the store', async () => {
		vi.useFakeTimers();
		const updateFilter = vi.fn();
		const setPage = vi.fn();
		const scope = effectScope();
		await scope.run(async () => {
			const f = useTableFilters(
				{ updateFilter, setPage },
				[{ key: 'status', value: 'active', defaultValue: null }],
				{ debounceMs: 100 },
			);

			f.resetFilters();
			await nextTick();
			vi.advanceTimersByTime(100);
			expect(updateFilter).toHaveBeenLastCalledWith([]); // status cleared → no active params
		});
		scope.stop();
		vi.useRealTimers();
	});
});
