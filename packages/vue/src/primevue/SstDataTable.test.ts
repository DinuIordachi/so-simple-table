import { describe, it, expect, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Column from 'primevue/column';
import type { IFilterParams, IPaginationParams, ISortParams } from '@sst/core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import SstDataTable from './SstDataTable.vue';

interface IItem {
	id: string;
	name: string;
}

function makeStore(rows: IItem[]): IUseTableStoreReturn<IItem> {
	return {
		store: {} as IUseTableStoreReturn<IItem>['store'],
		data: ref<readonly IItem[]>(rows) as Readonly<Ref<readonly IItem[]>>,
		total: ref(rows.length),
		loading: ref(false),
		pagination: ref<IPaginationParams>({ page: 1, pageSize: 10 }),
		sort: ref<ISortParams | undefined>(undefined),
		filters: ref<readonly IFilterParams[]>([]),
		search: ref(''),
		getData: vi.fn(),
		bulkDelete: vi.fn(),
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

describe('SstDataTable', () => {
	it('renders a PrimeVue DataTable, refreshes on mount, and shows rows in the default-slot column', () => {
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store },
			slots: { default: '<Column field="name" header="Name" />' },
		});
		expect(store.refresh).toHaveBeenCalledTimes(1);
		expect(wrapper.find('table').exists()).toBe(true);
		expect(wrapper.text()).toContain('Ada');
	});
});
