<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { defineTable } from '@bridgebyte/sst-vue';
import { SstDataTable, useSstFilters } from '@bridgebyte/sst-vue/primevue';
import { toProduct, type IDummyResponse, type IProduct } from '../data/products';

// Filtering demo. To keep it working end-to-end against DummyJSON (which has no
// generic per-column filter params), we fetch the full set once and filter it
// client-side inside `fetchData` from the store's filter state.
let cache: IProduct[] | null = null;
async function allProducts(): Promise<IProduct[]> {
	if (!cache) {
		const res = await fetch('https://dummyjson.com/products?limit=0').then((r) => r.json());
		cache = (res.products as IDummyResponse['products']).map(toProduct);
	}
	return cache;
}

const useTable = defineTable<IProduct>({
	initialPagination: { page: 1, pageSize: 10 },
	fetchData: async ({ pagination, filters }) => {
		const all = await allProducts();
		const title = filters.find((f) => f.key === 'title')?.value?.toLowerCase();
		const category = filters.find((f) => f.key === 'category')?.value;
		let rows = all;
		if (title) rows = rows.filter((p) => p.title.toLowerCase().includes(title));
		if (category) rows = rows.filter((p) => p.category === category);
		const skip = (pagination.page - 1) * pagination.pageSize;
		return { data: rows.slice(skip, skip + pagination.pageSize), total: rows.length };
	},
});
const table = useTable();

// useSstFilters owns the PrimeVue v-model:filters model. Column-filter edits flow
// to the store via the table's @filter; `reset()` clears the menus + re-fetches.
// Destructure so `filters` is a top-level ref (auto-unwrapped in the template).
const { filters, reset, activeFilterCount } = useSstFilters(
	[
		{ field: 'title', matchMode: 'contains', value: null },
		{ field: 'category', matchMode: 'equals', value: null },
	],
	{ store: table },
);

const categories = ref<string[]>([]);
onMounted(async () => {
	categories.value = await fetch('https://dummyjson.com/products/category-list').then((r) => r.json());
});
</script>

<template>
	<section>
		<h2>4 · Filtering (useSstFilters)</h2>
		<p>
			<code>useSstFilters</code> manages PrimeVue's <code>v-model:filters</code> model (per-field value + match mode).
			Type in a column filter or pick a category; <strong>Reset</strong> clears the menus and re-fetches.
		</p>

		<div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center">
			<Button
				label="Reset filters"
				size="small"
				severity="secondary"
				:badge="String(activeFilterCount)"
				@click="reset()"
			/>
			<span>{{ activeFilterCount }} active filter(s)</span>
		</div>

		<SstDataTable
			:store="table"
			v-model:filters="filters"
			filterDisplay="row"
			paginator
			:rows="10"
			:rowsPerPageOptions="[10, 20, 50]"
		>
			<Column field="title" header="Title" :showFilterMenu="false">
				<template #filter="{ filterModel, filterCallback }">
					<InputText v-model="filterModel.value" placeholder="Filter title…" @input="filterCallback()" />
				</template>
			</Column>
			<Column field="category" header="Category" :showFilterMenu="false">
				<template #filter="{ filterModel, filterCallback }">
					<Select
						v-model="filterModel.value"
						:options="categories"
						placeholder="Any category"
						show-clear
						@change="filterCallback()"
					/>
				</template>
			</Column>
			<Column field="price" header="Price">
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
			</Column>
			<Column field="stock" header="Stock" />
		</SstDataTable>
	</section>
</template>
