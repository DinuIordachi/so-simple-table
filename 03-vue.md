# So Simple Table — Vue (`@sst/vue`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a Vue 3 adapter on top of `@sst/core` with composables that expose `Ref`/`ComputedRef` views over the headless `TableStore<T>`, plus a default styled `<SstTable>` SFC with full slot-based override hooks.

**Architecture:**
- `useObservable<T>` composable wraps `IReadonlyObservable<T>` in a Vue `Ref<T>` and auto-cleans on `onScopeDispose`.
- `useTableStore<T>(options)` instantiates a `TableStore<T>`, exposes signal-equivalent `Ref`s for every observable, and surfaces the bound action methods (`updatePagination`, `bulkDelete`, etc.).
- The default `<SstTable>` SFC uses scoped slots for `header-cell`, `body-cell`, `empty-state`, `bulk-actions`, and `pagination`. No external UI library.
- HTTP defaults to `FetchHttpClient` from core; users may pass any `IHttpClient`.

**Tech Stack:** Vue 3.5+, Vite library mode + `vite-plugin-dts` for bundling, Vitest + `@vue/test-utils` for tests, `@sst/core` peer dep.

**Prerequisites:** Plan `01-core.md` is fully implemented and `@sst/core` builds clean.

---

## File Structure

```
packages/vue/
├── package.json                  # name: "@sst/vue"
├── project.json
├── tsconfig.json
├── tsconfig.build.json
├── vite.config.ts
├── vitest.config.ts
├── README.md
└── src/
    ├── index.ts                  # public barrel
    └── lib/
        ├── composables/
        │   ├── use-observable.ts
        │   ├── use-observable.test.ts
        │   ├── use-table-store.ts
        │   └── use-table-store.test.ts
        └── components/
            ├── SstTable.vue
            └── SstTable.test.ts
```

---

## Task 1: Scaffold `@sst/vue` package

**Files:**
- Create: `packages/vue/package.json`
- Create: `packages/vue/tsconfig.json`
- Create: `packages/vue/tsconfig.build.json`
- Create: `packages/vue/vite.config.ts`
- Create: `packages/vue/vitest.config.ts`
- Create: `packages/vue/project.json`
- Create: `packages/vue/src/index.ts`
- Create: `packages/vue/README.md`
- Modify: `<repo-root>/tsconfig.base.json`

- [ ] **Step 1: Create `packages/vue/package.json`**

```json
{
  "name": "@sst/vue",
  "version": "0.1.0",
  "description": "So Simple Table — Vue 3 adapter on top of @sst/core.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./style.css": "./dist/style.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "sideEffects": ["**/*.css", "**/*.vue"],
  "scripts": {
    "build": "vite build && vue-tsc --noEmit -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "vue-tsc --noEmit -p tsconfig.json",
    "lint": "eslint src --ext .ts,.vue",
    "clean": "rm -rf dist coverage"
  },
  "peerDependencies": {
    "@sst/core": "workspace:*",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^15.0.0",
    "vite": "^5.4.0",
    "vite-plugin-dts": "^4.0.0",
    "vitest": "^2.0.0",
    "vue": "^3.5.0",
    "vue-tsc": "^2.1.0"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Create `packages/vue/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "preserve",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

- [ ] **Step 3: Create `packages/vue/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["**/*.test.ts", "vitest.config.ts", "vite.config.ts"]
}
```

- [ ] **Step 4: Create `packages/vue/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [
		vue(),
		dts({
			tsconfigPath: './tsconfig.build.json',
			rollupTypes: true,
			copyDtsFiles: false,
		}),
	],
	build: {
		lib: {
			entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
			name: 'SstVue',
			formats: ['es', 'cjs'],
			fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
		},
		rollupOptions: {
			external: ['vue', '@sst/core'],
			output: {
				globals: { vue: 'Vue', '@sst/core': 'SstCore' },
				assetFileNames: (assetInfo) => (assetInfo.name === 'style.css' ? 'style.css' : assetInfo.name ?? 'asset'),
			},
		},
		sourcemap: true,
		cssCodeSplit: false,
	},
});
```

- [ ] **Step 5: Create `packages/vue/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: { '@sst/core': new URL('../core/src/index.ts', import.meta.url).pathname },
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,vue}'],
			exclude: ['src/**/*.test.ts', 'src/index.ts'],
		},
	},
});
```

- [ ] **Step 6: Create `packages/vue/project.json`**

```json
{
  "name": "vue",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/vue/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{projectRoot}/dist"],
      "dependsOn": ["^build"]
    },
    "test": { "executor": "nx:run-script", "options": { "script": "test" } },
    "lint": { "executor": "nx:run-script", "options": { "script": "lint" } },
    "typecheck": { "executor": "nx:run-script", "options": { "script": "typecheck" } }
  },
  "implicitDependencies": ["core"]
}
```

- [ ] **Step 7: Create `packages/vue/src/index.ts`**

```ts
// @sst/vue public API — populated by subsequent tasks.
export {};
```

- [ ] **Step 8: Create `packages/vue/README.md`**

```markdown
# @sst/vue

Vue 3 adapter for **So Simple Table**. Built on top of [`@sst/core`](../core).

- `useObservable` — turns an `@sst/core` Observable into a Vue `Ref`
- `useTableStore` — composable wrapping `TableStore<T>` with refs and bound actions
- `<SstTable>` SFC — default UI with scoped slots for full overrides
```

- [ ] **Step 9: Add `@sst/vue` path mapping**

Update `<repo-root>/tsconfig.base.json` `paths`:
```json
"paths": {
  "@sst/core": ["packages/core/src/index.ts"],
  "@sst/ng": ["packages/ng/src/public-api.ts"],
  "@sst/vue": ["packages/vue/src/index.ts"]
}
```

- [ ] **Step 10: Install workspace dependencies**

```bash
npm install --workspace @sst/vue
```

- [ ] **Step 11: Verify typecheck passes**

```bash
npx nx run vue:typecheck
```

Expected: `0 errors`.

- [ ] **Step 12: Commit**

```bash
git add packages/vue tsconfig.base.json package.json package-lock.json
git commit -m "feat(vue): scaffold @sst/vue package"
```

---

## Task 2: `useObservable` composable

**Files:**
- Create: `packages/vue/src/lib/composables/use-observable.ts`
- Create: `packages/vue/src/lib/composables/use-observable.test.ts`
- Modify: `packages/vue/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { Observable } from '@sst/core';
import { useObservable } from './use-observable';

describe('useObservable', () => {
	it('initializes the ref with the observable current value', () => {
		const o = new Observable<number>(7);
		const scope = effectScope();
		scope.run(() => {
			const r = useObservable(o);
			expect(r.value).toBe(7);
		});
		scope.stop();
	});

	it('updates the ref when the observable changes', async () => {
		const o = new Observable<number>(0);
		const scope = effectScope();
		await scope.run(async () => {
			const r = useObservable(o);
			o.set(1);
			await nextTick();
			expect(r.value).toBe(1);
			o.set(2);
			await nextTick();
			expect(r.value).toBe(2);
		});
		scope.stop();
	});

	it('detaches the subscription when the effect scope is stopped', () => {
		const o = new Observable<number>(0);
		const scope = effectScope();
		const r = scope.run(() => useObservable(o))!;
		scope.stop();
		o.set(99);
		// Without auto-cleanup the ref would still update; assert that it does NOT.
		expect(r.value).toBe(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run vue:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `use-observable.ts`**

```ts
import { onScopeDispose, ref, type Ref } from 'vue';
import type { IReadonlyObservable } from '@sst/core';

export function useObservable<T>(source: IReadonlyObservable<T>): Readonly<Ref<T>> {
	const r = ref<T>(source.get()) as Ref<T>;
	const unsubscribe = source.subscribe((value) => {
		r.value = value;
	}, { emitOnSubscribe: false });
	onScopeDispose(unsubscribe);
	return r;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run vue:test
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Re-export and commit**

Update `packages/vue/src/index.ts`:
```ts
export * from './lib/composables/use-observable';
```

```bash
git add packages/vue/src
git commit -m "feat(vue): add useObservable composable"
```

---

## Task 3: `useTableStore` composable

**Files:**
- Create: `packages/vue/src/lib/composables/use-table-store.ts`
- Create: `packages/vue/src/lib/composables/use-table-store.test.ts`
- Modify: `packages/vue/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { ListRepository, type IResponse, type IResponseList } from '@sst/core';
import { useTableStore } from './use-table-store';

interface IItem { id: string; name: string; }

class StubRepository extends ListRepository<IItem> {
	public readonly getListMock = vi.fn<(...a: unknown[]) => Promise<IResponseList<IItem[]>>>().mockResolvedValue({
		result: [{ id: '1', name: 'a' }],
		totalCount: 1,
		isSuccess: true,
	});
	public readonly bulkDeleteMock = vi.fn<(...a: unknown[]) => Promise<IResponse<string>>>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
	public override getList(p: unknown): Promise<IResponseList<IItem[]>> { return this.getListMock(p); }
	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> { return this.bulkDeleteMock(ids); }
}

describe('useTableStore', () => {
	it('returns reactive refs for every observable on the store', () => {
		const repository = new StubRepository();
		const scope = effectScope();
		scope.run(() => {
			const t = useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } });
			expect(t.data.value).toStrictEqual([]);
			expect(t.total.value).toBe(0);
			expect(t.loading.value).toBe(false);
			expect(t.pagination.value).toStrictEqual({ page: 1, pageSize: 10 });
			expect(t.sort.value).toBeUndefined();
			expect(t.filters.value).toStrictEqual([]);
			expect(t.search.value).toBe('');
		});
		scope.stop();
	});

	it('refreshes data when an action mutates query state', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } });
			t.updatePagination({ page: 2, pageSize: 10 });
			await Promise.resolve();
			await Promise.resolve();
			await nextTick();
			expect(repository.getListMock).toHaveBeenCalledTimes(1);
			expect(t.data.value).toStrictEqual([{ id: '1', name: 'a' }]);
		});
		scope.stop();
	});

	it('cleans up the underlying TableStore subscription when the scope is disposed', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		const t = scope.run(() => useTableStore<IItem>({ repository, sortMap: {} }))!;
		scope.stop();
		t.updatePagination({ page: 5, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).not.toHaveBeenCalled();
	});

	it('exposes a bulkDelete that delegates to the repository', async () => {
		const repository = new StubRepository();
		const scope = effectScope();
		await scope.run(async () => {
			const t = useTableStore<IItem>({ repository, sortMap: {} });
			await t.bulkDelete(['1']);
			expect(repository.bulkDeleteMock).toHaveBeenCalledWith(['1']);
		});
		scope.stop();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run vue:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `use-table-store.ts`**

```ts
import { onScopeDispose, type Ref } from 'vue';
import {
	TableStore,
	type IFilterParams,
	type IPaginationParams,
	type IResponse,
	type ISortParams,
	type ITableStoreOptions,
} from '@sst/core';
import { useObservable } from './use-observable';

export interface IUseTableStoreReturn<T> {
	readonly store: TableStore<T>;
	readonly data: Readonly<Ref<readonly T[]>>;
	readonly total: Readonly<Ref<number>>;
	readonly loading: Readonly<Ref<boolean>>;
	readonly pagination: Readonly<Ref<IPaginationParams>>;
	readonly sort: Readonly<Ref<ISortParams | undefined>>;
	readonly filters: Readonly<Ref<readonly IFilterParams[]>>;
	readonly search: Readonly<Ref<string>>;

	getData(pagination: IPaginationParams, sort?: ISortParams, filters?: readonly IFilterParams[], search?: string): void;
	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	refresh(): void;
	reset(): void;
	updatePagination(p: IPaginationParams): void;
	updateSort(sort: ISortParams | undefined): void;
	updateFilter(filters: readonly IFilterParams[]): void;
	updateSearch(search: string): void;
}

export function useTableStore<T>(options: ITableStoreOptions<T>): IUseTableStoreReturn<T> {
	const store = new TableStore<T>(options);
	onScopeDispose(() => store.destroy());

	return {
		store,
		data: useObservable(store.data$),
		total: useObservable(store.total$),
		loading: useObservable(store.loading$),
		pagination: useObservable(store.pagination$),
		sort: useObservable(store.sort$),
		filters: useObservable(store.filters$),
		search: useObservable(store.search$),

		getData: store.getData.bind(store),
		bulkDelete: store.bulkDelete.bind(store),
		refresh: store.refresh.bind(store),
		reset: store.reset.bind(store),
		updatePagination: store.updatePagination.bind(store),
		updateSort: store.updateSort.bind(store),
		updateFilter: store.updateFilter.bind(store),
		updateSearch: store.updateSearch.bind(store),
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run vue:test
```

Expected: PASS — all 4 useTableStore tests green.

- [ ] **Step 5: Re-export and commit**

Update `packages/vue/src/index.ts`:
```ts
export * from './lib/composables/use-observable';
export * from './lib/composables/use-table-store';
```

```bash
git add packages/vue/src
git commit -m "feat(vue): add useTableStore composable"
```

---

## Task 4: `<SstTable>` SFC — default styled UI with scoped slots

**Files:**
- Create: `packages/vue/src/lib/components/SstTable.vue`
- Create: `packages/vue/src/lib/components/SstTable.test.ts`
- Modify: `packages/vue/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { ListRepository, type IColumn, type IResponse, type IResponseList } from '@sst/core';
import { useTableStore } from '../composables/use-table-store';
import SstTable from './SstTable.vue';

interface IItem { id: string; name: string; status: 'active' | 'paused'; }

class StubRepository extends ListRepository<IItem> {
	public override getList = vi.fn<(...a: unknown[]) => Promise<IResponseList<IItem[]>>>().mockResolvedValue({
		result: [
			{ id: '1', name: 'alpha', status: 'active' },
			{ id: '2', name: 'beta', status: 'paused' },
		],
		totalCount: 2,
		isSuccess: true,
	});
	public override bulkDelete = vi.fn<(...a: unknown[]) => Promise<IResponse<string>>>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
}

const columns: IColumn[] = [
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'status', name: 'Status' },
];

function makeHost() {
	return defineComponent({
		setup() {
			const repository = new StubRepository();
			const t = useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } });
			return { t, repository };
		},
		render() {
			return h(
				SstTable,
				{ columns, store: this.t, bulk: true, searchEnabled: true },
				{
					'header-cell': (s: { column: IColumn }) => h('strong', s.column.name),
					'body-cell': (s: { row: IItem; column: IColumn }) =>
						h('span', { 'data-test-cell': '' }, String(s.row[s.column.key as keyof IItem])),
				},
			);
		},
	});
}

describe('<SstTable>', () => {
	it('renders a row per data item using the body-cell slot', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		await wrapper.vm.$nextTick();
		const cells = wrapper.findAll('[data-test-cell]');
		expect(cells.length).toBe(4); // 2 rows × 2 cols
		expect(cells[0]!.text()).toBe('alpha');
		expect(cells[1]!.text()).toBe('active');
	});

	it('renders the empty state when no data is present', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		(wrapper.vm as { t: { updateData: (d: readonly IItem[]) => void; updateTotal: (n: number) => void } }).t.updateData([]);
		(wrapper.vm as { t: { updateTotal: (n: number) => void } }).t.updateTotal(0);
		await wrapper.vm.$nextTick();
		expect(wrapper.find('[data-test-empty]').exists()).toBe(true);
	});

	it('updates store search after typing into the search input (debounced)', async () => {
		vi.useFakeTimers();
		const wrapper = mount(makeHost());
		await flushPromises();
		const input = wrapper.find('input[data-test-search]');
		await input.setValue('alpha');
		vi.advanceTimersByTime(600);
		await flushPromises();
		expect((wrapper.vm as { t: { search: { value: string } } }).t.search.value).toBe('alpha');
		vi.useRealTimers();
	});

	it('toggles all checkboxes when the bulk header checkbox is checked', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		await wrapper.find('input[data-test-bulk-all]').setValue(true);
		const rowChecks = wrapper.findAll('input[data-test-bulk-row]');
		expect(rowChecks.every((c) => (c.element as HTMLInputElement).checked)).toBe(true);
	});

	it('exposes data-sortable on header cells based on column.sortable', async () => {
		const wrapper = mount(makeHost());
		await flushPromises();
		const ths = wrapper.findAll('[data-test-th]');
		expect(ths[0]!.attributes('data-sortable')).toBe('true');
		expect(ths[1]!.attributes('data-sortable')).toBe('false');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run vue:test
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `SstTable.vue`**

```vue
<script setup lang="ts" generic="T extends { id: string }">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ESortOrder, type IColumn, type ISortParams } from '@sst/core';
import type { IUseTableStoreReturn } from '../composables/use-table-store';

interface IProps {
	columns: readonly IColumn[];
	store: IUseTableStoreReturn<T>;
	bulk?: boolean;
	searchEnabled?: boolean;
	searchPlaceholder?: string;
	searchDebounceMs?: number;
	emptyText?: string;
	bulkDeleteLabel?: string;
}

const props = withDefaults(defineProps<IProps>(), {
	bulk: false,
	searchEnabled: false,
	searchPlaceholder: 'Search',
	searchDebounceMs: 500,
	emptyText: 'No results',
	bulkDeleteLabel: 'Delete selected',
});

defineSlots<{
	'header-cell'(props: { column: IColumn }): unknown;
	'body-cell'(props: { row: T; column: IColumn; index: number }): unknown;
	'empty-state'(): unknown;
	'bulk-actions'(props: { selected: ReadonlySet<string> }): unknown;
	'pagination'(props: { page: number; pageSize: number; total: number; totalPages: number; setPage: (p: number) => void }): unknown;
}>();

const searchInput = ref<string>(props.store.search.value);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const bulkSelected = ref<Set<string>>(new Set());
const bulkDeleteLoading = ref<boolean>(false);

watch(
	() => props.store.search.value,
	(value) => {
		if (searchInput.value !== value) searchInput.value = value;
	},
);

onBeforeUnmount(() => {
	if (searchTimer !== undefined) clearTimeout(searchTimer);
});

const allChecked = computed(() => {
	const data = props.store.data.value;
	const selected = bulkSelected.value;
	return data.length > 0 && data.every((row) => selected.has(row.id));
});

const indeterminate = computed(() => {
	const data = props.store.data.value;
	const selected = bulkSelected.value;
	return data.some((row) => selected.has(row.id)) && !allChecked.value;
});

const totalPages = computed(() => {
	const total = props.store.total.value;
	const size = props.store.pagination.value.pageSize;
	return Math.max(1, Math.ceil(total / size));
});

function onSearchInput(event: Event): void {
	const value = (event.target as HTMLInputElement).value;
	searchInput.value = value;
	if (searchTimer !== undefined) clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		props.store.updateSearch(value);
	}, props.searchDebounceMs);
}

function onClearSearch(): void {
	searchInput.value = '';
	props.store.updateSearch('');
}

function onSortClick(column: IColumn): void {
	if (!column.sortable) return;
	const current = props.store.sort.value;
	const next: ISortParams | undefined =
		!current || current.field !== column.key
			? { id: `${column.key}-${ESortOrder.ASC}`, field: column.key, order: ESortOrder.ASC }
			: current.order === ESortOrder.ASC
				? { id: `${column.key}-${ESortOrder.DESC}`, field: column.key, order: ESortOrder.DESC }
				: undefined;
	props.store.updateSort(next);
}

function sortIndicator(column: IColumn): '↑' | '↓' | '' {
	const sort = props.store.sort.value;
	if (!sort || sort.field !== column.key) return '';
	return sort.order === ESortOrder.ASC ? '↑' : '↓';
}

function onAllChecked(event: Event): void {
	const checked = (event.target as HTMLInputElement).checked;
	if (!checked) {
		bulkSelected.value = new Set();
		return;
	}
	bulkSelected.value = new Set(props.store.data.value.map((r) => r.id));
}

function onRowChecked(id: string, event: Event): void {
	const checked = (event.target as HTMLInputElement).checked;
	const next = new Set(bulkSelected.value);
	if (checked) next.add(id); else next.delete(id);
	bulkSelected.value = next;
}

async function onBulkDelete(): Promise<void> {
	const ids = [...bulkSelected.value];
	if (ids.length === 0) return;
	bulkDeleteLoading.value = true;
	try {
		await props.store.bulkDelete(ids);
		bulkSelected.value = new Set();
	} finally {
		bulkDeleteLoading.value = false;
	}
}

function setPage(page: number): void {
	const current = props.store.pagination.value;
	props.store.updatePagination({ ...current, page });
}
</script>

<template>
	<div class="sst-table">
		<div v-if="searchEnabled || bulk" class="sst-table__toolbar">
			<div v-if="searchEnabled" class="sst-table__search">
				<input
					type="text"
					data-test-search
					:value="searchInput"
					:placeholder="searchPlaceholder"
					@input="onSearchInput"
				/>
				<button
					v-if="searchInput.length > 0"
					type="button"
					class="sst-table__search-clear"
					aria-label="Clear search"
					@click="onClearSearch"
				>×</button>
			</div>
			<div v-if="bulk" class="sst-table__bulk">
				<slot name="bulk-actions" :selected="bulkSelected">
					<button
						type="button"
						:disabled="bulkSelected.size === 0 || bulkDeleteLoading"
						@click="onBulkDelete"
					>{{ bulkDeleteLabel }}</button>
				</slot>
			</div>
		</div>

		<table class="sst-table__table">
			<thead>
				<tr>
					<th v-if="bulk" class="sst-table__check-cell">
						<input
							type="checkbox"
							data-test-bulk-all
							:checked="allChecked"
							:indeterminate="indeterminate"
							@change="onAllChecked"
						/>
					</th>
					<th
						v-for="column in columns"
						:key="column.key"
						:data-test-th="column.key"
						:data-sortable="column.sortable ? 'true' : 'false'"
						:class="{ 'sst-table__th--sortable': column.sortable }"
						:style="column.width ? { width: column.width + 'px' } : undefined"
						@click="onSortClick(column)"
					>
						<div class="sst-table__th-inner">
							<slot name="header-cell" :column="column">{{ column.name }}</slot>
							<span v-if="column.sortable" class="sst-table__sort-indicator">{{ sortIndicator(column) }}</span>
						</div>
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-if="store.data.value.length === 0 && !store.loading.value">
					<tr>
						<td :colspan="columns.length + (bulk ? 1 : 0)" data-test-empty>
							<slot name="empty-state">
								<div class="sst-table__empty">{{ emptyText }}</div>
							</slot>
						</td>
					</tr>
				</template>
				<template v-else>
					<tr v-for="(row, rowIndex) in store.data.value" :key="row.id">
						<td v-if="bulk" class="sst-table__check-cell">
							<input
								type="checkbox"
								:data-test-bulk-row="row.id"
								:checked="bulkSelected.has(row.id)"
								@change="(e) => onRowChecked(row.id, e)"
							/>
						</td>
						<td v-for="column in columns" :key="column.key">
							<slot name="body-cell" :row="row" :column="column" :index="rowIndex">
								{{ (row as Record<string, unknown>)[column.key] }}
							</slot>
						</td>
					</tr>
				</template>
			</tbody>
		</table>

		<div v-if="totalPages > 1" class="sst-table__pagination">
			<slot
				name="pagination"
				:page="store.pagination.value.page"
				:pageSize="store.pagination.value.pageSize"
				:total="store.total.value"
				:totalPages="totalPages"
				:setPage="setPage"
			>
				<button
					type="button"
					:disabled="store.pagination.value.page <= 1"
					@click="setPage(store.pagination.value.page - 1)"
				>‹</button>
				<span>Page {{ store.pagination.value.page }} / {{ totalPages }}</span>
				<button
					type="button"
					:disabled="store.pagination.value.page >= totalPages"
					@click="setPage(store.pagination.value.page + 1)"
				>›</button>
			</slot>
		</div>

		<div v-if="store.loading.value" class="sst-table__loading" aria-live="polite">Loading…</div>
	</div>
</template>

<style scoped>
.sst-table { display: block; width: 100%; }
.sst-table__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.sst-table__search { position: relative; display: inline-flex; gap: 4px; }
.sst-table__search input { padding: 6px 28px 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 14px; min-width: 240px; }
.sst-table__search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; font-size: 18px; cursor: pointer; line-height: 1; padding: 4px; }
.sst-table__table { width: 100%; border-collapse: collapse; }
.sst-table__table th, .sst-table__table td { padding: 10px 12px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
.sst-table__table th { font-weight: 600; background: #fafafa; }
.sst-table__th--sortable { cursor: pointer; user-select: none; }
.sst-table__th-inner { display: inline-flex; align-items: center; gap: 6px; }
.sst-table__sort-indicator { font-size: 12px; opacity: 0.6; }
.sst-table__check-cell { width: 32px; text-align: center; }
.sst-table__empty { padding: 24px; text-align: center; color: #888; }
.sst-table__pagination { margin-top: 12px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.sst-table__pagination button { padding: 4px 10px; border: 1px solid #d0d0d0; background: #fff; border-radius: 4px; cursor: pointer; }
.sst-table__pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.sst-table__loading { padding: 12px; text-align: center; font-style: italic; color: #666; }
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run vue:test
```

Expected: PASS — all 5 component tests green.

- [ ] **Step 5: Re-export from barrel**

Update `packages/vue/src/index.ts`:
```ts
export * from './lib/composables/use-observable';
export * from './lib/composables/use-table-store';
export { default as SstTable } from './lib/components/SstTable.vue';
```

- [ ] **Step 6: Commit**

```bash
git add packages/vue/src
git commit -m "feat(vue): add <SstTable> default UI with scoped slot overrides"
```

---

## Task 5: Re-export `@sst/core` types from `@sst/vue`

**Files:**
- Modify: `packages/vue/src/index.ts`

- [ ] **Step 1: Replace the barrel with the full surface**

```ts
export type {
	HttpQueryParams,
	IBaseItem,
	IColumn,
	IColumnFilterOption,
	IFilterParams,
	IHttpClient,
	IHttpRequestOptions,
	IPaginationParams,
	IParamFormattingStrategy,
	IRealtimeAdapter,
	IReadonlyObservable,
	IRepositoryConfig,
	IRepositoryQueryKeys,
	IResponse,
	IResponseError,
	IResponseList,
	ISortParams,
	ITableStore,
	ITableStoreOptions,
	Listener,
	ResponseListMapper,
	Unsubscribe,
} from '@sst/core';
export {
	DEFAULT_QUERY_KEYS,
	ESortOrder,
	FetchHttpClient,
	HttpListRepository,
	HttpRepository,
	HttpSelectRepository,
	ListRepository,
	Observable,
	Repository,
	SelectRepository,
	TableStore,
	arrayToMap,
	deepEqual,
	mapTableParams,
	watch,
} from '@sst/core';

export * from './lib/composables/use-observable';
export * from './lib/composables/use-table-store';
export { default as SstTable } from './lib/components/SstTable.vue';
```

- [ ] **Step 2: Run typecheck**

```bash
npx nx run vue:typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Run tests**

```bash
npx nx run vue:test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/vue/src
git commit -m "feat(vue): re-export @sst/core types from @sst/vue barrel"
```

---

## Task 6: Build `@sst/vue` and verify artifact

**Files:** none modified — verification only.

- [ ] **Step 1: Build core first**

```bash
npx nx run core:build
```

Expected: `packages/core/dist/index.js` exists.

- [ ] **Step 2: Build vue**

```bash
npx nx run vue:build
```

Expected: `packages/vue/dist/` contains `index.js`, `index.cjs`, `index.d.ts`, `style.css`. The bundle does NOT include any code from `vue` or `@sst/core` (they should be external).

- [ ] **Step 3: Inspect produced files**

```bash
ls packages/vue/dist
```

Expected listing includes the files above.

- [ ] **Step 4: Verify externals**

```bash
node -e "const c = require('fs').readFileSync('./packages/vue/dist/index.js', 'utf8'); console.log(c.includes('@sst/core') ? 'OK: core kept external' : 'FAIL: core inlined');"
```

Expected: `OK: core kept external`.

- [ ] **Step 5: Run tests one more time**

```bash
npx nx run vue:test
```

Expected: PASS.

- [ ] **Step 6: Commit any cleanups**

```bash
git status
git add . 2>/dev/null; git commit -m "chore(vue): build verification" 2>/dev/null || echo "nothing to commit"
```

---

## Task 7: Write `@sst/vue` README usage examples

**Files:**
- Modify: `packages/vue/README.md`

- [ ] **Step 1: Replace the placeholder README**

```markdown
# @sst/vue

Vue 3 adapter for **So Simple Table**, built on top of [`@sst/core`](https://www.npmjs.com/package/@sst/core).

## Installation

```bash
npm install @sst/core @sst/vue
```

Import the bundled CSS once at app entry:

```ts
import '@sst/vue/style.css';
```

## 1. Define a repository

```ts
import { HttpRepository } from '@sst/vue';

interface IStrategy { id: string; name: string; createdAt: string; }

export class StrategyRepository extends HttpRepository<IStrategy> {}

export const strategyRepository = new StrategyRepository({
	baseUrl: 'https://api.example.com/strategies',
});
```

## 2. Use the composable + component

```vue
<script setup lang="ts">
import { SstTable, useTableStore, type IColumn } from '@sst/vue';
import { strategyRepository } from './strategies.repository';

interface IStrategy { id: string; name: string; createdAt: string; }

const columns: IColumn[] = [
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'createdAt', name: 'Created' },
];

const store = useTableStore<IStrategy>({
	repository: strategyRepository,
	sortMap: { createdAt: 'ByCreationDate', name: 'ByName' },
});
</script>

<template>
	<SstTable :columns="columns" :store="store" :bulk="true" :searchEnabled="true">
		<template #header-cell="{ column }">
			<strong>{{ column.name }}</strong>
		</template>
		<template #body-cell="{ row, column }">
			{{ row[column.key] }}
		</template>
		<template #empty-state>
			<p>No strategies yet — try creating one.</p>
		</template>
	</SstTable>
</template>
```

## Customizing the wire format

```ts
new HttpRepository({
	baseUrl: 'https://api.example.com/strategies',
	queryKeys: { page: 'pageNumber', pageSize: 'limit' },
	responseListMapper: (raw) => {
		const r = raw as { items: IStrategy[]; total: number };
		return { result: r.items, totalCount: r.total, isSuccess: true };
	},
});
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add packages/vue/README.md
git commit -m "docs(vue): add @sst/vue README with usage examples"
```

---

## Self-Review Checklist

1. **Spec coverage**
	- ✅ Vue variant of the table — Tasks 3, 4.
	- ✅ Reuses the headless `TableStore<T>` from core — Task 3.
	- ✅ Default UI + slot overrides (`header-cell`, `body-cell`, `empty-state`, `bulk-actions`, `pagination`) — Task 4.
	- ✅ No translation layer.
	- ✅ No responsive split.
	- ✅ Pluggable HTTP client (`@sst/core` `IHttpClient`) re-exported — Task 5.

2. **Placeholder scan** — none.

3. **Type consistency**
	- `IUseTableStoreReturn<T>` mirrors the `ITableStore<T>` shape using `Readonly<Ref<T>>` for state.
	- `<SstTable T extends { id: string }>` matches the bulk-row checkbox logic (relies on `row.id`).
	- The `store` prop type is `IUseTableStoreReturn<T>`, which is exactly what `useTableStore` returns.

---

**Plan 3 complete.** Continue to `04-react.md`.
