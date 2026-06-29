<script setup lang="ts">
import Column from 'primevue/column';
import { defineTable } from '@bridgebyte/sst-vue';
import { SstDataTable } from '@bridgebyte/sst-vue/primevue';
import { DUMMY_BASE, DUMMY_QUERY_KEYS, mapProducts, type IDummyResponse, type IProduct } from '../data/products';

// The minimal setup: a declarative `defineTable` + `<SstDataTable>`. The store
// owns pagination and fetches lazily; DummyJSON's skip/limit wire format is
// adapted by the declarative options (no custom HTTP client).
const useTable = defineTable<IProduct, IDummyResponse>({
	baseUrl: DUMMY_BASE,
	paginationStyle: 'offset',
	queryKeys: DUMMY_QUERY_KEYS,
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: mapProducts,
});
const table = useTable();
</script>

<template>
	<section>
		<h2>1 · Basic table</h2>
		<p>
			The minimal setup — <code>defineTable({ baseUrl })</code> + <code>&lt;SstDataTable&gt;</code> with columns.
			The store drives server-side pagination automatically.
		</p>

		<SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
			<Column field="title" header="Title" />
			<Column field="brand" header="Brand" />
			<Column field="category" header="Category" />
			<Column field="price" header="Price">
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
			</Column>
			<Column field="stock" header="Stock" />
		</SstDataTable>
	</section>
</template>
