# Design: `defineTable` ergonomic API for `@bridgebyte/sst-vue`

**Date:** 2026-06-24
**Status:** Approved (design)
**Scope:** Add a declarative `defineTable` factory to `@bridgebyte/sst-vue` and rewrite the `test/vue` smoke-test app to use it, bringing Vue consumer DX to parity with the Angular adapter.

## Motivation

The Angular smoke-test app (`test/ng`) is clean: a consumer subclasses `SstNgRepository` (overriding `baseUrl` / `queryKeys` / `responseListMapper`), subclasses `SstTableService`, defines a columns array, and renders `<sst-table>`. The HTTP client is injected via Angular DI (`NgHttpClient`), and templates are loosely typed so no casts are needed.

The Vue smoke-test app (`test/vue`) currently looks much harder, but most of that is the **example doing unnecessary work**, not an API deficiency:

1. **Hand-written `JsonApiHttpClient` (~22 lines) is unnecessary.** `HttpListRepository` already defaults `httpClient` to core's `FetchHttpClient`
   ([packages/core/src/repositories/http-list.repository.ts:23](../../../packages/core/src/repositories/http-list.repository.ts)),
   which handles query strings, headers, errors, 204s, and JSON parsing — and accepts a `baseHeaders` option for the JSON:API `Accept` header. The custom client existed only to feed the "HTTP call log" panel (test instrumentation).
2. **The `getList` override stripping `orderBy`/`orderByDescending`/`name` is unnecessary.** The same "no sort/search params" result is achieved declaratively with `sortMap: {}` — `mapTableParams` only emits sort params when `sortMap[field]` exists
   ([packages/core/src/store/map-table-params.ts:35](../../../packages/core/src/store/map-table-params.ts)), and search is off by default in `SstTable`.
3. **The `(row as IBreed)` casts are unnecessary.** `SstTable.vue` is already a generic component (`generic="T extends { id: string }"`) with the `body-cell` slot typed `row: T`. Verified: removing the casts compiles cleanly except for the genuine dynamic-key access `row[column.key]` in the default cell, which legitimately needs one localized cast.

The one **genuine gap**: Angular offers an "inherit a service + override" model via base classes + DI. Vue is composition-based, so even a clean version is two steps with overlapping config (build a repository **and** create the store). There is no single declarative "define my table" entry point.

## Goal

Provide a single declarative factory so a Vue consumer defines a table in one object literal and consumes a fully typed composable — as comfortable as the Angular path — and make `test/vue` the showcase for it.

## Decisions (from brainstorming)

- **API shape:** `defineTable<T>(config)` returns a `useTable()` composable (Approach A). Each `useTable()` call creates a fresh store, auto-disposed via `onScopeDispose`, mirroring Angular's per-`@Injectable()` instance lifecycle.
- **CRUD scope:** List-only for now (covers `SstTable`'s needs: list + `bulkDelete`, matching `HttpListRepository`). Full CRUD can be added later (YAGNI).
- **HTTP call log panel:** Removed from the cleaned example — it only existed to justify the custom client, and the Angular example has no equivalent. The `httpClient` escape hatch is documented for logging/interceptors/auth.

## Public API

New file `packages/vue/src/lib/composables/define-table.ts`, re-exported from `packages/vue/src/index.ts`.

```ts
export interface IDefineTableConfig<T extends { id: string }, TRaw = unknown> {
  // repository / HTTP
  baseUrl: string;
  headers?: Record<string, string>; // → FetchHttpClient baseHeaders
  httpClient?: IHttpClient; // escape hatch; overrides headers-based default
  mapResponse?: (raw: TRaw) => IResponseList<T[]>; // typed-input responseListMapper
  queryKeys?: Partial<IRepositoryQueryKeys>;
  // store
  sortMap?: Readonly<Record<string, string>>; // default {} → no server-side sort
  filterMap?: Readonly<Record<string, string>>;
  initialPagination?: IPaginationParams;
  paramFormatting?: IParamFormattingStrategy;
}

export function defineTable<T extends { id: string }, TRaw = unknown>(
  config: IDefineTableConfig<T, TRaw>,
): () => IUseTableStoreReturn<T>;
```

- `T extends { id: string }` matches `SstTable`'s constraint, so `:store` carries the row type into the `body-cell` slot (no casts on concrete field access).
- `TRaw` lets `mapResponse` receive a typed raw payload at the definition site.
- Return type is the existing `IUseTableStoreReturn<T>`, so `<SstTable :store="...">` works unchanged.

## Internal wiring

`useTable()` performs, once and hidden, exactly what the verbose example did by hand:

```ts
return function useTable(): IUseTableStoreReturn<T> {
  const httpClient = config.httpClient ?? new FetchHttpClient(config.headers ? { baseHeaders: config.headers } : {});

  const repository = new HttpListRepository<T>({
    baseUrl: config.baseUrl,
    httpClient,
    ...(config.mapResponse ? { responseListMapper: (raw) => config.mapResponse!(raw as TRaw) } : {}),
    ...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
  });

  return useTableStore<T>({
    repository,
    sortMap: config.sortMap ?? {},
    ...(config.filterMap ? { filterMap: config.filterMap } : {}),
    ...(config.initialPagination ? { initialPagination: config.initialPagination } : {}),
    ...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
    ...(config.paramFormatting ? { paramFormatting: config.paramFormatting } : {}),
  });
};
```

Notes:

- `mapResponse` is wrapped (not cast as a whole function) so the contravariant `(raw: TRaw)` → `(raw: unknown)` mismatch stays contained and the unsafe cast is a single `raw as TRaw`.
- Conditional-spread idiom matches the codebase convention for `exactOptionalPropertyTypes` (see `table-store.ts`, `sst-ng-list.repository.ts`).
- `queryKeys` is consumed by the **store** (`mapTableParams`); `HttpListRepository.getList` passes params through. Passing it to the store is sufficient and is the single source of truth.
- Creating the repository inside `useTable()` is intentional: it is stateless and cheap, and keeps each store instance self-contained.

## Component usage (target)

```ts
// breed-table.ts
import { defineTable } from '@bridgebyte/sst-vue';

export interface IBreed {
  id: string;
  name: string;
  description: string;
  hypoallergenic: boolean;
  lifeMin: number;
  lifeMax: number;
}
interface IDogApiResponse {
  /* raw dogapi shape */
}

export const useBreedTable = defineTable<IBreed, IDogApiResponse>({
  baseUrl: 'https://dogapi.dog/api/v2/breeds',
  headers: { Accept: 'application/vnd.api+json' },
  queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
  sortMap: {},
  initialPagination: { page: 1, pageSize: 10 },
  mapResponse: (raw) => ({
    result: raw.data.map((b) => ({ id: b.id, name: b.attributes.name /* … */ })),
    totalCount: raw.meta.pagination.records,
    isSuccess: true,
  }),
});
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { SstTable, type IColumn } from '@bridgebyte/sst-vue';
import '@bridgebyte/sst-vue/style.css';
import { useBreedTable, type IBreed } from './breed-table';

const table = useBreedTable();
const columns: IColumn[] = [ /* … */ ];
const truncate = (t: string, max = 90) => (t.length > max ? `${t.slice(0, max)}…` : t);
</script>

<template>
  <SstTable :columns="columns" :store="table">
    <template #body-cell="{ row, column }">
      <!-- row is typed IBreed; concrete field access needs no cast -->
      <template v-if="column.key === 'description'"><span>{{ truncate(row.description) }}</span></template>
      <!-- … -->
      <template v-else><span>{{ (row as Record<string, unknown>)[column.key] }}</span></template>
    </template>
  </SstTable>
</template>
```

## Files changed

- **Add** `packages/vue/src/lib/composables/define-table.ts` — the factory.
- **Add** `packages/vue/src/lib/composables/define-table.test.ts` — Vitest unit tests.
- **Edit** `packages/vue/src/index.ts` — export `defineTable` and `IDefineTableConfig`.
- **Rewrite** `test/vue/src/breed-table.ts` — single `defineTable` definition; delete `JsonApiHttpClient`, the `BreedRepository` subclass, and the `getList` override. (Renamed from `breed-repository.ts`.)
- **Edit** `test/vue/src/App.vue` — use `useBreedTable()`, drop unnecessary casts, remove the HTTP call-log panel.

## Testing

- **Unit (`define-table.test.ts`):**
  - defaults `sortMap` to `{}` when omitted (no sort params emitted)
  - passes `headers` through as `FetchHttpClient` `baseHeaders`
  - applies `mapResponse` to a raw payload and returns canonical `IResponseList`
  - honors the `httpClient` escape hatch (custom client is used instead of the default)
  - returns a working `IUseTableStoreReturn<T>` (store fetches via the repository)
  - Follow the existing `use-table-store.test.ts` patterns; stub the repository/http client; run within an effect scope where `onScopeDispose` is needed.
- **Build/typecheck:** `nx run-many -t typecheck build` for `@bridgebyte/sst-vue`; then republish locally and `npm run build --prefix test/vue` to confirm the rewritten example typechecks and builds against the published package.
- **Behavioral parity:** `test/vue` still renders dogapi breeds with pagination, matching prior behavior minus the call-log panel.

## Out of scope

- Create/update/delete in the factory (list-only for now).
- Changes to `@bridgebyte/sst-ng`, `@bridgebyte/sst-dom`, or `@bridgebyte/sst-react`.
- React adapter ergonomics (could mirror this later).
- Changing `SstTable.vue`'s generic constraint or slot contracts.

## Addendum (discovered during implementation): `@bridgebyte/sst-core` `+json` fix

Originally `@bridgebyte/sst-core` was out of scope. Implementation surfaced a real bug that
blocked the clean example: dogapi returns `content-type: application/vnd.api+json`,
but `FetchHttpClient` only parsed bodies whose content-type `includes('application/json')`
— which the JSON:API media type does not. It fell through to `response.text()`, so
`mapResponse` received a string and the table rendered empty. The old hand-written
`JsonApiHttpClient` had masked this by always calling `response.json()`.

Fix (approved as an in-scope expansion): `FetchHttpClient` now treats
`application/json` **and any RFC 6839 `+json` structured-syntax suffix**
(`application/vnd.api+json`, `application/hal+json`, `application/problem+json`, …)
as JSON. ~3-line change in `packages/core/src/http/fetch-http-client.ts` plus two
unit tests in `fetch-http-client.test.ts`. Benefits every adapter and keeps the Vue
example free of a custom HTTP client.

## Success criteria

- A Vue consumer can define a working table in one `defineTable` object literal plus a columns array, with no hand-written HTTP client and no imperative param stripping.
- `body-cell` slot row access is cast-free for concrete fields.
- `@bridgebyte/sst-vue` builds and typechecks; new unit tests pass; `test/vue` builds against the published package and renders as before.
