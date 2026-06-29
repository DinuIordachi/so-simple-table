<script setup lang="ts">
import Column from 'primevue/column';
import { defineTable } from '@bridgebyte/sst-vue';
import { SstDataTable } from '@bridgebyte/sst-vue/primevue';
import { DUMMY_BASE, DUMMY_QUERY_KEYS, mapProducts, type IDummyResponse, type IProduct } from '../data/products';

// Server-side sorting: clicking a sortable header updates the store's sort state,
// which maps to DummyJSON's `sortBy` + `order=asc|desc` (via sortStyle + sortMap)
// and re-fetches. `sortMap` whitelists which columns sort on the server.
const useTable = defineTable<IProduct, IDummyResponse>({
	baseUrl: DUMMY_BASE,
	paginationStyle: 'offset',
	sortStyle: 'direction',
	queryKeys: DUMMY_QUERY_KEYS,
	sortMap: { title: 'title', price: 'price', rating: 'rating', stock: 'stock' },
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: mapProducts,
});
const table = useTable();
</script>

<template>
	<section>
		<h2>3 · Sorting</h2>
		<p>
			Click a sortable column header to sort on the server. Current sort:
			<strong>{{ table.sort.value ? `${table.sort.value.field} · ${table.sort.value.order}` : 'none' }}</strong>
		</p>

		<SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
			<Column field="title" header="Title" sortable />
			<Column field="brand" header="Brand" />
			<Column field="category" header="Category" />
			<Column field="price" header="Price" sortable>
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
			</Column>
			<Column field="rating" header="Rating" sortable>
				<template #body="{ data }">{{ data.rating.toFixed(2) }} ★</template>
			</Column>
			<Column field="stock" header="Stock" sortable />
		</SstDataTable>
	</section>
</template>
