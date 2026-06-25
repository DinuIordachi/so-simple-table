import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { ESortOrder, type IFilterParams, type IPaginationParams, type ISortParams } from '@sst/core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import { useSstDataTable, type IUseSstDataTableOptions, type ISstDataTableBindings } from './use-sst-data-table';

interface IItem {
	id: string;
	name: string;
}

function makeStore(): IUseTableStoreReturn<IItem> {
	return {
		store: {} as IUseTableStoreReturn<IItem>['store'],
		data: ref<readonly IItem[]>([]) as Readonly<Ref<readonly IItem[]>>,
		total: ref(0),
		loading: ref(false),
		pagination: ref<IPaginationParams>({ page: 1, pageSize: 10 }),
		sort: ref<ISortParams | undefined>(undefined),
		filters: ref<readonly IFilterParams[]>([]),
		search: ref(''),
		getData: vi.fn(),
		bulkDelete: vi.fn().mockResolvedValue({ result: 'ok', isSuccess: true }),
		refresh: vi.fn(),
		reset: vi.fn(),
		updatePagination: vi.fn(),
		updateSort: vi.fn(),
		updateFilter: vi.fn(),
		updateSearch: vi.fn(),
		updateData: vi.fn(),
		updateTotal: vi.fn(),
	} as unknown as IUseTableStoreReturn<IItem>;
}

// Mount a harness so the composable runs inside a real component (onMounted fires).
function harness(store: IUseTableStoreReturn<IItem>, options?: IUseSstDataTableOptions<IItem>) {
	let bindings!: ISstDataTableBindings<IItem>;
	const Comp = defineComponent({
		setup() {
			bindings = useSstDataTable<IItem>(store, options);
			return () => h('div');
		},
	});
	const wrapper = mount(Comp);
	return {
		wrapper,
		get bindings() {
			return bindings;
		},
	};
}

describe('useSstDataTable', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('refreshes on mount by default and exposes lazy bindings from the store', () => {
		const store = makeStore();
		(store.total as Ref<number>).value = 42;
		(store.pagination as Ref<IPaginationParams>).value = { page: 3, pageSize: 20 };
		const { bindings } = harness(store);
		expect(store.refresh).toHaveBeenCalledTimes(1);
		expect(bindings.lazy).toBe(true);
		expect(bindings.totalRecords).toBe(42);
		expect(bindings.first).toBe(40); // (3 - 1) * 20
		expect(bindings.rows).toBe(20);
	});

	it('does not refresh on mount when immediate is false', () => {
		const store = makeStore();
		harness(store, { immediate: false });
		expect(store.refresh).not.toHaveBeenCalled();
	});

	it('maps @page (0-based) to updatePagination (1-based)', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings.onPage({ page: 2, rows: 25, first: 50, pageCount: 4 } as never);
		expect(store.updatePagination).toHaveBeenCalledWith({ page: 3, pageSize: 25 });
	});

	it('maps @sort to updateSort with ESortOrder, and clears on null field', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings.onSort({ sortField: 'name', sortOrder: -1 } as never);
		expect(store.updateSort).toHaveBeenCalledWith({
			id: `name-${ESortOrder.DESC}`,
			field: 'name',
			order: ESortOrder.DESC,
		});
		bindings.onSort({ sortField: null, sortOrder: null } as never);
		expect(store.updateSort).toHaveBeenLastCalledWith(undefined);
	});

	it('exposes sortField/sortOrder from the store sort', () => {
		const store = makeStore();
		(store.sort as Ref<ISortParams | undefined>).value = { id: 'name-1', field: 'name', order: ESortOrder.ASC };
		const { bindings } = harness(store);
		expect(bindings.sortField).toBe('name');
		expect(bindings.sortOrder).toBe(1);
	});

	it('debounces @filter and maps global → search and per-column value → filters', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings.onFilter({
			filters: { global: { value: 'ada', matchMode: 'contains' }, name: { value: 'lin', matchMode: 'contains' } },
		} as never);
		expect(store.updateSearch).not.toHaveBeenCalled(); // debounced
		vi.advanceTimersByTime(300);
		expect(store.updateSearch).toHaveBeenCalledWith('ada');
		expect(store.updateFilter).toHaveBeenCalledWith([{ key: 'name', value: 'lin' }]);
	});

	it('honors a custom mapFilters', () => {
		const store = makeStore();
		const mapFilters = vi.fn().mockReturnValue({ search: 'x', filters: [{ key: 'k', value: 'v' }] });
		const { bindings } = harness(store, { mapFilters });
		bindings.onFilter({ filters: { name: { value: 'n', matchMode: 'equals' } } } as never);
		vi.advanceTimersByTime(300);
		expect(mapFilters).toHaveBeenCalled();
		expect(store.updateSearch).toHaveBeenCalledWith('x');
		expect(store.updateFilter).toHaveBeenCalledWith([{ key: 'k', value: 'v' }]);
	});

	it('removeSelected delegates ids to store.bulkDelete', async () => {
		const store = makeStore();
		const { bindings } = harness(store);
		await bindings.removeSelected([
			{ id: '1', name: 'a' },
			{ id: '2', name: 'b' },
		]);
		expect(store.bulkDelete).toHaveBeenCalledWith(['1', '2']);
	});

	it('optimistically applies a cell edit and calls onSave', () => {
		const store = makeStore();
		(store.data as Ref<readonly IItem[]>).value = [{ id: '1', name: 'a' }];
		const onSave = vi.fn().mockResolvedValue(undefined);
		const { bindings } = harness(store, { onSave });
		bindings.onCellEditComplete({
			data: { id: '1', name: 'a' },
			newData: { id: '1', name: 'b' },
			field: 'name',
			newValue: 'b',
		} as never);
		expect(store.updateData).toHaveBeenCalledWith([{ id: '1', name: 'b' }]);
		expect(onSave).toHaveBeenCalledWith({
			row: { id: '1', name: 'a' },
			newData: { id: '1', name: 'b' },
			field: 'name',
			newValue: 'b',
		});
	});

	it('reverts the optimistic edit when onSave rejects', async () => {
		const store = makeStore();
		const original: readonly IItem[] = [{ id: '1', name: 'a' }];
		(store.data as Ref<readonly IItem[]>).value = original;
		const onSave = vi.fn().mockRejectedValue(new Error('nope'));
		const { bindings } = harness(store, { onSave });
		bindings.onRowEditSave({ data: { id: '1', name: 'a' }, newData: { id: '1', name: 'b' }, index: 0 } as never);
		await Promise.resolve();
		await Promise.resolve();
		expect(store.updateData).toHaveBeenCalledTimes(2);
		const calls = (store.updateData as ReturnType<typeof vi.fn>).mock.calls;
		expect(calls[0]?.[0]).toEqual([{ id: '1', name: 'b' }]); // optimistic apply
		expect(calls[1]?.[0]).toEqual([{ id: '1', name: 'a' }]); // reverted to previous
	});

	it('tracks selection via onUpdate:selection and clears it', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings['onUpdate:selection']([{ id: '1', name: 'a' }]);
		expect(bindings.selection).toEqual([{ id: '1', name: 'a' }]);
		bindings.clearSelection();
		expect(bindings.selection).toEqual([]);
	});

	it('removeSelected() with no args deletes the current selection', async () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings['onUpdate:selection']([
			{ id: '1', name: 'a' },
			{ id: '2', name: 'b' },
		]);
		await bindings.removeSelected();
		expect(store.bulkDelete).toHaveBeenCalledWith(['1', '2']);
	});
});
