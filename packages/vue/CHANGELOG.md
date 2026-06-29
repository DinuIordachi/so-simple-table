# Changelog

All notable changes to `@bridgebyte/sst-vue` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-06-29

### Added

- `defineTable` custom-fetch path: pass `fetchData(state) => { data, total }` to
  own how data is loaded (the raw table state in, rows + total out), bypassing
  `baseUrl`/the HTTP param mapping. Optional `deleteRows` enables bulk delete on
  that table. The config is now a discriminated union — `baseUrl` **xor**
  `fetchData`.
- `catchError(error)` option on `defineTable` (both paths) — handle a fetch
  rejection (e.g. show a toast); a failed fetch is no longer unhandled.
- `useTableFilters(store, initial, options?)` — a filter-state manager with
  per-filter `defaultValue`, `getFilter`/`setFilterValue`/`resetFilter`/
  `resetFilters`, an `activeFilterCount`, and `toFilterParams()`. When a store is
  passed it debounces and syncs the active filters into it (resetting to page 1);
  pass `null` for standalone state.
- `@bridgebyte/sst-vue/primevue`: `useSstFilters(defs, options?)` — manages
  PrimeVue's `v-model:filters` model (`row`/`menu` shape, per-field `matchMode`
  and default value) with `getFilter`/`setFilterValue`/`resetFilter`/`reset`,
  an `activeFilterCount`, and `toMappedFilters()`. Programmatic changes sync to
  the bound store (so `reset()` clears the column menus and re-fetches).

### Changed

- Requires `@bridgebyte/sst-core` `^0.3.0`.

## [0.2.0] - 2026-06-29

### Added

- `@bridgebyte/sst-vue/primevue` subpath: `useSstDataTable` composable and `<SstDataTable>`
  wrapper binding a `TableStore` to a PrimeVue v4 `DataTable` (lazy mode), with
  `primevue` as an optional peer dependency.
- `defineTable` backend-convention options (`paginationStyle`, `sortStyle`,
  `sortDirections`, `searchEndpoint`) — adapt offset pagination, `asc/desc` sort,
  and a search sub-endpoint without a custom HTTP client.
- `@bridgebyte/sst-vue/primevue`: inline editing via `onSave` (optimistic + rollback), reactive
  `selection` with `clearSelection`/`removeSelected`, DataTable-level named-slot
  typing, and `searchColumn`/`withMatchModes` filter helpers.
- `@bridgebyte/sst-vue/primevue` responsive layouts: per-breakpoint layout slots
  (`#xs`…`#2xl`, Tailwind widths) on `<SstDataTable>` with a mobile-first cascade
  and a `tableBreakpoint` prop (default `lg`, or `'none'`). Each slot receives
  `{ rows, loading, store }`. Exports the `useBreakpoint` composable. SSR-safe;
  non-breaking.
- `setPage(n)` / `setPageSize(n)` store actions — set one half of pagination,
  keep the other, and refetch (no more spreading `pagination.value` by hand).
- `<SstDataTable>` `ssrBreakpoint` prop and `useBreakpoint({ ssrDefault })` to
  choose the pre-mount/SSR breakpoint (e.g. `'xs'` to server-render the mobile
  layout and avoid a desktop→mobile hydration swap).
- Exported `defaultMapFilters` so a custom `mapFilters` can compose it.

### Changed

- Relaxed the row constraint from `{ id: string }` to `{ id: string | number }`
  across `defineTable`, `useSstDataTable`/`<SstDataTable>`, and `<SstTable>`, so
  integer-keyed backends (e.g. Laravel) no longer need to stringify ids. Ids are
  coerced to strings internally for bulk selection and `bulkDelete`. Non-breaking:
  existing string-id rows still satisfy the wider constraint.
- `<SstDataTable>` responsive layout slots (`#xs`…`#2xl`) are typed with the row
  type via the new `ISstLayoutSlotProps<T>`, so `#xs="{ rows }"` gives `rows: readonly T[]`
  (each `row` is `T`) with no annotation. Forwarded slots (PrimeVue's `header`/`empty`/
  `expansion`/… and `<Column>`) keep `any` props so they stay narrowable —
  e.g. `#expansion="{ data }: { data: Row }"` — just like on a raw `<DataTable>`.
- Pinned the `@bridgebyte/sst-core` peer dependency to `^0.2.0` (was `*`) and `primevue` to
  `^4.5.0` (the tested baseline); added a `typesVersions` fallback so the
  `@bridgebyte/sst-vue/primevue` subpath resolves types under legacy `moduleResolution: node`.

### Fixed

- `useSstDataTable` clears the pending `@filter` debounce on unmount, so it can no
  longer fetch or write store state after the component is torn down.
- Inline-edit rollback now also fires when `onSave` throws **synchronously** (e.g. a
  validation guard), not only on a returned rejection.
- `removeSelected` drops the deleted rows from the reactive `selection` after a
  successful delete, so a toolbar count / header checkbox no longer counts ghosts.
- `@filter` no longer resets pagination and refetches when the resolved search and
  filters are unchanged (PrimeVue re-emits `@filter` on blur with identical values).
- Shipped declarations no longer leak the monorepo path `packages/core/dist`; the
  `<SstDataTable>` `removeSelected` type resolves to `@bridgebyte/sst-core`, so template-ref
  usage type-checks for consumers.
- `vite build` no longer prints a spurious `TS2538` from the dynamic layout-slot
  binding; `npm run lint` works again under ESLint 9 (flat config).
- `onSort` falls back to the first `multiSortMeta` entry under `sortMode="multiple"`,
  so enabling multi-sort no longer silently clears the (single-column) store sort.
- `<SstDataTable>`'s `mapFilters` / `onSave` props are now read reactively, so
  swapping them at runtime takes effect (were captured once at setup).

## [0.1.0] - 2026-06-24

### Added

- `defineTable<T>(config)` — declarative factory that returns a typed
  `useTable()` composable, wiring the repository (with a default `fetch`-based
  HTTP client) and the table store from a single config object.
- `useTableStore<T>(options)` — composable that wraps a core `TableStore` as Vue
  refs plus bound actions, auto-disposed via `onScopeDispose`.
- `useObservable<T>(source)` — bridges a core `IReadonlyObservable` to a Vue ref.
- `SstTable` — generic SFC with sorting, pagination, bulk selection, optional
  search, and typed scoped slots (`header-cell`, `body-cell`, `empty-state`,
  `bulk-actions`, `pagination`).
