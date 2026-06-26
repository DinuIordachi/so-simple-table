# Changelog

All notable changes to `@sst/core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Declarative backend conventions: `paginationStyle` (`'page'`/`'offset'`),
  `sortStyle` (`'flag'`/`'direction'`) with `sortDirections`, and `searchEndpoint`
  routing on `HttpListRepository`/`TableStore` — adapt offset pagination,
  `asc/desc` sort, and a search sub-endpoint without a custom HTTP client.

### Fixed

- `mapTableParams` now applies `paramFormatting.formatFilter` (previously declared
  but ignored, so filters always array-wrapped). The default still groups values
  into an array; supply `formatFilter` to serialize them differently — e.g. scalar
  values for backends that reject `key[]` query arrays.

## [0.2.0] - 2026-06-24

### Added

- `TableStore<T>` — reactive table state (data, total, loading, pagination, sort,
  filters, search) that auto-refreshes through a repository on query changes.
- Repository hierarchy: `ListRepository` / `SelectRepository` / `Repository`
  abstract bases and their HTTP implementations `HttpListRepository`,
  `HttpSelectRepository`, and `HttpRepository`.
- `FetchHttpClient` — default `IHttpClient` over the `fetch` API, with
  configurable base headers. Parses `application/json` and any RFC 6839 `+json`
  content type (e.g. `application/vnd.api+json`).
- `Observable<T>` and `watch(...)` reactive primitives (zero dependencies).
- `mapTableParams(...)` — pure mapping of table state to query parameters, with
  configurable `queryKeys`, `sortMap`, `filterMap`, and `paramFormatting`.
- Full public type surface: `IBaseItem`, `IColumn`, `IFilterParams`,
  `IPaginationParams`, `ISortParams`, `IResponse`/`IResponseList`,
  `IHttpClient`, `IRepositoryConfig`, `ITableStore`, and related types.
