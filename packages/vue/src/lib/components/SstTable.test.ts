import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, type Component } from 'vue';
import { ListRepository, type IColumn, type IResponse, type IResponseList } from '@bridgebyte/sst-core';
import { useTableStore } from '../composables/use-table-store';
import SstTable from './SstTable.vue';

// vue-tsc cannot fully resolve generic component slot types when used with h(),
// so we cast once here and use the typed alias throughout.
const SstTableComponent = SstTable as unknown as Component;

interface IItem {
	id: string;
	name: string;
	status: 'active' | 'paused';
}

class StubRepository extends ListRepository<IItem> {
	public override getList = vi.fn<(...a: unknown[]) => Promise<IResponseList<IItem[]>>>().mockResolvedValue({
		result: [
			{ id: '1', name: 'alpha', status: 'active' },
			{ id: '2', name: 'beta', status: 'paused' },
		],
		totalCount: 2,
		isSuccess: true,
	});
	public override bulkDelete = vi.fn<(...a: unknown[]) => Promise<IResponse<string>>>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
}

const columns: IColumn[] = [
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'status', name: 'Status' },
];

function makeHost() {
	return defineComponent({
		setup() {
			const repository = new StubRepository();
			const t = useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } });
			return { t, repository };
		},
		render() {
			return h(
				SstTableComponent,
				{ columns, store: this.t, bulk: true, searchEnabled: true },
				{
					'header-cell': (s: { column: IColumn }) => h('strong', s.column.name),
					'body-cell': (s: { row: IItem; column: IColumn }) =>
						h('span', { 'data-test-cell': '' }, String(s.row[s.column.key as keyof IItem])),
				},
			);
		},
	});
}

describe('<SstTable>', () => {
	it('renders a row per data item using the body-cell slot', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		await wrapper.vm.$nextTick();
		const cells = wrapper.findAll('[data-test-cell]');
		expect(cells.length).toBe(4); // 2 rows × 2 cols
		expect(cells[0]!.text()).toBe('alpha');
		expect(cells[1]!.text()).toBe('active');
	});

	it('renders the empty state when no data is present', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		(
			wrapper.vm as { t: { updateData: (d: readonly IItem[]) => void; updateTotal: (n: number) => void } }
		).t.updateData([]);
		(wrapper.vm as { t: { updateTotal: (n: number) => void } }).t.updateTotal(0);
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-test-empty]').exists()).toBe(true);
	});

	it('updates store search after typing into the search input (debounced)', async () => {
		vi.useFakeTimers();
		const wrapper = mount(makeHost());
		await flushPromises();
		const input = wrapper.find('input[data-test-search]');
		await input.setValue('alpha');
		vi.advanceTimersByTime(600);
		await flushPromises();
		expect((wrapper.vm as { t: { search: { value: string } } }).t.search.value).toBe('alpha');
		vi.useRealTimers();
	});

	it('toggles all checkboxes when the bulk header checkbox is checked', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		await wrapper.find('input[data-test-bulk-all]').setValue(true);
		const rowChecks = wrapper.findAll('input[data-test-bulk-row]');
		expect(rowChecks.every((c) => (c.element as HTMLInputElement).checked)).toBe(true);
	});

	it('exposes data-sortable on header cells based on column.sortable', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		const ths = wrapper.findAll('[data-test-th]');
		expect(ths[0]!.attributes('data-sortable')).toBe('true');
		expect(ths[1]!.attributes('data-sortable')).toBe('false');
	});
});
