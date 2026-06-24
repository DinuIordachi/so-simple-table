# Changelog

All notable changes to `@sst/vue` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@sst/vue/primevue` subpath: `useSstDataTable` composable and `<SstDataTable>`
  wrapper binding a `TableStore` to a PrimeVue v4 `DataTable` (lazy mode), with
  `primevue` as an optional peer dependency.

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
