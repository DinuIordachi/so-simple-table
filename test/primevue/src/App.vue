<script setup lang="ts">
import Column from 'primevue/column';
import { SstDataTable } from '@sst/vue/primevue';
import { useBreedsTable } from './breeds-table';

const table = useBreedsTable();
const truncate = (text: string, max = 90): string => (text.length > max ? `${text.slice(0, max)}…` : text);
</script>

<template>
	<main style="max-width: 960px; margin: 24px auto; font-family: sans-serif">
		<h1>@sst/vue/primevue — smoke test</h1>
		<p>PrimeVue DataTable (Aura theme) backed by a So Simple Table store, rendering dogapi.dog.</p>
		<SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
			<Column field="name" header="Breed" />
			<Column field="description" header="Description">
				<template #body="{ data }">{{ truncate(data.description) }}</template>
			</Column>
			<Column field="life" header="Lifespan">
				<template #body="{ data }">{{ data.lifeMin }}–{{ data.lifeMax }} yrs</template>
			</Column>
		</SstDataTable>
	</main>
</template>
