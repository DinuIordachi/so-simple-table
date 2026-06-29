# Design: `@bridgebyte/sst-vue/primevue` — PrimeVue DataTable integration

**Date:** 2026-06-24
**Status:** Approved (design)
**Scope:** Add a `@bridgebyte/sst-vue/primevue` subpath export that binds a So Simple Table `TableStore` to PrimeVue **v4** `DataTable` in lazy mode, preserving all native DataTable features and the host app's theme. Add a `test/primevue` smoke app and unit tests. No `@bridgebyte/sst-core` changes; `@bridgebyte/sst-react` untouched.

## Motivation

`@bridgebyte/sst-vue` ships its own `<SstTable>`. Consumers already invested in **PrimeVue** want So Simple Table's reactive data layer (repository + pagination/sort/filter/search + bulk delete) **inside** PrimeVue's `DataTable`, so the table matches their existing theme (PrimeVue v4 styled-mode presets / `pt` passthrough) and keeps every native DataTable feature (templating, frozen/scrollable columns, row expansion, selection, etc.).

PrimeVue's `DataTable` **lazy mode** is the natural seam: set `:lazy`, supply `:value` / `:totalRecords` / `:loading`, and handle `@page` / `@sort` / `@filter`. That maps directly onto `TableStore`.

## Decisions (from the grilling session)

- **API: both** — a headless composable `useSstDataTable` (the core) and a thin `<SstDataTable>` wrapper built on it.
- **PrimeVue v4 only**; `primevue` is an **optional** peer dependency. We ship **zero CSS**; theming comes entirely from the host (`PrimeVue` plugin preset, `pt`, `unstyled`).
- **Single-column sort** — round-trips through `TableStore`'s existing single `ISortParams`. No core changes.
- **Filtering:** value-based default + a `mapFilters` escape hatch. Global filter → `search`; per-column values → `store.filters` (matchMode dropped by default); `mapFilters` overrides for full control.
- **Selection:** stays 100% native PrimeVue; the adapter exposes a `removeSelected(rows)` helper that calls `store.bulkDelete(ids)` + refresh.
- **Initial load:** auto `store.refresh()` on mount, opt-out via `immediate: false`.
- **Names:** `useSstDataTable`, `SstDataTable`.
- **Verification:** `test/primevue` smoke app (Vite + Vue + PrimeVue v4 + a theme preset) consumed via local Verdaccio, plus Vitest unit tests.

## Public API (exported only from `@bridgebyte/sst-vue/primevue`)

```ts
import type { DataTableFilterMeta, DataTablePageEvent, DataTableSortEvent, DataTableFilterEvent } from 'primevue/datatable';
import type { IFilterParams, IResponse } from '@bridgebyte/sst-core';
import type { IUseTableStoreReturn } from '@bridgebyte/sst-vue';

export interface IUseSstDataTableOptions<T extends { id: string }> {
  /** Call store.refresh() on mount (PrimeVue lazy does not auto-fetch). Default true. */
  readonly immediate?: boolean;
  /** Debounce (ms) before a @filter is pushed to the store. Default 300. */
  readonly filterDebounceMs?: number;
  /** Override how PrimeVue's filter object maps to store search/filters (e.g. to encode matchMode). */
  readonly mapFilters?: (filters: DataTableFilterMeta) => { search?: string; filters?: IFilterParams[] };
}

/** Reactive, v-bind-able bag of DataTable props + handlers. */
export interface ISstDataTableBindings<T extends { id: string }> {
  readonly lazy: true;
  readonly value: readonly T[];
  readonly totalRecords: number;
  readonly loading: boolean;
  readonly first: number;     // (page - 1) * pageSize
  readonly rows: number;      // pageSize
  readonly sortField: string | undefined;
  readonly sortOrder: number | undefined; // 1 | -1
  onPage(event: DataTablePageEvent): void;
  onSort(event: DataTableSortEvent): void;
  onFilter(event: DataTableFilterEvent): void;
  removeSelected(rows: T | readonly T[]): Promise<IResponse<string>>;
}

export function useSstDataTable<T extends { id: string }>(
  store: IUseTableStoreReturn<T>,
  options?: IUseSstDataTableOptions<T>,
): ISstDataTableBindings<T>;
```

`<SstDataTable>` props: `store: IUseTableStoreReturn<T>` (required), `immediate?`, `filterDebounceMs?`, `mapFilters?`. It is generic (`T extends { id: string }`), `inheritAttrs: false`, forwards `$attrs` and **all** slots, defaults `dataKey="id"` (overridable), and lazy bindings win over attrs so pagination/sort stay correct.

## Behavior mapping

| PrimeVue | Store action |
| --- | --- |
| `@page` `{ page (0-based), rows }` | `updatePagination({ page: page + 1, pageSize: rows })` |
| `@sort` `{ sortField, sortOrder (1/-1) }` | `updateSort({ id, field, order })` with `1→ASC`, `-1→DESC`; null `sortField` → `updateSort(undefined)` |
| `@filter` `{ filters }` | default: `filters.global.value` → `updateSearch`; other entries' `.value` → `updateFilter([{ key, value }])`; resets to page 1. `mapFilters` overrides. Debounced by `filterDebounceMs`. |
| `:value` / `:totalRecords` / `:loading` | `store.data` / `store.total` / `store.loading` |
| `:first` / `:rows` | derived from `store.pagination` |
| `:sortField` / `:sortOrder` | derived from `store.sort` |
| selection (native) | `removeSelected(rows)` → `store.bulkDelete(rows.map(r => r.id))` (store refreshes) |

The bindings object is a `reactive` with getters over the store refs, so `v-bind="bindings"` stays live.

## Component usage (target)

```ts
// breeds-table.ts  (unchanged @bridgebyte/sst-vue surface)
import { defineTable } from '@bridgebyte/sst-vue';
export const useBreedsTable = defineTable<IBreed, IApiResponse>({ baseUrl: '...', mapResponse: ... });
```

Wrapper:

```vue
<script setup lang="ts">
import Column from 'primevue/column';
import { SstDataTable } from '@bridgebyte/sst-vue/primevue';
import { useBreedsTable } from './breeds-table';
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

Headless:

```vue
<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useSstDataTable } from '@bridgebyte/sst-vue/primevue';
import { useBreedsTable } from './breeds-table';
const table = useBreedsTable();
const bindings = useSstDataTable(table);
</script>

<template>
  <DataTable v-bind="bindings" dataKey="id" paginator :rows="10">
    <Column field="name" header="Breed" sortable />
  </DataTable>
</template>
```

## Packaging

- **`packages/vue/package.json`**
  - `exports["./primevue"]` → `{ types: ./dist/primevue/index.d.ts, import: ./dist/primevue.js, require: ./dist/primevue.cjs }`.
  - `peerDependencies.primevue: "^4.0.0"` + `peerDependenciesMeta.primevue.optional: true`.
  - `devDependencies`: `primevue ^4` (to compile/typecheck/test the wrapper).
  - `sideEffects` already covers `.vue`/`.css`.
- **`packages/vue/vite.config.ts`** — switch `lib.entry` to an object `{ index, primevue }`; `fileName: (format, name) => \`${name}.${format === 'es' ? 'js' : 'cjs'}\``; drop UMD `name`; extend `external` to also exclude `primevue`, `primevue/*`, `@primevue/*`.
- The `primevue` entry imports only `primevue/datatable` (runtime, external) + Vue + **type-only** imports from `@bridgebyte/sst-core` / `../composables/use-table-store`, so it shares no runtime chunk with the main entry and `@bridgebyte/sst-vue` (plain) pulls zero PrimeVue.

## Files

- **Add** `packages/vue/src/primevue/use-sst-data-table.ts` — the composable.
- **Add** `packages/vue/src/primevue/SstDataTable.vue` — the wrapper.
- **Add** `packages/vue/src/primevue/index.ts` — subpath barrel (`@packageDocumentation`).
- **Add** `packages/vue/src/primevue/use-sst-data-table.test.ts` — unit tests.
- **Modify** `packages/vue/package.json` (exports, peer/dev deps), `packages/vue/vite.config.ts` (multi-entry).
- **Modify** `packages/vue/README.md` (PrimeVue section) and `packages/vue/CHANGELOG.md` ([Unreleased]).
- **Add** `test/primevue/` — `package.json` (+ `.npmrc`), `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts` (PrimeVue plugin + Aura preset), `src/App.vue`, `src/breeds-table.ts`.

## Testing

- **Unit (`use-sst-data-table.test.ts`)** — mount a tiny harness component that calls `useSstDataTable(stubStore)` so `onMounted` fires:
  - `immediate` default → `store.refresh()` called once on mount; `immediate:false` → not called.
  - `onPage({ page: 2, rows: 25, ... })` → `updatePagination({ page: 3, pageSize: 25 })`.
  - `onSort({ sortField: 'name', sortOrder: -1 })` → `updateSort({ field: 'name', order: DESC })`; `sortField: null` → `updateSort(undefined)`.
  - `onFilter` with `{ global: { value: 'x' }, name: { value: 'y' } }` → `updateSearch('x')` + `updateFilter([{ key: 'name', value: 'y' }])` (after debounce); `mapFilters` override respected.
  - `removeSelected([{ id: '1' }])` → `store.bulkDelete(['1'])`.
  - Bindings reflect store refs (`value`/`totalRecords`/`loading`/`first`/`rows`/`sortField`/`sortOrder`).
- **Wrapper smoke (Vitest + @vue/test-utils)** — mount `<SstDataTable :store>` with the PrimeVue plugin installed in `global.plugins`; assert it renders a `DataTable` and forwards a default-slot `<Column>`.
- **Build/typecheck** — `nx run vue:typecheck`/`build`; confirm `dist/primevue.{js,cjs}` and `dist/primevue/index.d.ts` exist and `dist/index.*` has no `primevue` import.
- **E2E** — `test/primevue` builds and renders against the published package via Verdaccio; verify pagination + single sort hit the API and the table inherits the Aura theme.

## Out of scope

- Multi-column sort (would require extending `@bridgebyte/sst-core`).
- A PrimeVue adapter for non-table widgets.
- Shipping or bundling any PrimeVue theme/CSS.
- `@bridgebyte/sst-core`, `@bridgebyte/sst-ng`, `@bridgebyte/sst-dom`, `@bridgebyte/sst-react` changes.

## Success criteria

- `import { SstDataTable, useSstDataTable } from '@bridgebyte/sst-vue/primevue'` works; plain `@bridgebyte/sst-vue` imports pull no PrimeVue.
- A consumer renders a fully themed PrimeVue DataTable backed by a `TableStore`, with working lazy pagination/sort/filter/search and native columns/slots/selection intact.
- Unit tests pass; `test/primevue` builds and renders against the published package.
