# Declarative Backend Conventions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let consumers adapt offset pagination, `asc/desc` sort direction, and a search sub-endpoint through declarative config (no custom `IHttpClient`). Implement in `@sst/core`, surface via `@sst/vue`'s `defineTable`, and prove it by removing `DummyJsonClient` from `test/primevue`.

**Architecture:** Param-style options (`paginationStyle`, `sortStyle`, `sortDirections`) are applied in `mapTableParams` and threaded through `TableStore`; URL routing (`searchEndpoint`) lives in `HttpListRepository.getList`. `defineTable` routes each to the right place. All options default to current behavior.

**Tech Stack:** TypeScript (strict), Vitest, `@sst/core` store/repository, `@sst/vue` `defineTable`, `test/primevue` (Vite + PrimeVue).

## Global Constraints

- **TypeScript:** `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Never assign `undefined` to an optional prop — use conditional spreads.
- **Non-breaking:** every new option is optional and defaults to today's behavior; existing tests must stay green.
- **Layer separation:** `paginationStyle`/`sortStyle`/`sortDirections` → `ITableStoreOptions` + `mapTableParams`; `searchEndpoint` → `IRepositoryConfig` + `HttpListRepository`. Shared literal types live in `repository-config.ts`.
- **Formatting:** tabs; run `npx prettier --write` on touched files.
- **Verdaccio:** `test/primevue` consumes the published `@sst/core`+`@sst/vue`; republish (`npm run publish:local`) before reinstalling. `test/*/package-lock.json` is gitignored.

---

### Task 1: Core param-style options — types, `mapTableParams`, `TableStore` (TDD)

**Files:**
- Modify: `packages/core/src/types/repository-config.ts` (literal types)
- Modify: `packages/core/src/store/map-table-params.ts`
- Test: `packages/core/src/store/map-table-params.test.ts`
- Modify: `packages/core/src/store/table-store.ts` (`ITableStoreOptions` + threading)
- Test: `packages/core/src/store/table-store.test.ts`

**Interfaces:**
- Produces: `PaginationStyle = 'page' | 'offset'`, `SortStyle = 'flag' | 'direction'`, `ISortDirections = { asc: string; desc: string }` (exported from `repository-config.ts`); `IMapTableParamsInput` gains optional `paginationStyle`, `sortStyle`, `sortDirections`; `ITableStoreOptions` gains the same three.

- [ ] **Step 1: Add literal types to `repository-config.ts`**

Insert after the `IRepositoryQueryKeys` interface (before `IParamFormattingStrategy`):

```ts
/** Pagination wire style: `'page'` (page + pageSize) or `'offset'` (skip + limit). */
export type PaginationStyle = 'page' | 'offset';

/** Sort wire style: `'flag'` (orderBy + boolean) or `'direction'` (sortBy + asc/desc token). */
export type SortStyle = 'flag' | 'direction';

/** Tokens emitted for ascending/descending order in the `'direction'` {@link SortStyle}. */
export interface ISortDirections {
	readonly asc: string;
	readonly desc: string;
}
```

- [ ] **Step 2: Write failing `mapTableParams` tests**

Append to `packages/core/src/store/map-table-params.test.ts` (inside the `describe`):

```ts
	it('emits skip/limit in offset pagination style', () => {
		const params = mapTableParams({
			pagination: { page: 3, pageSize: 20 },
			sortMap: {},
			queryKeys: { ...DEFAULT_QUERY_KEYS, page: 'skip', pageSize: 'limit' },
			paginationStyle: 'offset',
		});
		expect(params).toStrictEqual({ skip: 40, limit: 20 }); // (3 - 1) * 20
	});

	it('emits an asc/desc token in direction sort style', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'price-ASC', field: 'price', order: ESortOrder.ASC },
			sortMap: { price: 'price' },
			queryKeys: { ...DEFAULT_QUERY_KEYS, orderBy: 'sortBy', orderByDescending: 'order' },
			sortStyle: 'direction',
		});
		expect(params).toMatchObject({ sortBy: 'price', order: 'asc' });
	});

	it('uses custom sortDirections tokens', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'price-DESC', field: 'price', order: ESortOrder.DESC },
			sortMap: { price: 'price' },
			queryKeys: DEFAULT_QUERY_KEYS,
			sortStyle: 'direction',
			sortDirections: { asc: 'ASC', desc: 'DESC' },
		});
		expect(params).toMatchObject({ orderBy: 'price', orderByDescending: 'DESC' });
	});

	it('keeps the boolean flag in the default (flag) sort style', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'price-DESC', field: 'price', order: ESortOrder.DESC },
			sortMap: { price: 'price' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toMatchObject({ orderBy: 'price', orderByDescending: true });
	});
```

- [ ] **Step 3: Run tests, expect the new ones to fail**

Run (from `packages/core/`): `npx vitest run src/store/map-table-params.test.ts`
Expected: the 3 new behavior tests FAIL (offset/direction not implemented); existing tests pass.

- [ ] **Step 4: Implement offset + direction in `mapTableParams`**

In `packages/core/src/store/map-table-params.ts`, extend the input interface — add after `paramFormatting` in `IMapTableParamsInput`:

```ts
	/** Pagination wire style; `'page'` (default) or `'offset'` (skip + limit). */
	readonly paginationStyle?: PaginationStyle;
	/** Sort wire style; `'flag'` (default) or `'direction'` (asc/desc token). */
	readonly sortStyle?: SortStyle;
	/** Tokens for `'direction'` sort style; defaults to `{ asc: 'asc', desc: 'desc' }`. */
	readonly sortDirections?: ISortDirections;
```

Update the import on line 5 to also bring in the new types:

```ts
import type {
	IParamFormattingStrategy,
	IRepositoryQueryKeys,
	ISortDirections,
	PaginationStyle,
	SortStyle,
} from '../types/repository-config';
```

Replace the destructure (line 55) and the sort + pagination blocks (lines 71–80):

```ts
	const { pagination, sort, filters, search, sortMap, filterMap, queryKeys, paramFormatting } = input;
	const paginationStyle = input.paginationStyle ?? 'page';
	const sortStyle = input.sortStyle ?? 'flag';
	const sortDirections = input.sortDirections ?? { asc: 'asc', desc: 'desc' };
	const formatSortField = paramFormatting?.formatSortField ?? ((field: string) => field);
	const params: Record<string, unknown> = {};

	// …filters block unchanged…

	if (sort) {
		const mapped = sortMap[sort.field];
		if (mapped !== undefined) {
			params[queryKeys.orderBy] = formatSortField(mapped);
			params[queryKeys.orderByDescending] =
				sortStyle === 'direction'
					? sort.order === ESortOrder.DESC
						? sortDirections.desc
						: sortDirections.asc
					: sort.order === ESortOrder.DESC;
		}
	}

	if (paginationStyle === 'offset') {
		params[queryKeys.page] = (pagination.page - 1) * pagination.pageSize;
	} else {
		params[queryKeys.page] = pagination.page;
	}
	params[queryKeys.pageSize] = pagination.pageSize;
```

(Leave the filters block and the trailing `search` block unchanged.)

- [ ] **Step 5: Run tests, expect pass**

Run (from `packages/core/`): `npx vitest run src/store/map-table-params.test.ts`
Expected: PASS (existing + 4 new).

- [ ] **Step 6: Thread the options through `TableStore`**

In `packages/core/src/store/table-store.ts`:

(a) Extend `ITableStoreOptions` — add after `paramFormatting`:

```ts
	/** Pagination wire style; `'page'` (default) or `'offset'`. */
	readonly paginationStyle?: PaginationStyle;
	/** Sort wire style; `'flag'` (default) or `'direction'`. */
	readonly sortStyle?: SortStyle;
	/** Tokens for `'direction'` sort style. */
	readonly sortDirections?: ISortDirections;
```

(b) Import the types — extend the existing `repository-config` import to include `PaginationStyle, SortStyle, ISortDirections`.

(c) Add protected fields (next to `paramFormatting`):

```ts
	protected readonly paginationStyle: PaginationStyle | undefined;
	protected readonly sortStyle: SortStyle | undefined;
	protected readonly sortDirections: ISortDirections | undefined;
```

(d) Assign them in the constructor (next to `this.paramFormatting = options.paramFormatting;`):

```ts
	this.paginationStyle = options.paginationStyle;
	this.sortStyle = options.sortStyle;
	this.sortDirections = options.sortDirections;
```

(e) Pass them in `getData`'s `mapTableParams({ … })` call (add alongside the other conditional spreads):

```ts
			...(this.paginationStyle !== undefined ? { paginationStyle: this.paginationStyle } : {}),
			...(this.sortStyle !== undefined ? { sortStyle: this.sortStyle } : {}),
			...(this.sortDirections !== undefined ? { sortDirections: this.sortDirections } : {}),
```

- [ ] **Step 7: Write a `TableStore` integration test**

Append to `packages/core/src/store/table-store.test.ts` a test that asserts offset params reach the repository. Match the file's existing repository-stub pattern; the essence:

```ts
	it('emits offset pagination params to the repository in offset style', async () => {
		const getList = vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		const repository = { getList, bulkDelete: vi.fn() } as unknown as ListRepository<{ id: string }>;
		const store = new TableStore<{ id: string }>({
			repository,
			sortMap: {},
			initialPagination: { page: 2, pageSize: 10 },
			queryKeys: { page: 'skip', pageSize: 'limit' },
			paginationStyle: 'offset',
		});
		store.refresh();
		await Promise.resolve();
		await Promise.resolve();
		expect(getList).toHaveBeenCalledWith({ skip: 10, limit: 10 });
		store.destroy();
	});
```

(Adjust imports/stub shape to match the existing test file.)

- [ ] **Step 8: Verify + format + commit**

```bash
npx nx run core:test
npx nx run core:typecheck
npx prettier --write packages/core/src/types/repository-config.ts packages/core/src/store/map-table-params.ts packages/core/src/store/map-table-params.test.ts packages/core/src/store/table-store.ts packages/core/src/store/table-store.test.ts
git add packages/core/src/types/repository-config.ts packages/core/src/store/map-table-params.ts packages/core/src/store/map-table-params.test.ts packages/core/src/store/table-store.ts packages/core/src/store/table-store.test.ts
git commit -m "feat(core): paginationStyle (offset) and sortStyle (direction) in mapTableParams/TableStore"
```

---

### Task 2: Core `searchEndpoint` routing in `HttpListRepository` (TDD)

**Files:**
- Modify: `packages/core/src/types/repository-config.ts` (add `searchEndpoint` to `IRepositoryConfig`)
- Modify: `packages/core/src/repositories/http-list.repository.ts`
- Test: `packages/core/src/repositories/http-list.repository.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_QUERY_KEYS` from `../types/repository-config`.
- Produces: `IRepositoryConfig.searchEndpoint?: string`; `HttpListRepository` routes search requests to `` `${baseUrl}${searchEndpoint}` ``.

- [ ] **Step 1: Add `searchEndpoint` to `IRepositoryConfig`**

In `repository-config.ts`, add after `responseListMapper` in `IRepositoryConfig`:

```ts
	/** When search is active, route the request to `` `${baseUrl}${searchEndpoint}` `` (e.g. `'/search'`). */
	readonly searchEndpoint?: string;
```

- [ ] **Step 2: Write failing repository tests**

Append to `packages/core/src/repositories/http-list.repository.test.ts` (match the existing stub-httpClient pattern; representative):

```ts
	it('routes to the search endpoint when a search param is present', async () => {
		const get = vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		const httpClient = { get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as IHttpClient;
		const repo = new HttpListRepository({
			baseUrl: 'https://api.test/products',
			httpClient,
			searchEndpoint: '/search',
			queryKeys: { search: 'q' },
		});
		await repo.getList({ q: 'phone', limit: 10 });
		expect(get).toHaveBeenCalledWith('https://api.test/products/search', { params: { q: 'phone', limit: 10 } });
	});

	it('uses the base URL when search is absent or empty', async () => {
		const get = vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		const httpClient = { get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as IHttpClient;
		const repo = new HttpListRepository({
			baseUrl: 'https://api.test/products',
			httpClient,
			searchEndpoint: '/search',
			queryKeys: { search: 'q' },
		});
		await repo.getList({ limit: 10 });
		expect(get).toHaveBeenCalledWith('https://api.test/products', { params: { limit: 10 } });
		await repo.getList({ q: '', limit: 10 });
		expect(get).toHaveBeenLastCalledWith('https://api.test/products', { params: { q: '', limit: 10 } });
	});
```

(Ensure `IHttpClient` is imported in the test file.)

- [ ] **Step 3: Run tests, expect new ones to fail**

Run (from `packages/core/`): `npx vitest run src/repositories/http-list.repository.test.ts`
Expected: the 2 new tests FAIL (routing not implemented).

- [ ] **Step 4: Implement routing in `HttpListRepository`**

In `packages/core/src/repositories/http-list.repository.ts`:

(a) Import `DEFAULT_QUERY_KEYS`:

```ts
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';
```

(b) Add fields and resolve them in the constructor:

```ts
	protected readonly searchEndpoint: string | undefined;
	private readonly searchKey: string;

	public constructor(config: IRepositoryConfig<T>) {
		super();
		if (!config.baseUrl) {
			throw new Error('[HttpListRepository] config.baseUrl is required.');
		}
		this.baseUrl = config.baseUrl;
		this.httpClient = config.httpClient ?? new FetchHttpClient();
		this.responseListMapper = config.responseListMapper ?? ((raw) => raw as IResponseList<T[]>);
		this.searchEndpoint = config.searchEndpoint;
		this.searchKey = { ...DEFAULT_QUERY_KEYS, ...config.queryKeys }.search;
	}
```

(c) Route in `getList`:

```ts
	public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const url =
			this.searchEndpoint !== undefined && params !== undefined && this.isSearchActive(params)
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

- [ ] **Step 5: Run tests, expect pass**

Run (from `packages/core/`): `npx vitest run src/repositories/http-list.repository.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 6: Verify + format + commit**

```bash
npx nx run core:test
npx nx run core:typecheck
npx prettier --write packages/core/src/types/repository-config.ts packages/core/src/repositories/http-list.repository.ts packages/core/src/repositories/http-list.repository.test.ts
git add packages/core/src/types/repository-config.ts packages/core/src/repositories/http-list.repository.ts packages/core/src/repositories/http-list.repository.test.ts
git commit -m "feat(core): searchEndpoint routing in HttpListRepository"
```

---

### Task 3: Surface the options in `defineTable`

**Files:**
- Modify: `packages/vue/src/lib/composables/define-table.ts`
- Test: `packages/vue/src/lib/composables/define-table.test.ts`

**Interfaces:**
- Consumes: `PaginationStyle`, `SortStyle`, `ISortDirections` (types) from `@sst/core`.
- Produces: `IDefineTableConfig` gains `paginationStyle`, `sortStyle`, `sortDirections`, `searchEndpoint`; routed to the repository (searchEndpoint) and store (the rest).

- [ ] **Step 1: Add the options to `IDefineTableConfig`**

In `define-table.ts`, extend the `@sst/core` type import to include `PaginationStyle, SortStyle, ISortDirections`, and add to `IDefineTableConfig` (after `queryKeys`):

```ts
	/** Pagination wire style; `'page'` (default) or `'offset'` (skip + limit). */
	readonly paginationStyle?: PaginationStyle;
	/** Sort wire style; `'flag'` (default) or `'direction'` (sortBy + asc/desc). */
	readonly sortStyle?: SortStyle;
	/** Tokens for `'direction'` sort style; defaults to `{ asc: 'asc', desc: 'desc' }`. */
	readonly sortDirections?: ISortDirections;
	/** When search is active, route to `` `${baseUrl}${searchEndpoint}` `` (e.g. `'/search'`). */
	readonly searchEndpoint?: string;
```

- [ ] **Step 2: Route them in `useTable`**

Add `searchEndpoint` to the `HttpListRepository` config block:

```ts
			...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
			...(config.searchEndpoint ? { searchEndpoint: config.searchEndpoint } : {}),
```

Add the param-style options to the `useTableStore` options block:

```ts
			...(config.paginationStyle ? { paginationStyle: config.paginationStyle } : {}),
			...(config.sortStyle ? { sortStyle: config.sortStyle } : {}),
			...(config.sortDirections ? { sortDirections: config.sortDirections } : {}),
```

- [ ] **Step 3: Add a pass-through test**

Append to `packages/vue/src/lib/composables/define-table.test.ts` a test using the existing stub-client harness — assert that `paginationStyle: 'offset'` + `searchEndpoint` produce a search-endpoint URL with `skip`:

```ts
	it('threads paginationStyle/searchEndpoint into the request', async () => {
		const { client, get } = stubClient({ result: [], totalCount: 0, isSuccess: true } satisfies IResponseList<IItem[]>);
		const useTable = defineTable<IItem>({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			paginationStyle: 'offset',
			searchEndpoint: '/search',
			queryKeys: { page: 'skip', pageSize: 'limit', search: 'q' },
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.updateSearch('x');
			await flush();
			const url = get.mock.calls.at(-1)?.[0];
			const params = (get.mock.calls.at(-1)?.[1] as IHttpRequestOptions | undefined)?.params ?? {};
			expect(url).toBe('https://api.test/items/search');
			expect(params).toMatchObject({ skip: 0, limit: 10, q: 'x' });
		});
		scope.stop();
	});
```

(Reuse the existing `stubClient`/`flush` helpers and imports already in the file; add `IHttpRequestOptions` to the `@sst/core` import if not present.)

- [ ] **Step 4: Verify + format + commit**

```bash
npx nx run vue:test
npx nx run vue:typecheck
npx prettier --write packages/vue/src/lib/composables/define-table.ts packages/vue/src/lib/composables/define-table.test.ts
git add packages/vue/src/lib/composables/define-table.ts packages/vue/src/lib/composables/define-table.test.ts
git commit -m "feat(vue): surface paginationStyle/sortStyle/sortDirections/searchEndpoint in defineTable"
```

---

### Task 4: Rewrite `test/primevue` (drop the custom client) + docs + E2E

**Files:**
- Modify: `test/primevue/src/products-table.ts`
- Delete: `test/primevue/src/dummyjson-client.ts`
- Modify: `packages/core/README.md`, `packages/core/CHANGELOG.md`, `packages/vue/README.md`, `packages/vue/CHANGELOG.md`

- [ ] **Step 1: Rewrite `products-table.ts` with declarative options**

Replace the body of `test/primevue/src/products-table.ts` — remove the `DummyJsonClient` import and `httpClient`, add the new options:

```ts
import { defineTable } from '@sst/vue';

export interface IProduct {
	id: string;
	title: string;
	brand: string;
	category: string;
	price: number;
	rating: number;
	stock: number;
}

interface IDummyJsonResponse {
	products: ReadonlyArray<{
		id: number;
		title: string;
		brand?: string;
		category: string;
		price: number;
		rating: number;
		stock: number;
	}>;
	total: number;
}

export const useProductsTable = defineTable<IProduct, IDummyJsonResponse>({
	baseUrl: 'https://dummyjson.com/products',
	paginationStyle: 'offset',
	sortStyle: 'direction',
	searchEndpoint: '/search',
	queryKeys: { page: 'skip', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'order', search: 'q' },
	sortMap: {
		title: 'title',
		brand: 'brand',
		category: 'category',
		price: 'price',
		rating: 'rating',
		stock: 'stock',
	},
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: (raw) => ({
		result: raw.products.map((p) => ({
			id: String(p.id),
			title: p.title,
			brand: p.brand ?? '—',
			category: p.category,
			price: p.price,
			rating: p.rating,
			stock: p.stock,
		})),
		totalCount: raw.total,
		isSuccess: true,
	}),
});
```

- [ ] **Step 2: Delete the custom client**

```bash
git rm test/primevue/src/dummyjson-client.ts
```

- [ ] **Step 3: Document the options**

Add to `packages/core/README.md` (under "Configurable query keys" or a new "Backend conventions" subsection) a short block:

```markdown
## Backend conventions

Adapt common REST shapes without a custom HTTP client:

```ts
new HttpRepository({
	baseUrl: 'https://dummyjson.com/products',
	paginationStyle: 'offset',   // skip + limit instead of page + pageSize
	sortStyle: 'direction',      // sortBy + order=asc|desc instead of orderBy + orderByDescending
	searchEndpoint: '/search',   // route search to `${baseUrl}/search`
	queryKeys: { page: 'skip', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'order', search: 'q' },
});
```
```

Add an analogous short note to `packages/vue/README.md` (in the `defineTable` section). Add `[Unreleased]` entries to `packages/core/CHANGELOG.md` and `packages/vue/CHANGELOG.md`:

```markdown
### Added

- Declarative backend conventions: `paginationStyle` (`'page'`/`'offset'`),
  `sortStyle` (`'flag'`/`'direction'`) with `sortDirections`, and `searchEndpoint`
  routing — adapt offset pagination, `asc/desc` sort, and a search sub-endpoint
  without a custom HTTP client.
```

- [ ] **Step 4: Republish and reinstall the app**

```bash
npm run publish:local
rm -rf test/primevue/node_modules test/primevue/package-lock.json
npm install --prefix test/primevue
```

- [ ] **Step 5: Typecheck + build the app**

Run (from repo root): `npm run build --prefix test/primevue`
Expected: `vue-tsc` passes (the new options typecheck through `@sst/vue/primevue`'s deps) and `vite build` succeeds. No reference to `DummyJsonClient` remains.

- [ ] **Step 6: Browser-verify (no custom client)**

`preview_start` `test-primevue`, then:
- snapshot → products render
- click the Price header → network shows `…/products?skip=0&limit=10&sortBy=price&order=asc`
- type in the Title filter → network shows `…/products/search?…&q=<term>`
- paginate → `skip` increments
Confirm no console errors.

- [ ] **Step 7: Commit**

```bash
npx prettier --write test/primevue/src/products-table.ts packages/core/README.md packages/core/CHANGELOG.md packages/vue/README.md packages/vue/CHANGELOG.md
git add test/primevue/src/products-table.ts test/primevue/src/dummyjson-client.ts packages/core/README.md packages/core/CHANGELOG.md packages/vue/README.md packages/vue/CHANGELOG.md
git commit -m "test(primevue): drop DummyJsonClient; dummyjson via declarative options + docs"
```

---

## Notes for the executor

- Tasks 1–3 run against `@sst/core` source via the Vitest alias — no publish needed. Only Task 4 (the consumer app) needs `publish:local`.
- The store keeps page-based internal state; only the **emitted** params change in offset mode, so the PrimeVue adapter's `first`/`onPage` (page-based) still work unchanged.
- If the `table-store.test.ts` / `http-list.repository.test.ts` stub shapes differ from the sketches, follow each file's existing pattern — the assertions (params/URL) are what matter.
