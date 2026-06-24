# Changelog

All notable changes to `@sst/core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
