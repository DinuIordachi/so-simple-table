# @sst/vue

Vue 3 adapter for **So Simple Table**, built on top of [`@sst/core`](../core/README.md).

## Installation

```bash
npm install @sst/core @sst/vue
```

Import the bundled CSS once at app entry:

```ts
import '@sst/vue/style.css';
```

## 1. Define a repository

```ts
import { HttpRepository } from '@sst/vue';

interface IStrategy { id: string; name: string; createdAt: string; }

export class StrategyRepository extends HttpRepository<IStrategy> {}

export const strategyRepository = new StrategyRepository({
	baseUrl: 'https://api.example.com/strategies',
});
```

## 2. Use the composable + component

```vue
<script setup lang="ts">
import { SstTable, useTableStore, type IColumn } from '@sst/vue';
import { strategyRepository } from './strategies.repository';

interface IStrategy { id: string; name: string; createdAt: string; }

const columns: IColumn[] = [
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'createdAt', name: 'Created' },
];

const store = useTableStore<IStrategy>({
	repository: strategyRepository,
	sortMap: { createdAt: 'ByCreationDate', name: 'ByName' },
});
</script>

<template>
	<SstTable :columns="columns" :store="store" :bulk="true" :searchEnabled="true">
		<template #header-cell="{ column }">
			<strong>{{ column.name }}</strong>
		</template>
		<template #body-cell="{ row, column }">
			{{ row[column.key] }}
		</template>
		<template #empty-state>
			<p>No strategies yet — try creating one.</p>
		</template>
	</SstTable>
</template>
```

## Customizing the wire format

```ts
new HttpRepository({
	baseUrl: 'https://api.example.com/strategies',
	queryKeys: { page: 'pageNumber', pageSize: 'limit' },
	responseListMapper: (raw) => {
		const r = raw as { items: IStrategy[]; total: number };
		return { result: r.items, totalCount: r.total, isSuccess: true };
	},
});
```

## Scoped slots

`<SstTable>` exposes five slots for full UI override:

| Slot            | Slot props                                                                | Purpose                                |
| --------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| `header-cell`   | `{ column }`                                                              | Override per-column header text        |
| `body-cell`     | `{ row, column, index }`                                                  | Override per-cell rendering            |
| `empty-state`   | —                                                                         | Override the empty-state message       |
| `bulk-actions`  | `{ selected: ReadonlySet<string> }`                                       | Override the bulk-action toolbar       |
| `pagination`    | `{ page, pageSize, total, totalPages, setPage(p) }`                       | Override the pagination controls       |

When omitted, sensible defaults render automatically.

## License

MIT
