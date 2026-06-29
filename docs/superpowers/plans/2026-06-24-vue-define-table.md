# Vue `defineTable` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a declarative `defineTable<T>()` factory to `@bridgebyte/sst-vue` that returns a typed `useTable()` composable, and rewrite the `test/vue` smoke-test app to use it.

**Architecture:** `defineTable(config)` captures a config object and returns a `useTable()` composable. On call, `useTable()` builds an `HttpListRepository` (defaulting to `FetchHttpClient`, with `headers` → `baseHeaders`) and delegates to the existing `useTableStore` composable, returning the existing `IUseTableStoreReturn<T>`. No core/Angular/React changes.

**Tech Stack:** TypeScript, Vue 3 (`<script setup>`, composables, `effectScope`), Vitest + happy-dom, `@bridgebyte/sst-core` repository/store primitives.

## Global Constraints

- **Node:** `>=20`.
- **TypeScript:** `strict`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true` (from `tsconfig.base.json`). Never assign `undefined` to an optional property — use the conditional-spread idiom `...(cond ? { key: value } : {})` (as in `table-store.ts` and `sst-ng-list.repository.ts`).
- **Imports:** import `@bridgebyte/sst-core` symbols from `'@bridgebyte/sst-core'` (matches `use-table-store.ts`); import package-local symbols by relative path.
- **Formatting:** tab indentation; run Prettier (`npx prettier --write <files>`). Lint with the repo ESLint config (no non-null assertions — capture in a local instead).
- **Row type constraint:** the factory's `T` must `extend { id: string }` to match `SstTable`'s generic constraint.
- **CRUD scope:** list-only (no create/update/delete in the factory).
- **Test apps consume the published package:** `test/vue` imports from `@bridgebyte/sst-vue` (the local Verdaccio build), so the package must be rebuilt + republished before the example can resolve `defineTable`. Use `npm run publish:local -- --with-tests`.

---

### Task 1: `defineTable` factory + unit tests + export

**Files:**
- Create: `packages/vue/src/lib/composables/define-table.ts`
- Test: `packages/vue/src/lib/composables/define-table.test.ts`
- Modify: `packages/vue/src/index.ts`

**Interfaces:**
- Consumes: `useTableStore` and `IUseTableStoreReturn<T>` from `./use-table-store`; `FetchHttpClient`, `HttpListRepository`, and the types `IHttpClient`, `IHttpRequestOptions`, `IPaginationParams`, `IParamFormattingStrategy`, `IRepositoryQueryKeys`, `IResponseList`, `ESortOrder` from `@bridgebyte/sst-core`.
- Produces:
  - `interface IDefineTableConfig<T extends { id: string }, TRaw = unknown>` with fields: `baseUrl: string`, `headers?: Record<string, string>`, `httpClient?: IHttpClient`, `mapResponse?: (raw: TRaw) => IResponseList<T[]>`, `queryKeys?: Partial<IRepositoryQueryKeys>`, `sortMap?: Readonly<Record<string, string>>`, `filterMap?: Readonly<Record<string, string>>`, `initialPagination?: IPaginationParams`, `paramFormatting?: IParamFormattingStrategy`.
  - `function defineTable<T extends { id: string }, TRaw = unknown>(config: IDefineTableConfig<T, TRaw>): () => IUseTableStoreReturn<T>`.

- [ ] **Step 1: Write the failing test file**

Create `packages/vue/src/lib/composables/define-table.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { ESortOrder, type IHttpClient, type IHttpRequestOptions, type IResponseList } from '@bridgebyte/sst-core';
import { defineTable } from './define-table';

interface IItem {
	id: string;
	name: string;
}
interface IRaw {
	rows: Array<{ id: string; title: string }>;
	count: number;
}

// A stub IHttpClient that records GET calls and returns a canned raw payload.
function stubClient(raw: unknown): { client: IHttpClient; get: ReturnType<typeof vi.fn> } {
	const get = vi.fn().mockResolvedValue(raw);
	const client: IHttpClient = {
		get: get as IHttpClient['get'],
		post: vi.fn() as IHttpClient['post'],
		put: vi.fn() as IHttpClient['put'],
		delete: vi.fn() as IHttpClient['delete'],
	};
	return { client, get };
}

// Flush the microtask queue the store uses between an action and its fetch.
async function flush(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await nextTick();
}

function lastParams(get: ReturnType<typeof vi.fn>): Record<string, unknown> {
	const options = get.mock.calls.at(-1)?.[1] as IHttpRequestOptions | undefined;
	return (options?.params as Record<string, unknown>) ?? {};
}

describe('defineTable', () => {
	it('returns a composable that produces a working table store', async () => {
		const raw: IResponseList<IItem[]> = { result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true };
		const { client } = stubClient(raw);
		const useTable = defineTable<IItem>({ baseUrl: 'https://api.test/items', httpClient: client });
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.refresh();
			await flush();
			expect(t.data.value).toStrictEqual([{ id: '1', name: 'a' }]);
			expect(t.total.value).toBe(1);
		});
		scope.stop();
	});

	it('applies mapResponse to the raw payload', async () => {
		const raw: IRaw = { rows: [{ id: '7', title: 'seven' }], count: 1 };
		const { client } = stubClient(raw);
		const useTable = defineTable<IItem, IRaw>({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			mapResponse: (r) => ({
				result: r.rows.map((x) => ({ id: x.id, name: x.title })),
				totalCount: r.count,
				isSuccess: true,
			}),
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.refresh();
			await flush();
			expect(t.data.value).toStrictEqual([{ id: '7', name: 'seven' }]);
			expect(t.total.value).toBe(1);
		});
		scope.stop();
	});

	it('defaults sortMap to {} so no sort params are sent', async () => {
		const raw: IResponseList<IItem[]> = { result: [], totalCount: 0, isSuccess: true };
		const { client, get } = stubClient(raw);
		const useTable = defineTable<IItem>({ baseUrl: 'https://api.test/items', httpClient: client });
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.updateSort({ id: `name-${ESortOrder.ASC}`, field: 'name', order: ESortOrder.ASC });
			await flush();
			const params = lastParams(get);
			expect(params).not.toHaveProperty('orderBy');
			expect(params).not.toHaveProperty('orderByDescending');
		});
		scope.stop();
	});

	it('honors queryKeys when formatting pagination params', async () => {
		const raw: IResponseList<IItem[]> = { result: [], totalCount: 0, isSuccess: true };
		const { client, get } = stubClient(raw);
		const useTable = defineTable<IItem>({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.updatePagination({ page: 3, pageSize: 25 });
			await flush();
			expect(lastParams(get)).toMatchObject({ 'page[number]': 3, 'page[size]': 25 });
		});
		scope.stop();
	});

	it('passes headers as baseHeaders to the default fetch client', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ result: [], totalCount: 0, isSuccess: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
		const useTable = defineTable<IItem>({
			baseUrl: 'https://api.test/items',
			headers: { Accept: 'application/vnd.api+json' },
		});
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTable();
			t.refresh();
			await flush();
			expect(fetchMock).toHaveBeenCalled();
			const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
			expect((init.headers as Record<string, string>).Accept).toBe('application/vnd.api+json');
		});
		scope.stop();
		vi.unstubAllGlobals();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `packages/vue/`): `npx vitest run src/lib/composables/define-table.test.ts`
Expected: FAIL — cannot resolve `./define-table` (module does not exist yet).

- [ ] **Step 3: Write the factory implementation**

Create `packages/vue/src/lib/composables/define-table.ts`:

```ts
import {
	FetchHttpClient,
	HttpListRepository,
	type IHttpClient,
	type IPaginationParams,
	type IParamFormattingStrategy,
	type IRepositoryQueryKeys,
	type IResponseList,
} from '@bridgebyte/sst-core';
import { useTableStore, type IUseTableStoreReturn } from './use-table-store';

export interface IDefineTableConfig<T extends { id: string }, TRaw = unknown> {
	/** Required. Base URL for all requests, e.g. `https://api.example.com/users`. */
	readonly baseUrl: string;
	/** Default-client headers (e.g. a JSON:API `Accept`). Ignored when `httpClient` is provided. */
	readonly headers?: Record<string, string>;
	/** Escape hatch: supply a custom client (logging, interceptors, auth). Overrides `headers`. */
	readonly httpClient?: IHttpClient;
	/** Map a non-canonical API payload to `IResponseList<T[]>`. */
	readonly mapResponse?: (raw: TRaw) => IResponseList<T[]>;
	/** Override the query-string keys consumed by the table store. */
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	/** Map a column key to the server sort field. Default `{}` → no server-side sort. */
	readonly sortMap?: Readonly<Record<string, string>>;
	/** Map a filter key to a server param name. */
	readonly filterMap?: Readonly<Record<string, string>>;
	/** Initial pagination. Default `{ page: 1, pageSize: 10 }`. */
	readonly initialPagination?: IPaginationParams;
	/** Advanced filter/sort formatting strategy. */
	readonly paramFormatting?: IParamFormattingStrategy;
}

/**
 * Declarative table definition for Vue. Returns a `useTable()` composable that,
 * when called inside `setup`, builds the repository + store and auto-disposes
 * it on scope teardown.
 */
export function defineTable<T extends { id: string }, TRaw = unknown>(
	config: IDefineTableConfig<T, TRaw>,
): () => IUseTableStoreReturn<T> {
	const { mapResponse } = config;

	return function useTable(): IUseTableStoreReturn<T> {
		const httpClient: IHttpClient =
			config.httpClient ?? new FetchHttpClient(config.headers ? { baseHeaders: config.headers } : {});

		const repository = new HttpListRepository<T>({
			baseUrl: config.baseUrl,
			httpClient,
			...(mapResponse ? { responseListMapper: (raw: unknown): IResponseList<T[]> => mapResponse(raw as TRaw) } : {}),
			...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
		});

		return useTableStore<T>({
			repository,
			sortMap: config.sortMap ?? {},
			...(config.filterMap ? { filterMap: config.filterMap } : {}),
			...(config.initialPagination ? { initialPagination: config.initialPagination } : {}),
			...(config.queryKeys ? { queryKeys: config.queryKeys } : {}),
			...(config.paramFormatting ? { paramFormatting: config.paramFormatting } : {}),
		});
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `packages/vue/`): `npx vitest run src/lib/composables/define-table.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Export the factory from the package index**

Modify `packages/vue/src/index.ts` — add to the "Vue surface" section (after the `use-table-store` export):

```ts
export * from './lib/composables/define-table';
```

- [ ] **Step 6: Typecheck, build, and full test the package**

Run (from repo root):
```bash
npx nx run vue:typecheck
npx nx run vue:test
npx nx run vue:build
```
Expected: typecheck clean, all Vue tests pass (including the new file), build emits `dist/` with `defineTable` in the `.d.ts`.

- [ ] **Step 7: Format and commit**

```bash
npx prettier --write packages/vue/src/lib/composables/define-table.ts packages/vue/src/lib/composables/define-table.test.ts packages/vue/src/index.ts
git add packages/vue/src/lib/composables/define-table.ts packages/vue/src/lib/composables/define-table.test.ts packages/vue/src/index.ts
git commit -m "feat(vue): add defineTable factory for declarative table setup"
```

---

### Task 2: Rewrite the `test/vue` example to use `defineTable`

**Files:**
- Create: `test/vue/src/breed-table.ts`
- Delete: `test/vue/src/breed-repository.ts`
- Modify: `test/vue/src/App.vue`

**Interfaces:**
- Consumes: `defineTable` and `SstTable`, `IColumn` from `@bridgebyte/sst-vue` (the locally published build from Task 1).
- Produces: `useBreedTable` composable and `IBreed` interface, imported by `App.vue`.

- [ ] **Step 1: Create the declarative table definition**

Create `test/vue/src/breed-table.ts`:

```ts
import { defineTable } from '@bridgebyte/sst-vue';

export interface IBreed {
	id: string;
	name: string;
	description: string;
	hypoallergenic: boolean;
	lifeMin: number;
	lifeMax: number;
}

interface IDogApiResponse {
	data: ReadonlyArray<{
		id: string;
		type: 'breed';
		attributes: {
			name: string;
			description: string;
			hypoallergenic: boolean;
			life: { min: number; max: number };
		};
	}>;
	meta: { pagination: { records: number } };
}

export const useBreedTable = defineTable<IBreed, IDogApiResponse>({
	baseUrl: 'https://dogapi.dog/api/v2/breeds',
	headers: { Accept: 'application/vnd.api+json' },
	queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
	sortMap: {}, // dogapi doesn't support sort
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: (raw) => ({
		result: raw.data.map((b) => ({
			id: b.id,
			name: b.attributes.name,
			description: b.attributes.description,
			hypoallergenic: b.attributes.hypoallergenic,
			lifeMin: b.attributes.life.min,
			lifeMax: b.attributes.life.max,
		})),
		totalCount: raw.meta.pagination.records,
		isSuccess: true,
	}),
});
```

- [ ] **Step 2: Delete the old hand-rolled repository**

```bash
git rm test/vue/src/breed-repository.ts
```
(This removes the `JsonApiHttpClient`, the `BreedRepository` subclass, the `getList` override, and the call-log instrumentation — all now unnecessary.)

- [ ] **Step 3: Rewrite `App.vue`**

Replace the entire contents of `test/vue/src/App.vue` with:

```vue
<script setup lang="ts">
import { SstTable, type IColumn } from '@bridgebyte/sst-vue';
import '@bridgebyte/sst-vue/style.css';
import { useBreedTable } from './breed-table';

const columns: IColumn[] = [
	{ key: 'name', name: 'Breed' },
	{ key: 'description', name: 'Description' },
	{ key: 'hypoallergenic', name: 'Hypoallergenic' },
	{ key: 'life', name: 'Lifespan' },
];

const table = useBreedTable();

const truncate = (text: string, max = 90): string => (text.length > max ? `${text.slice(0, max)}…` : text);
</script>

<template>
	<main>
		<header>
			<h1>@bridgebyte/sst-vue — browser smoke test</h1>
			<p>
				Renders <a href="https://dogapi.dog/api/v2/breeds" target="_blank" rel="noopener">dogapi.dog</a>
				through <code>&lt;SstTable&gt;</code>.
			</p>
		</header>

		<SstTable :columns="columns" :store="table">
			<template #body-cell="{ row, column }">
				<template v-if="column.key === 'description'">
					<span class="description">{{ truncate(row.description) }}</span>
				</template>
				<template v-else-if="column.key === 'hypoallergenic'">
					<span class="badge" :class="row.hypoallergenic ? 'badge--yes' : 'badge--no'">
						{{ row.hypoallergenic ? 'YES' : 'no' }}
					</span>
				</template>
				<template v-else-if="column.key === 'life'">
					<span>{{ row.lifeMin }}–{{ row.lifeMax }} yrs</span>
				</template>
				<template v-else>
					<span>{{ (row as Record<string, unknown>)[column.key] }}</span>
				</template>
			</template>
		</SstTable>
	</main>
</template>
```

Note: `row` is now typed `IBreed` (inferred from `:store`), so `row.description` / `row.hypoallergenic` / `row.lifeMin` need no cast. Only the dynamic default cell keeps one localized `(row as Record<string, unknown>)[column.key]`.

- [ ] **Step 4: Republish the package and reinstall the test apps**

Run (from repo root):
```bash
npm run publish:local -- --with-tests
```
Expected: builds all packages (incl. the new `defineTable`), republishes `@bridgebyte/sst-*` to the local Verdaccio registry, and reinstalls `test/*` (resolving the new `@bridgebyte/sst-vue`). Requires the registry — `publish:local` auto-starts it if needed.

- [ ] **Step 5: Typecheck + build the example**

Run (from repo root): `npm run build --prefix test/vue`
Expected: `vue-tsc --noEmit` passes (no casts errors) and `vite build` emits `dist/`.

- [ ] **Step 6: Verify it renders in the browser**

Run (from repo root): `npm --prefix test/vue run dev`
Open the printed URL and confirm the table renders dogapi breeds with working pagination (and that the old "HTTP call log" panel is gone). Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add test/vue/src/breed-table.ts test/vue/src/App.vue
git commit -m "test(vue): rewrite smoke-test app with defineTable"
```

---

## Notes for the executor

- Unit tests (Task 1) run against `@bridgebyte/sst-core` **source** via the Vitest alias in `packages/vue/vitest.config.ts` — no publish needed for tests. The publish step (Task 2) is only because `test/vue` consumes the **published** `@bridgebyte/sst-vue`.
- `test/vue/package-lock.json` is gitignored and regenerated by `publish:local --with-tests`; do not commit it.
- If `vue-tsc` flags the `:store="table"` binding's row type as `unknown`, ensure `defineTable`'s `T extends { id: string }` constraint is present and that `IUseTableStoreReturn<T>` is the declared return type — the generic must be inferable from the `store` prop.
