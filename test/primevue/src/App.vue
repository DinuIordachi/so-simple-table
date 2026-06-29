<script setup lang="ts">
import { ref } from 'vue';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { SstDataTable, searchColumn } from '@bridgebyte/sst-vue/primevue';
import { useProductsTable, type IProduct } from './products-table';

const table = useProductsTable();
// SstDataTable is a generic component, so InstanceType doesn't apply — type the
// template ref by the exposed API shape instead.
const tableRef = ref<{
	selection: readonly IProduct[];
	clearSelection: () => void;
	removeSelected: (rows?: IProduct | readonly IProduct[]) => Promise<unknown>;
} | null>(null);

// PrimeVue row-filter state for the Title column.
const filters = ref<{ title: { value: string | null; matchMode: string } }>({
	title: { value: null, matchMode: 'contains' },
});

// Persist an edited price to dummyjson (echoes the update; does not truly store).
const onSave = async ({ row, newData }: { row: IProduct; newData: IProduct }): Promise<void> => {
	await fetch(`https://dummyjson.com/products/${row.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ price: newData.price }),
	});
};
</script>

<template>
	<main style="max-width: 1040px; margin: 24px auto; font-family: sans-serif">
		<h1>@bridgebyte/sst-vue/primevue — smoke test</h1>
		<p>
			PrimeVue DataTable (Aura theme) backed by a So Simple Table store, rendering
			<a href="https://dummyjson.com/docs/products" target="_blank" rel="noopener">dummyjson.com</a> products with
			server-side pagination, sorting, search, selection, and inline price editing.
		</p>

		<SstDataTable
			ref="tableRef"
			:store="table"
			table-breakpoint="lg"
			:mapFilters="searchColumn('title')"
			:onSave="onSave"
			v-model:filters="filters"
			selectionMode="multiple"
			editMode="cell"
			paginator
			:rows="10"
			:rowsPerPageOptions="[10, 20, 50]"
			filterDisplay="row"
		>
			<template #xs="{ rows, loading, store }">
				<div v-if="loading" style="padding: 16px">Loading…</div>
				<Card v-for="row in rows" :key="row.id" style="margin-bottom: 8px">
					<template #title>{{ row.title }}</template>
					<template #subtitle>{{ row.brand }} · {{ row.category }}</template>
					<template #content>
						${{ row.price.toFixed(2) }} · {{ row.rating.toFixed(2) }} ★ · stock {{ row.stock }}
					</template>
				</Card>
				<button
					style="margin-top: 8px"
					:disabled="loading"
					@click="store.setPage(store.pagination.value.page + 1)"
				>
					Load next page
				</button>
			</template>
			<template #header>
				<div style="display: flex; gap: 12px; align-items: center; justify-content: flex-end">
					<span>{{ tableRef?.selection.length ?? 0 }} selected</span>
					<Button label="Clear" size="small" severity="secondary" @click="tableRef?.clearSelection()" />
				</div>
			</template>
			<Column selectionMode="multiple" headerStyle="width: 3rem" />
			<Column field="title" header="Title" sortable :showFilterMenu="false">
				<template #filter="{ filterModel, filterCallback }">
					<InputText v-model="filterModel.value" placeholder="Search title…" @input="filterCallback()" />
				</template>
			</Column>
			<Column field="brand" header="Brand" sortable />
			<Column field="category" header="Category" sortable />
			<Column field="price" header="Price" sortable>
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
				<template #editor="{ data }">
					<InputNumber v-model="data.price" mode="currency" currency="USD" fluid />
				</template>
			</Column>
			<Column field="rating" header="Rating" sortable>
				<template #body="{ data }">{{ data.rating.toFixed(2) }} ★</template>
			</Column>
			<Column field="stock" header="Stock" sortable />
		</SstDataTable>
	</main>
</template>
