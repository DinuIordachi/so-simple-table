# @sst/vue

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Vue 3 adapter for **So Simple Table**, built on top of [`@sst/core`](../core/README.md). Define a data table declaratively in one object, then render it with a fully typed `<SstTable>` component.

## Installation

```bash
npm install @sst/core @sst/vue
```

`vue` (>= 3.5) and `@sst/core` are peer dependencies. Import the bundled CSS once at your app entry:

```ts
import '@sst/vue/style.css';
```

## Quick start

Define the table once with [`defineTable`](#definetable). It builds the repository (including a default `fetch`-based HTTP client) and the reactive store for you, and returns a `useTable()` composable:

```ts
// breeds-table.ts
import { defineTable } from '@sst/vue';

export interface IBreed {
  id: string;
  name: string;
  lifeMin: number;
  lifeMax: number;
}

interface IApiResponse {
  data: Array<{ id: string; attributes: { name: string; life: { min: number; max: number } } }>;
  meta: { pagination: { records: number } };
}

export const useBreedsTable = defineTable<IBreed, IApiResponse>({
  baseUrl: 'https://api.example.com/breeds',
  initialPagination: { page: 1, pageSize: 10 },
  mapResponse: (raw) => ({
    result: raw.data.map((b) => ({
      id: b.id,
      name: b.attributes.name,
      lifeMin: b.attributes.life.min,
      lifeMax: b.attributes.life.max,
    })),
    totalCount: raw.meta.pagination.records,
    isSuccess: true,
  }),
});
```

Then consume it in a component. The `body-cell` slot receives a typed `row` — no casts needed:

```vue
<script setup lang="ts">
import { SstTable, type IColumn } from '@sst/vue';
import '@sst/vue/style.css';
import { useBreedsTable } from './breeds-table';

const table = useBreedsTable();

const columns: IColumn[] = [
  { key: 'name', name: 'Breed' },
  { key: 'life', name: 'Lifespan' },
];
</script>

<template>
  <SstTable :columns="columns" :store="table">
    <template #body-cell="{ row, column }">
      <template v-if="column.key === 'life'">{{ row.lifeMin }}–{{ row.lifeMax }} yrs</template>
      <template v-else>{{ (row as Record<string, unknown>)[column.key] }}</template>
    </template>
  </SstTable>
</template>
```

`useBreedsTable()` must be called inside `setup`; each call creates its own store, automatically disposed when the component unmounts.

## `defineTable`

```ts
defineTable<T extends { id: string }, TRaw = unknown>(config): () => IUseTableStoreReturn<T>
```

| Option              | Type                                | Default                     | Description                                                            |
| ------------------- | ----------------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `baseUrl`           | `string`                            | — (required)                | Base URL for all requests.                                             |
| `headers`           | `Record<string, string>`            | —                           | Default request headers (applied by the built-in `fetch` client).      |
| `httpClient`        | `IHttpClient`                       | `FetchHttpClient`           | Escape hatch — supply your own client for auth, interceptors, logging. |
| `mapResponse`       | `(raw: TRaw) => IResponseList<T[]>` | identity                    | Map a non-canonical API payload to the canonical list shape.           |
| `queryKeys`         | `Partial<IRepositoryQueryKeys>`     | core defaults               | Rename the page / pageSize / sort / search query parameters.           |
| `sortMap`           | `Record<string, string>`            | `{}`                        | Map a column key to a server sort field. `{}` disables server sort.    |
| `filterMap`         | `Record<string, string>`            | —                           | Map a filter key to a server parameter name.                           |
| `initialPagination` | `IPaginationParams`                 | `{ page: 1, pageSize: 10 }` | Initial page and page size.                                            |
| `paramFormatting`   | `IParamFormattingStrategy`          | —                           | Advanced filter/sort value formatting.                                 |

### Custom HTTP client

Pass `httpClient` for authentication, interceptors, or logging — anything implementing core's `IHttpClient`:

```ts
import { defineTable, FetchHttpClient } from '@sst/vue';

const useTable = defineTable<IBreed>({
  baseUrl: 'https://api.example.com/breeds',
  httpClient: new FetchHttpClient({ baseHeaders: { Authorization: `Bearer ${token}` } }),
});
```

### Backend conventions

Adapt non-canonical REST APIs without a custom client via `paginationStyle`
(`'offset'` → `skip`/`limit`), `sortStyle` (`'direction'` → `sortBy` + `order=asc|desc`,
with optional `sortDirections` tokens), and `searchEndpoint` (route search to a
sub-path):

```ts
const useProducts = defineTable<IProduct>({
  baseUrl: 'https://dummyjson.com/products',
  paginationStyle: 'offset',
  sortStyle: 'direction',
  searchEndpoint: '/search',
  queryKeys: { page: 'skip', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'order', search: 'q' },
});
```

## Lower-level: `useTableStore`

When you already have a `@sst/core` repository (or need to share one), skip `defineTable` and wire the store directly:

```ts
import { HttpRepository, useTableStore, type IColumn } from '@sst/vue';

const repository = new HttpRepository<IBreed>({ baseUrl: 'https://api.example.com/breeds' });
const table = useTableStore<IBreed>({ repository, sortMap: { name: 'ByName' } });
```

`useTableStore` returns the same `IUseTableStoreReturn<T>` that `defineTable`'s composable does: reactive refs (`data`, `total`, `loading`, `pagination`, `sort`, `filters`, `search`) and bound actions (`refresh`, `updatePagination`, `updateSort`, …).

## `<SstTable>`

### Props

| Prop                | Type                      | Default             | Description                                   |
| ------------------- | ------------------------- | ------------------- | --------------------------------------------- |
| `columns`           | `readonly IColumn[]`      | — (required)        | Column definitions.                           |
| `store`             | `IUseTableStoreReturn<T>` | — (required)        | The store from `defineTable`/`useTableStore`. |
| `bulk`              | `boolean`                 | `false`             | Show selection checkboxes + bulk toolbar.     |
| `searchEnabled`     | `boolean`                 | `false`             | Show the search input.                        |
| `searchPlaceholder` | `string`                  | `'Search'`          | Search input placeholder.                     |
| `searchDebounceMs`  | `number`                  | `500`               | Debounce before `updateSearch` fires.         |
| `emptyText`         | `string`                  | `'No results'`      | Empty-state text.                             |
| `bulkDeleteLabel`   | `string`                  | `'Delete selected'` | Bulk-delete button label.                     |

### Scoped slots

| Slot           | Slot props                                          | Purpose                          |
| -------------- | --------------------------------------------------- | -------------------------------- |
| `header-cell`  | `{ column }`                                        | Override per-column header text  |
| `body-cell`    | `{ row, column, index }`                            | Override per-cell rendering      |
| `empty-state`  | —                                                   | Override the empty-state message |
| `bulk-actions` | `{ selected: ReadonlySet<string> }`                 | Override the bulk-action toolbar |
| `pagination`   | `{ page, pageSize, total, totalPages, setPage(p) }` | Override the pagination controls |

When omitted, sensible defaults render automatically. `row` is typed as your row type `T`, so concrete field access needs no casts.

## PrimeVue (`@sst/vue/primevue`)

Render your table with PrimeVue v4's `DataTable` (lazy mode) while keeping every native DataTable feature and your app's theme. Requires `primevue` (>= 4) as a peer dependency; `@sst/vue/primevue` ships no CSS.

```vue
<script setup lang="ts">
import Column from 'primevue/column';
import { SstDataTable } from '@sst/vue/primevue';
import { useBreedsTable } from './breeds-table'; // a defineTable composable

const table = useBreedsTable();
</script>

<template>
  <SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
    <Column field="name" header="Breed" sortable />
    <Column field="life" header="Lifespan">
      <template #body="{ data }">{{ data.lifeMin }}–{{ data.lifeMax }} yrs</template>
    </Column>
  </SstDataTable>
</template>
```

Prefer full control? Use the headless composable and render `<DataTable>` yourself:

```ts
import { useSstDataTable } from '@sst/vue/primevue';
const bindings = useSstDataTable(table); // spread onto <DataTable v-bind="bindings" dataKey="id">
```

`useSstDataTable(store, options?)` maps PrimeVue's `@page` / `@sort` / `@filter` onto the store (single-column sort; global filter → search; per-column value → filters, overridable via `options.mapFilters`) and exposes `removeSelected(rows?)` for bulk delete. Pass `immediate: false` to skip the on-mount fetch.

### Editing, selection, slots, and filter helpers

- **Inline editing:** set `editMode` + editable columns and pass `onSave(edit)`. The edited row is updated optimistically and reverted if `onSave` rejects.
- **Selection:** set `selectionMode="multiple"`; read the reactive `selection` (and `selection.length`), `clearSelection()`, and `removeSelected()` (defaults to the current selection). On `<SstDataTable>` they're available via a template ref.
- **Slots:** all DataTable-level named slots (`#header`, `#footer`, `#empty`, `#expansion`, …) typecheck and forward.
- **Filter helpers:** `searchColumn(field)` (map one column's filter → search) and `withMatchModes()` (carry each filter's `matchMode` as a companion param) are exported as ready-made `mapFilters`.

```vue
<SstDataTable ref="t" :store="table" :onSave="onSave" selectionMode="multiple" editMode="cell">
  <template #header>{{ t?.selection.length ?? 0 }} selected</template>
  <Column selectionMode="multiple" headerStyle="width: 3rem" />
  <Column field="price" header="Price">
    <template #editor="{ data }"><InputNumber v-model="data.price" /></template>
  </Column>
</SstDataTable>
```

### Responsive layouts

Below a configurable width, render your own layout per Tailwind breakpoint instead of the table. Define any of `#xs` (<640), `#sm` (≥640), `#md` (≥768), `#lg` (≥1024), `#xl` (≥1280), `#2xl` (≥1536). A slot applies from its width up to the next defined slot (mobile-first cascade); at/above `tableBreakpoint` (default `lg`, or `'none'` to never show the table) the DataTable renders. If no slot covers the current width, the table renders. Each slot receives `{ rows, loading, store }`.

```vue
<SstDataTable :store="table" table-breakpoint="lg">
  <Column field="name" header="Name" />

  <!-- < lg: each row becomes a card; cascades up from xs -->
  <template #xs="{ rows, loading, store }">
    <article v-for="row in rows" :key="row.id" class="card">{{ row.name }}</article>
    <button @click="store.updatePagination({ page: store.pagination.value.page + 1 })">More</button>
  </template>
</SstDataTable>
```

The `useBreakpoint()` composable (current Tailwind breakpoint, SSR-safe) is also exported for standalone use.

## Links

- [So Simple Table monorepo](https://github.com/DinuIordachi/so-simple-table)
- [`@sst/core`](../core/README.md) — the framework-agnostic core
- [Changelog](./CHANGELOG.md)

## License

[MIT](./LICENSE) © Dinu Iordachi
