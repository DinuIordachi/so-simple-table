<script setup lang="ts">
import { ref } from 'vue';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import type { DataTableFilterMeta } from 'primevue/datatable';
import { SstDataTable } from '@sst/vue/primevue';
import { useProductsTable } from './products-table';

const table = useProductsTable();

// PrimeVue row-filter state for the Title column.
const filters = ref<{ title: { value: string | null; matchMode: string } }>({
	title: { value: null, matchMode: 'contains' },
});

// Map PrimeVue's per-column "title" filter to the store's search (dummyjson /search?q=).
const mapFilters = (f: DataTableFilterMeta): { search?: string } => {
	const meta = f['title'] as { value?: unknown } | undefined;
	const value = meta?.value;
	return { search: value !== null && value !== undefined && value !== '' ? String(value) : '' };
};
</script>

<template>
	<main style="max-width: 1040px; margin: 24px auto; font-family: sans-serif">
		<h1>@sst/vue/primevue — smoke test</h1>
		<p>
			PrimeVue DataTable (Aura theme) backed by a So Simple Table store, rendering
			<a href="https://dummyjson.com/docs/products" target="_blank" rel="noopener">dummyjson.com</a> products with
			server-side pagination, sorting, and search.
		</p>

		<SstDataTable
			:store="table"
			:mapFilters="mapFilters"
			v-model:filters="filters"
			paginator
			:rows="10"
			:rowsPerPageOptions="[10, 20, 50]"
			filterDisplay="row"
		>
			<Column field="title" header="Title" sortable :showFilterMenu="false">
				<template #filter="{ filterModel, filterCallback }">
					<InputText v-model="filterModel.value" placeholder="Search title…" @input="filterCallback()" />
				</template>
			</Column>
			<Column field="brand" header="Brand" sortable />
			<Column field="category" header="Category" sortable />
			<Column field="price" header="Price" sortable>
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
			</Column>
			<Column field="rating" header="Rating" sortable>
				<template #body="{ data }">{{ data.rating.toFixed(2) }} ★</template>
			</Column>
			<Column field="stock" header="Stock" sortable />
		</SstDataTable>
	</main>
</template>
