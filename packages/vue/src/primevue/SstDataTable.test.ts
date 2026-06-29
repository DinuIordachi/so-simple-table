import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref, h, nextTick, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Column from 'primevue/column';
import type { IFilterParams, IPaginationParams, ISortParams } from '@bridgebyte/sst-core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import SstDataTable from './SstDataTable.vue';
import type { ISstLayoutSlotProps } from './use-sst-data-table';

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
			// Cast: @vue/test-utils can't infer the generic component's T from props,
			// and IUseTableStoreReturn is invariant in T. Runtime value is the real store.
			props: { store: store as never },
			slots: { default: '<Column field="name" header="Name" />' },
		});
		expect(store.refresh).toHaveBeenCalledTimes(1);
		expect(wrapper.find('table').exists()).toBe(true);
		expect(wrapper.text()).toContain('Ada');
	});

	it('forwards a DataTable-level #header slot', () => {
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				header: '<span class="toolbar">Toolbar</span>',
			},
		});
		expect(wrapper.find('.toolbar').exists()).toBe(true);
	});

	// --- responsive layout slots ---

	function installMatchMedia(width: number): void {
		interface MQ {
			media: string;
			matches: boolean;
			px: number;
			addEventListener(type: string, cb: () => void): void;
			removeEventListener(type: string, cb: () => void): void;
		}
		(window as unknown as { matchMedia(q: string): MQ }).matchMedia = (query: string): MQ => {
			const px = Number(/(\d+)px/.exec(query)?.[1] ?? 0);
			return {
				media: query,
				px,
				matches: width >= px,
				addEventListener: () => {},
				removeEventListener: () => {},
			};
		};
	}

	afterEach(() => {
		delete (window as unknown as { matchMedia?: unknown }).matchMedia;
	});

	it('renders a layout slot below tableBreakpoint and passes rows/loading/store', async () => {
		installMatchMedia(500); // < lg
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		// The mounted component's generic T erases to the `{ id: string | number }`
		// constraint here (vue-test-utils can't infer it through `store as never`), so
		// the slot param is typed to that; the real IItem/IProduct-typed slot is
		// exercised in the test/primevue consumer. Assertions use the runtime values.
		let received: { rows: readonly IItem[]; loading: boolean; store: unknown } | undefined;
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				xs: (sp: ISstLayoutSlotProps<{ id: string | number }>) => {
					received = sp as unknown as { rows: readonly IItem[]; loading: boolean; store: unknown };
					return received.rows.map((r) => h('div', { class: 'card' }, r.name));
				},
			},
		});
		await nextTick(); // wait for onMounted compute() → breakpoint ref → DOM update
		expect(wrapper.find('table').exists()).toBe(false); // no DataTable
		expect(wrapper.findAll('.card')).toHaveLength(1);
		expect(wrapper.text()).toContain('Ada');
		expect(received?.rows).toHaveLength(1);
		expect(received?.loading).toBe(false);
		expect(received?.store).toBe(store);
	});

	it('cascades a smaller layout slot upward (xs shown at md width)', async () => {
		installMatchMedia(800); // md range, only #xs defined
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				xs: () => h('div', { class: 'card' }, 'card'),
			},
		});
		await nextTick(); // wait for onMounted compute() → breakpoint ref → DOM update
		expect(wrapper.findAll('.card')).toHaveLength(1);
	});

	it('renders the table at/above tableBreakpoint and does not forward reserved slots', async () => {
		installMatchMedia(1280); // >= lg
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				header: '<span class="toolbar">Toolbar</span>',
				xs: () => h('div', { class: 'card' }, 'card'),
			},
		});
		await nextTick(); // wait for onMounted compute() → breakpoint ref → DOM update
		expect(wrapper.find('table').exists()).toBe(true); // DataTable renders
		expect(wrapper.find('.toolbar').exists()).toBe(true); // non-reserved slot forwarded
		expect(wrapper.find('.card').exists()).toBe(false); // reserved #xs NOT forwarded/rendered
	});
});
