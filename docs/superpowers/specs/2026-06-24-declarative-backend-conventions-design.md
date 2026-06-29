# Design: declarative backend conventions in `@bridgebyte/sst-core`

**Date:** 2026-06-24
**Status:** Approved (design)
**Scope:** Let consumers adapt common REST conventions (offset pagination, `asc/desc` sort direction, a search sub-endpoint) through **declarative config** — no custom `IHttpClient`. Implemented in `@bridgebyte/sst-core`, surfaced via `@bridgebyte/sst-vue`'s `defineTable`, and proven by rewriting the `test/primevue` app to drop its `DummyJsonClient`.

## Motivation

`@bridgebyte/sst-core`'s wire format is fixed: page-based pagination (`page`/`pageSize`), boolean sort (`orderBy` + `orderByDescending`), and search as a query param on the base URL. Real APIs vary. DummyJSON (a representative public API used by `test/primevue`) needs:

- **offset pagination** — `skip = (page-1)·pageSize` + `limit`
- **direction sort** — `sortBy=<field>` + `order=asc|desc`
- **search endpoint** — `GET /products/search?q=…` (a different path), not a param on `/products`

Today the only way to bridge this is to hand-write a full `IHttpClient` (fetch + error + JSON plumbing). That re-introduces exactly the boilerplate `defineTable` was built to remove. These three variations are common enough to deserve first-class declarative support.

## Decisions (from brainstorming)

- **Shape:** declarative convention options (not a `buildRequest` hook, not named presets).
- **Layer:** `@bridgebyte/sst-core` (framework-agnostic param/request logic), surfaced through `defineTable`. Adapters built on core's `TableStore` / `HttpListRepository` benefit automatically.
- **Non-breaking:** every option defaults to current behavior.
- **Key names reuse `queryKeys`** — no new naming concept.
- **YAGNI:** only these three axes. Combined-sort (`sort=-field`), static query params, and per-adapter (ng) config surfacing are out of scope; `httpClient` remains the escape hatch for unusual APIs.

## The four options

Added to `IRepositoryConfig` / `ITableStoreOptions` and `IDefineTableConfig`:

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `paginationStyle` | `'page' \| 'offset'` | `'page'` | `'offset'` → emit `queryKeys.page = (page-1)·pageSize` (the skip offset) and `queryKeys.pageSize = pageSize` (the limit) |
| `sortStyle` | `'flag' \| 'direction'` | `'flag'` | `'direction'` → emit `queryKeys.orderBy = field` and `queryKeys.orderByDescending = <asc\|desc token>` (instead of a boolean) |
| `sortDirections` | `{ asc: string; desc: string }` | `{ asc: 'asc', desc: 'desc' }` | the tokens used by `'direction'` style (e.g. `ASC`/`DESC`, `1`/`-1`) |
| `searchEndpoint` | `string` | — | when search is active, route the request to `` `${baseUrl}${searchEndpoint}` `` instead of adding the param to the base URL |

Param **names** continue to come from `queryKeys`. In `offset` mode `queryKeys.page` names the skip param; in `direction` mode `queryKeys.orderByDescending` names the direction param.

## Where each lives (clean separation)

- **`paginationStyle`, `sortStyle`, `sortDirections`** are param-building → implemented in **`mapTableParams`** (`packages/core/src/store/map-table-params.ts`) and threaded through **`TableStore`** options.
- **`searchEndpoint`** is URL routing → implemented in **`HttpListRepository.getList`** (`packages/core/src/repositories/http-list.repository.ts`); the repository detects an active search by checking the resolved `queryKeys.search` key in the outgoing params.
- **`defineTable`** routes each option to the right place: param-style options → `useTableStore`; `searchEndpoint` → the `HttpListRepository` config (which already receives `queryKeys`).

### `mapTableParams` changes

```ts
// pagination
if (paginationStyle === 'offset') {
  params[queryKeys.page] = (pagination.page - 1) * pagination.pageSize; // skip
  params[queryKeys.pageSize] = pagination.pageSize;                     // limit
} else {
  params[queryKeys.page] = pagination.page;
  params[queryKeys.pageSize] = pagination.pageSize;
}

// sort (only when sort && sortMap[field] is defined — unchanged guard)
if (sortStyle === 'direction') {
  params[queryKeys.orderBy] = formatSortField(mapped);
  params[queryKeys.orderByDescending] = sort.order === ESortOrder.DESC ? sortDirections.desc : sortDirections.asc;
} else {
  params[queryKeys.orderBy] = formatSortField(mapped);
  params[queryKeys.orderByDescending] = sort.order === ESortOrder.DESC;
}
```

`IMapTableParamsInput` gains optional `paginationStyle`, `sortStyle`, `sortDirections`. `TableStore` stores them from `ITableStoreOptions` and passes them in `getData`.

### `HttpListRepository` changes

```ts
public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
  const url = this.searchEndpoint && params && this.isSearchActive(params)
    ? `${this.baseUrl}${this.searchEndpoint}`
    : this.baseUrl;
  const raw = await this.httpClient.get<unknown>(url, params ? { params } : undefined);
  return this.responseListMapper(raw);
}

private isSearchActive(params: HttpQueryParams): boolean {
  const value = params[this.searchKey];
  return value !== undefined && value !== null && value !== '';
}
```

The constructor resolves `this.searchKey = { ...DEFAULT_QUERY_KEYS, ...config.queryKeys }.search` and `this.searchEndpoint = config.searchEndpoint`.

## Consumer result (dummyjson, no custom client)

```ts
export const useProductsTable = defineTable<IProduct, IDummyJsonResponse>({
  baseUrl: 'https://dummyjson.com/products',
  paginationStyle: 'offset',
  sortStyle: 'direction',
  searchEndpoint: '/search',
  queryKeys: { page: 'skip', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'order', search: 'q' },
  sortMap: { title: 'title', brand: 'brand', category: 'category', price: 'price', rating: 'rating', stock: 'stock' },
  initialPagination: { page: 1, pageSize: 10 },
  mapResponse: (raw) => ({
    result: raw.products.map((p) => ({ id: String(p.id), /* … */ })),
    totalCount: raw.total,
    isSuccess: true,
  }),
});
```

Produces, e.g., `GET https://dummyjson.com/products/search?skip=0&limit=10&sortBy=price&order=asc&q=phone`. `DummyJsonClient` is deleted.

## Files changed

- **`packages/core/src/types/repository-config.ts`** — add `paginationStyle`, `sortStyle`, `sortDirections`, `searchEndpoint` to `IRepositoryConfig`; export the small literal types.
- **`packages/core/src/store/map-table-params.ts`** — offset + direction logic; extend `IMapTableParamsInput`.
- **`packages/core/src/store/table-store.ts`** — thread the three param-style options from `ITableStoreOptions` into `mapTableParams`.
- **`packages/core/src/repositories/http-list.repository.ts`** — `searchEndpoint` routing + `searchKey` resolution.
- **`packages/vue/src/lib/composables/define-table.ts`** — add the four options to `IDefineTableConfig`; route them.
- **`test/primevue/src/products-table.ts`** — use the new options; **delete** `test/primevue/src/dummyjson-client.ts`.
- READMEs/CHANGELOGs: a short note in `@bridgebyte/sst-core` and `@bridgebyte/sst-vue` READMEs + `[Unreleased]` CHANGELOG entries.

## Testing

- **Unit — `map-table-params.test.ts`:** `paginationStyle: 'offset'` emits `skip=(page-1)·size` + limit; `'page'` unchanged; `sortStyle: 'direction'` emits the `asc/desc` token (and custom `sortDirections`); `'flag'` unchanged boolean.
- **Unit — `http-list.repository.test.ts`:** with `searchEndpoint`, an active search routes to `baseUrl + endpoint`; no/empty search uses `baseUrl`; without `searchEndpoint`, always `baseUrl`.
- **Unit — `define-table.test.ts`:** options thread through (e.g. offset + searchEndpoint reach the request; assert via a stub httpClient).
- **Typecheck/build:** `nx run-many -t typecheck test build` for core + vue.
- **E2E:** `test/primevue` rebuilt against the republished package; browser-verify sort (`order=asc/desc`), search (`/search?q=`), and pagination (`skip`) — same as before, now with **no custom client**.

## Out of scope

- Combined single-param sort (`sort=-field` / `sort=field:desc`).
- Static/constant query params (e.g. dummyjson `select`).
- Surfacing these options on the Angular adapter's custom repository (`SstNgListRepository` overrides `getList`); it gets the param-style options via core's `TableStore` but not `searchEndpoint`. Future work.
- `@bridgebyte/sst-react` (unimplemented).

## Success criteria

- A consumer adapts DummyJSON-style APIs (offset pagination, `asc/desc` sort, `/search` endpoint) with config only — no `IHttpClient`.
- All defaults preserve current behavior (no breaking changes); existing tests stay green.
- New core unit tests pass; `test/primevue` works end-to-end with `DummyJsonClient` removed.
