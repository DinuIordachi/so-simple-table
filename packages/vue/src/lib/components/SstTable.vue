<script setup lang="ts" generic="T extends { id: string | number }">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ESortOrder, type IColumn, type ISortParams } from '@bridgebyte/sst-core';
import type { IUseTableStoreReturn } from '../composables/use-table-store';

export interface ISstTableProps<TItem extends { id: string | number }> {
	columns: readonly IColumn[];
	store: IUseTableStoreReturn<TItem>;
	bulk?: boolean;
	searchEnabled?: boolean;
	searchPlaceholder?: string;
	searchDebounceMs?: number;
	emptyText?: string;
	bulkDeleteLabel?: string;
}

const props = withDefaults(defineProps<ISstTableProps<T>>(), {
	bulk: false,
	searchEnabled: false,
	searchPlaceholder: 'Search',
	searchDebounceMs: 500,
	emptyText: 'No results',
	bulkDeleteLabel: 'Delete selected',
});

defineSlots<{
	'header-cell'(props: { column: IColumn }): unknown;
	'body-cell'(props: { row: T; column: IColumn; index: number }): unknown;
	'empty-state'(): unknown;
	'bulk-actions'(props: { selected: ReadonlySet<string> }): unknown;
	'pagination'(props: { page: number; pageSize: number; total: number; totalPages: number; setPage: (p: number) => void }): unknown;
}>();

const searchInput = ref<string>(props.store.search.value);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const bulkSelected = ref<Set<string>>(new Set());
const bulkDeleteLoading = ref<boolean>(false);

watch(
	() => props.store.search.value,
	(value) => {
		if (searchInput.value !== value) searchInput.value = value;
	},
);

onMounted(() => {
	props.store.refresh();
});

onBeforeUnmount(() => {
	if (searchTimer !== undefined) clearTimeout(searchTimer);
});

const allChecked = computed(() => {
	const data = props.store.data.value;
	const selected = bulkSelected.value;
	return data.length > 0 && data.every((row) => selected.has(String(row.id)));
});

const indeterminate = computed(() => {
	const data = props.store.data.value;
	const selected = bulkSelected.value;
	return data.some((row) => selected.has(String(row.id))) && !allChecked.value;
});

const totalPages = computed(() => {
	const total = props.store.total.value;
	const size = props.store.pagination.value.pageSize;
	return Math.max(1, Math.ceil(total / size));
});

function onSearchInput(event: Event): void {
	const value = (event.target as HTMLInputElement).value;
	searchInput.value = value;
	if (searchTimer !== undefined) clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		props.store.updateSearch(value);
	}, props.searchDebounceMs);
}

function onClearSearch(): void {
	searchInput.value = '';
	props.store.updateSearch('');
}

function onSortClick(column: IColumn): void {
	if (!column.sortable) return;
	const current = props.store.sort.value;
	const next: ISortParams | undefined =
		!current || current.field !== column.key
			? { id: `${column.key}-${ESortOrder.ASC}`, field: column.key, order: ESortOrder.ASC }
			: current.order === ESortOrder.ASC
				? { id: `${column.key}-${ESortOrder.DESC}`, field: column.key, order: ESortOrder.DESC }
				: undefined;
	props.store.updateSort(next);
}

function sortIndicator(column: IColumn): '↑' | '↓' | '' {
	const sort = props.store.sort.value;
	if (!sort || sort.field !== column.key) return '';
	return sort.order === ESortOrder.ASC ? '↑' : '↓';
}

function onAllChecked(event: Event): void {
	const checked = (event.target as HTMLInputElement).checked;
	if (!checked) {
		bulkSelected.value = new Set();
		return;
	}
	bulkSelected.value = new Set(props.store.data.value.map((r) => String(r.id)));
}

function onRowChecked(id: string | number, event: Event): void {
	const checked = (event.target as HTMLInputElement).checked;
	const key = String(id);
	const next = new Set(bulkSelected.value);
	if (checked) next.add(key); else next.delete(key);
	bulkSelected.value = next;
}

async function onBulkDelete(): Promise<void> {
	const ids = [...bulkSelected.value];
	if (ids.length === 0) return;
	bulkDeleteLoading.value = true;
	try {
		await props.store.bulkDelete(ids);
		bulkSelected.value = new Set();
	} finally {
		bulkDeleteLoading.value = false;
	}
}

function setPage(page: number): void {
	const current = props.store.pagination.value;
	props.store.updatePagination({ ...current, page });
}
</script>

<template>
	<div class="sst-table">
		<div v-if="searchEnabled || bulk" class="sst-table__toolbar">
			<div v-if="searchEnabled" class="sst-table__search">
				<input
					type="text"
					data-test-search
					:value="searchInput"
					:placeholder="searchPlaceholder"
					@input="onSearchInput"
				/>
				<button
					v-if="searchInput.length > 0"
					type="button"
					class="sst-table__search-clear"
					aria-label="Clear search"
					@click="onClearSearch"
				>×</button>
			</div>
			<div v-if="bulk" class="sst-table__bulk">
				<slot name="bulk-actions" :selected="bulkSelected">
					<button
						type="button"
						:disabled="bulkSelected.size === 0 || bulkDeleteLoading"
						@click="onBulkDelete"
					>{{ bulkDeleteLabel }}</button>
				</slot>
			</div>
		</div>

		<table class="sst-table__table">
			<thead>
				<tr>
					<th v-if="bulk" class="sst-table__check-cell">
						<input
							type="checkbox"
							data-test-bulk-all
							:checked="allChecked"
							:indeterminate="indeterminate"
							@change="onAllChecked"
						/>
					</th>
					<th
						v-for="column in columns"
						:key="column.key"
						:data-test-th="column.key"
						:data-sortable="column.sortable ? 'true' : 'false'"
						:class="{ 'sst-table__th--sortable': column.sortable }"
						:style="column.width ? { width: column.width + 'px' } : undefined"
						@click="onSortClick(column)"
					>
						<div class="sst-table__th-inner">
							<slot name="header-cell" :column="column">{{ column.name }}</slot>
							<span v-if="column.sortable" class="sst-table__sort-indicator">{{ sortIndicator(column) }}</span>
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-if="store.data.value.length === 0 && !store.loading.value">
					<tr>
						<td :colspan="columns.length + (bulk ? 1 : 0)" data-test-empty>
							<slot name="empty-state">
								<div class="sst-table__empty">{{ emptyText }}</div>
							</slot>
						</td>
					</tr>
				</template>
				<template v-else>
					<tr v-for="(row, rowIndex) in store.data.value" :key="row.id">
						<td v-if="bulk" class="sst-table__check-cell">
							<input
								type="checkbox"
								:data-test-bulk-row="row.id"
								:checked="bulkSelected.has(String(row.id))"
								@change="(e) => onRowChecked(row.id, e)"
							/>
						</td>
						<td v-for="column in columns" :key="column.key">
							<slot name="body-cell" :row="row" :column="column" :index="rowIndex">
								{{ (row as Record<string, unknown>)[column.key] }}
							</slot>
						</td>
					</tr>
				</template>
			</tbody>
		</table>

		<div v-if="totalPages > 1" class="sst-table__pagination">
			<slot
				name="pagination"
				:page="store.pagination.value.page"
				:pageSize="store.pagination.value.pageSize"
				:total="store.total.value"
				:totalPages="totalPages"
				:setPage="setPage"
			>
				<button
					type="button"
					:disabled="store.pagination.value.page <= 1"
					@click="setPage(store.pagination.value.page - 1)"
				>‹</button>
				<span>Page {{ store.pagination.value.page }} / {{ totalPages }}</span>
				<button
					type="button"
					:disabled="store.pagination.value.page >= totalPages"
					@click="setPage(store.pagination.value.page + 1)"
				>›</button>
			</slot>
		</div>

		<div v-if="store.loading.value" class="sst-table__loading" aria-live="polite">Loading…</div>
	</div>
</template>

<style scoped>
.sst-table { display: block; width: 100%; }
.sst-table__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.sst-table__search { position: relative; display: inline-flex; gap: 4px; }
.sst-table__search input { padding: 6px 28px 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 14px; min-width: 240px; }
.sst-table__search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; font-size: 18px; cursor: pointer; line-height: 1; padding: 4px; }
.sst-table__table { width: 100%; border-collapse: collapse; }
.sst-table__table th, .sst-table__table td { padding: 10px 12px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
.sst-table__table th { font-weight: 600; background: #fafafa; }
.sst-table__th--sortable { cursor: pointer; user-select: none; }
.sst-table__th-inner { display: inline-flex; align-items: center; gap: 6px; }
.sst-table__sort-indicator { font-size: 12px; opacity: 0.6; }
.sst-table__check-cell { width: 32px; text-align: center; }
.sst-table__empty { padding: 24px; text-align: center; color: #888; }
.sst-table__pagination { margin-top: 12px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.sst-table__pagination button { padding: 4px 10px; border: 1px solid #d0d0d0; background: #fff; border-radius: 4px; cursor: pointer; }
.sst-table__pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.sst-table__loading { padding: 12px; text-align: center; font-style: italic; color: #666; }
</style>
