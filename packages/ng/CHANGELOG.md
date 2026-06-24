# Changelog

All notable changes to `@sst/ng` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-24

### Added

- Repository bases for Angular DI: `SstNgListRepository`, `SstNgSelectRepository`,
  and `SstNgRepository` — subclass and override `baseUrl` / `queryKeys` /
  `responseListMapper`.
- `SstTableService<T>` — an injectable `TableStore` whose reactive state is
  exposed as Angular signals, with automatic teardown via `DestroyRef`.
- `SstTableComponent` (`<sst-table>`) — standalone component with sorting,
  pagination, bulk selection, optional search, and content-projection slots
  (`#headerCell`, `#bodyCell`, `#emptyState`, `#bulkActions`).
- `NgHttpClient` — adapts Angular's `HttpClient` to the core `IHttpClient`
  contract (interceptors, DI, and `HttpParams` serialization).
