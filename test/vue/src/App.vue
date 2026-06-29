<script setup lang="ts">
import { SstTable, type IColumn } from '@bridgebyte/sst-vue';
import '@bridgebyte/sst-vue/style.css';
import { useBreedTable } from './breed-table';

const columns: IColumn[] = [
	{ key: 'name', name: 'Breed' },
	{ key: 'description', name: 'Description' },
	{ key: 'hypoallergenic', name: 'Hypoallergenic' },
	{ key: 'life', name: 'Lifespan' },
];

const table = useBreedTable();

const truncate = (text: string, max = 90): string => (text.length > max ? `${text.slice(0, max)}…` : text);
</script>

<template>
	<main>
		<header>
			<h1>@bridgebyte/sst-vue — browser smoke test</h1>
			<p>
				Renders <a href="https://dogapi.dog/api/v2/breeds" target="_blank" rel="noopener">dogapi.dog</a>
				through <code>&lt;SstTable&gt;</code>.
			</p>
		</header>

		<SstTable :columns="columns" :store="table">
			<template #body-cell="{ row, column }">
				<template v-if="column.key === 'description'">
					<span class="description">{{ truncate(row.description) }}</span>
				</template>
				<template v-else-if="column.key === 'hypoallergenic'">
					<span class="badge" :class="row.hypoallergenic ? 'badge--yes' : 'badge--no'">
						{{ row.hypoallergenic ? 'YES' : 'no' }}
					</span>
				</template>
				<template v-else-if="column.key === 'life'">
					<span>{{ row.lifeMin }}–{{ row.lifeMax }} yrs</span>
				</template>
				<template v-else>
					<span>{{ (row as unknown as Record<string, unknown>)[column.key] }}</span>
				</template>
			</template>
		</SstTable>
	</main>
</template>
