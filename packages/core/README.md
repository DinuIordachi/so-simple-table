# @sst/core

Framework-agnostic core for **So Simple Table**. Zero runtime dependencies.

## Installation

```bash
npm install @sst/core
```

## Quick start

```ts
import { HttpRepository, TableStore, type IBaseItem } from '@sst/core';

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
import type { IHttpClient } from '@sst/core';

const myClient: IHttpClient = {
	get: (url, opts) => fetch(url, { ...opts }).then((r) => r.json()),
	post: (...) => /* ... */,
	put:  (...) => /* ... */,
	delete: (...) => /* ... */,
};

new HttpRepository({ baseUrl: '...', httpClient: myClient });
```

## Public API

| Export | Purpose |
| --- | --- |
| `Observable<T>` | Tiny reactive primitive with `get()`, `set()`, `subscribe()`. |
| `watch(observables, cb)` | Coalesce multi-observable changes into one microtask callback. |
| `TableStore<T>` | Reactive table state + auto-refresh on query changes. |
| `ListRepository<T>` / `SelectRepository<T>` / `Repository<T>` | Abstract bases. |
| `HttpListRepository<T>` / `HttpSelectRepository<T>` / `HttpRepository<T>` | HTTP variants. |
| `FetchHttpClient` | Default `IHttpClient` over the `fetch` API. |
| `mapTableParams(input)` | Pure function that builds query params for the wire. |
| `IRealtimeAdapter<T>` | Contract for future real-time adapters. |

## License

MIT
