<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { SstTable, useTableStore, type IColumn } from '@sst/vue';
import '@sst/vue/style.css';
import { breedRepository, callLog, callLogListeners, type IBreed } from './breed-repository';

const columns: IColumn[] = [
	{ key: 'name', name: 'Breed' },
	{ key: 'description', name: 'Description' },
	{ key: 'hypoallergenic', name: 'Hypoallergenic' },
	{ key: 'life', name: 'Lifespan' },
];

const store = useTableStore<IBreed>({
	repository: breedRepository,
	sortMap: {}, // dogapi doesn't support sort
	initialPagination: { page: 1, pageSize: 10 },
	queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
});

const log = ref<string>('');
const updateLog = (): void => { log.value = callLog.slice(-20).join('\n'); };
onMounted(() => callLogListeners.add(updateLog));
onUnmounted(() => callLogListeners.delete(updateLog));

const truncate = (text: string, max = 90): string => (text.length > max ? `${text.slice(0, max)}…` : text);
</script>

<template>
	<main>
		<header>
			<h1>@sst/vue — browser smoke test</h1>
			<p>
				Renders <a href="https://dogapi.dog/api/v2/breeds" target="_blank" rel="noopener">dogapi.dog</a>
				through <code>&lt;SstTable&gt;</code>.
			</p>
		</header>

		<SstTable :columns="columns" :store="store">
			<template #body-cell="{ row, column }">
				<template v-if="column.key === 'description'">
					<span class="description">{{ truncate((row as IBreed).description) }}</span>
				</template>
				<template v-else-if="column.key === 'hypoallergenic'">
					<span class="badge" :class="(row as IBreed).hypoallergenic ? 'badge--yes' : 'badge--no'">
						{{ (row as IBreed).hypoallergenic ? 'YES' : 'no' }}
					</span>
				</template>
				<template v-else-if="column.key === 'life'">
					<span>{{ (row as IBreed).lifeMin }}–{{ (row as IBreed).lifeMax }} yrs</span>
				</template>
				<template v-else>
					<span>{{ (row as unknown as Record<string, unknown>)[column.key] }}</span>
				</template>
			</template>
		</SstTable>

		<details>
			<summary>HTTP call log</summary>
			<pre>{{ log }}</pre>
		</details>
	</main>
</template>
