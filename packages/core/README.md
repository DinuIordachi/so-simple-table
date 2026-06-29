# @bridgebyte/sst-core

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)

Framework-agnostic core for **So Simple Table**. Zero runtime dependencies.

## Installation

```bash
npm install @bridgebyte/sst-core
```

## Quick start

```ts
import { HttpRepository, TableStore, type IBaseItem } from '@bridgebyte/sst-core';

interface IStrategy extends IBaseItem {
  createdAt: string;
  status: 'active' | 'paused';
}

class StrategyRepository extends HttpRepository<IStrategy> {}

const repository = new StrategyRepository({ baseUrl: 'https://api.example.com/strategies' });

const store = new TableStore<IStrategy>({
  repository,
  sortMap: { createdAt: 'ByCreationDate' },
  filterMap: { status: 'FilterStatus' },
});

store.data$.subscribe((rows) => {
  console.log('rows', rows);
});
```

## Configurable query keys

```ts
new HttpRepository({
  baseUrl: 'https://api.example.com/strategies',
  queryKeys: {
    page: 'pageNumber',
    pageSize: 'limit',
    orderBy: 'sortBy',
    orderByDescending: 'sortDesc',
    search: 'q',
  },
});
```

## Backend conventions

Adapt common REST shapes — offset pagination, `asc/desc` sort, a search
sub-endpoint — through config, with no custom HTTP client:

```ts
new HttpRepository({
  baseUrl: 'https://dummyjson.com/products',
  paginationStyle: 'offset', // skip + limit instead of page + pageSize
  sortStyle: 'direction', // sortBy + order=asc|desc instead of orderBy + orderByDescending
  searchEndpoint: '/search', // route search to `${baseUrl}/search`
  queryKeys: { page: 'skip', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'order', search: 'q' },
});
```

Defaults are unchanged (`'page'` / `'flag'` / no search routing). Use
`sortDirections` to override the `asc`/`desc` tokens (e.g. `{ asc: 'ASC', desc: 'DESC' }`).

## Custom response shape

```ts
new HttpRepository<IStrategy>({
  baseUrl: 'https://api.example.com/strategies',
  responseListMapper: (raw) => {
    const r = raw as { items: IStrategy[]; total: number };
    return { result: r.items, totalCount: r.total, isSuccess: true };
  },
});
```

## Plugging your own HTTP client

```ts
import type { IHttpClient } from '@bridgebyte/sst-core';

const myClient: IHttpClient = {
	get: (url, opts) => fetch(url, { ...opts }).then((r) => r.json()),
	post: (...) => /* ... */,
	put:  (...) => /* ... */,
	delete: (...) => /* ... */,
};

new HttpRepository({ baseUrl: '...', httpClient: myClient });
```

## Public API

| Export                                                                    | Purpose                                                        |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Observable<T>`                                                           | Tiny reactive primitive with `get()`, `set()`, `subscribe()`.  |
| `watch(observables, cb)`                                                  | Coalesce multi-observable changes into one microtask callback. |
| `TableStore<T>`                                                           | Reactive table state + auto-refresh on query changes.          |
| `ListRepository<T>` / `SelectRepository<T>` / `Repository<T>`             | Abstract bases.                                                |
| `HttpListRepository<T>` / `HttpSelectRepository<T>` / `HttpRepository<T>` | HTTP variants.                                                 |
| `FetchHttpClient`                                                         | Default `IHttpClient` over the `fetch` API.                    |
| `mapTableParams(input)`                                                   | Pure function that builds query params for the wire.           |
| `IRealtimeAdapter<T>`                                                     | Contract for future real-time adapters.                        |

## Links

- [So Simple Table monorepo](https://github.com/DinuIordachi/so-simple-table)
- [Changelog](./CHANGELOG.md)

## License

Proprietary — © 2026 Dinu Iordachi. All rights reserved. See [LICENSE](./LICENSE).
