<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import Button from 'primevue/button';
import BasicTable from './examples/BasicTable.vue';
import CustomFetchTable from './examples/CustomFetchTable.vue';
import SortingTable from './examples/SortingTable.vue';
import FilteringTable from './examples/FilteringTable.vue';

const pages: ReadonlyArray<{ id: string; label: string; component: Component }> = [
	{ id: 'basic', label: '1 · Basic', component: BasicTable },
	{ id: 'fetch', label: '2 · Custom fetch', component: CustomFetchTable },
	{ id: 'sort', label: '3 · Sorting', component: SortingTable },
	{ id: 'filter', label: '4 · Filtering', component: FilteringTable },
];

const current = ref('basic');
const currentComponent = computed(() => pages.find((p) => p.id === current.value)?.component ?? BasicTable);
</script>

<template>
	<main style="max-width: 1040px; margin: 24px auto; font-family: sans-serif; padding: 0 16px">
		<h1>@bridgebyte/sst-vue/primevue — examples</h1>
		<p>
			Each page is a focused example backed by a So Simple Table store and a PrimeVue DataTable (Aura theme),
			rendering <a href="https://dummyjson.com/docs/products" target="_blank" rel="noopener">dummyjson.com</a> data.
		</p>

		<nav style="display: flex; gap: 8px; margin: 16px 0 24px">
			<Button
				v-for="page in pages"
				:key="page.id"
				:label="page.label"
				size="small"
				:severity="page.id === current ? 'primary' : 'secondary'"
				:outlined="page.id !== current"
				@click="current = page.id"
			/>
		</nav>

		<component :is="currentComponent" />
	</main>
</template>
