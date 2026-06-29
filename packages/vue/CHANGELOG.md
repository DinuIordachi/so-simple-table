# Changelog

All notable changes to `@sst/vue` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@sst/vue/primevue` subpath: `useSstDataTable` composable and `<SstDataTable>`
  wrapper binding a `TableStore` to a PrimeVue v4 `DataTable` (lazy mode), with
  `primevue` as an optional peer dependency.
- `defineTable` backend-convention options (`paginationStyle`, `sortStyle`,
  `sortDirections`, `searchEndpoint`) — adapt offset pagination, `asc/desc` sort,
  and a search sub-endpoint without a custom HTTP client.
- `@sst/vue/primevue`: inline editing via `onSave` (optimistic + rollback), reactive
  `selection` with `clearSelection`/`removeSelected`, DataTable-level named-slot
  typing, and `searchColumn`/`withMatchModes` filter helpers.
- `@sst/vue/primevue` responsive layouts: per-breakpoint layout slots
  (`#xs`…`#2xl`, Tailwind widths) on `<SstDataTable>` with a mobile-first cascade
  and a `tableBreakpoint` prop (default `lg`, or `'none'`). Each slot receives
  `{ rows, loading, store }`. Exports the `useBreakpoint` composable. SSR-safe;
  non-breaking.

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
