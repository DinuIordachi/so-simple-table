<script setup lang="ts">
import Column from 'primevue/column';
import { defineTable } from '@bridgebyte/sst-vue';
import { SstDataTable } from '@bridgebyte/sst-vue/primevue';
import { toProduct, type IProduct } from '../data/products';

interface IProductWithSeller extends IProduct {
	seller: string;
}

// Custom-fetch path: we own the request. Here we hit TWO endpoints in parallel —
// the products page AND the users list — and merge a (demo) "seller" onto every
// row before returning { data, total }. None of the HTTP/param-mapping options
// apply on this path; `catchError` still surfaces failures.
const useTable = defineTable<IProductWithSeller>({
	initialPagination: { page: 1, pageSize: 10 },
	catchError: (error) => console.error('[demo] custom fetch failed', error),
	fetchData: async ({ pagination }) => {
		const limit = pagination.pageSize;
		const skip = (pagination.page - 1) * pagination.pageSize;

		const [productsRes, usersRes] = await Promise.all([
			fetch(`https://dummyjson.com/products?limit=${limit}&skip=${skip}`).then((r) => r.json()),
			fetch('https://dummyjson.com/users?limit=30&select=firstName,lastName').then((r) => r.json()),
		]);

		const users: Array<{ firstName: string; lastName: string }> = usersRes.users ?? [];
		const data: IProductWithSeller[] = (productsRes.products ?? []).map(
			(p: Parameters<typeof toProduct>[0], i: number) => ({
				...toProduct(p),
				seller: users.length ? `${users[i % users.length].firstName} ${users[i % users.length].lastName}` : '—',
			}),
		);

		return { data, total: productsRes.total ?? data.length };
	},
});
const table = useTable();
</script>

<template>
	<section>
		<h2>2 · Custom fetch (two endpoints)</h2>
		<p>
			Override the fetch with <code>fetchData</code> — get the raw table state, return <code>{ data, total }</code>.
			This one fetches <code>/products</code> and <code>/users</code> in parallel and merges a demo
			<strong>Seller</strong> column from the second endpoint.
		</p>

		<SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
			<Column field="title" header="Title" />
			<Column field="category" header="Category" />
			<Column field="seller" header="Seller (from /users)" />
			<Column field="price" header="Price">
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
			</Column>
		</SstDataTable>
	</section>
</template>
