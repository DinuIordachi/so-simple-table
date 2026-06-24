# @sst/vue/primevue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `@sst/vue/primevue` subpath that binds a So Simple Table `TableStore` to a PrimeVue v4 `DataTable` (lazy mode) via a headless composable `useSstDataTable` and a thin `<SstDataTable>` wrapper, preserving all native DataTable features and the host theme.

**Architecture:** `useSstDataTable(store, options)` returns a reactive, `v-bind`-able bag of lazy DataTable props + `@page`/`@sort`/`@filter` handlers + a `removeSelected` helper, mapping events onto the existing `TableStore`. `<SstDataTable>` calls the composable and renders `<DataTable v-bind>` forwarding `$attrs` + all slots. Built as a second Vite lib entry; `primevue` is an optional peer dependency.

**Tech Stack:** TypeScript, Vue 3 (`<script setup generic>`, composables), PrimeVue v4 (`primevue/datatable`), Vite multi-entry lib + vite-plugin-dts, Vitest + @vue/test-utils + happy-dom.

## Global Constraints

- **TypeScript:** `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` (from `tsconfig.base.json`). Never assign `undefined` to an optional property — use conditional-spread or `withDefaults`.
- **Formatting:** tabs; run `npx prettier --write` on touched files.
- **No runtime CSS** shipped from the package. No `@sst/core` changes.
- **PrimeVue:** v4 only; `primevue` is an **optional** peer dependency of `@sst/vue` and a devDependency for build/test. `@primevue/themes` is used **only** in `test/primevue`.
- **Row constraint:** `T extends { id: string }`.
- **Type imports** from `@sst/core` and `../lib/composables/use-table-store` must be `import type` (erased) so the `primevue` entry shares no runtime chunk with the main entry.
- **Sort encoding:** PrimeVue `1` = ascending → `ESortOrder.ASC`; `-1` = descending → `ESortOrder.DESC`.
- **Verdaccio:** `test/primevue` consumes the published `@sst/vue`; rebuild + republish before installing it (`npm run publish:local`). Its `package-lock.json` is gitignored (the `test/*/package-lock.json` rule already covers it).

---

### Task 1: `useSstDataTable` composable (TDD)

**Files:**
- Create: `packages/vue/src/primevue/use-sst-data-table.ts`
- Test: `packages/vue/src/primevue/use-sst-data-table.test.ts`
- Modify: `packages/vue/package.json` (add `primevue` devDependency)

**Interfaces:**
- Consumes: `ESortOrder`, `IFilterParams`, `IResponse` (type) from `@sst/core`; `IUseTableStoreReturn` (type) from `../lib/composables/use-table-store`; `DataTablePageEvent`, `DataTableSortEvent`, `DataTableFilterEvent`, `DataTableFilterMeta` (types) from `primevue/datatable`.
- Produces: `IUseSstDataTableOptions<T>`, `ISstDataTableBindings<T>`, and `useSstDataTable<T extends { id: string }>(store, options?) => ISstDataTableBindings<T>`.

- [ ] **Step 1: Add `primevue` devDependency and install**

Edit `packages/vue/package.json` — add to `devDependencies` (keep alphabetical-ish, valid JSON):

```json
"primevue": "^4.5.0",
```

Then from repo root:
```bash
npm install
```
Expected: `primevue` resolves from npmjs into the workspace `node_modules`.

- [ ] **Step 2: Write the failing test**

Create `packages/vue/src/primevue/use-sst-data-table.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { ESortOrder, type IFilterParams, type IPaginationParams, type ISortParams } from '@sst/core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import { useSstDataTable, type IUseSstDataTableOptions, type ISstDataTableBindings } from './use-sst-data-table';

interface IItem {
	id: string;
	name: string;
}

function makeStore(): IUseTableStoreReturn<IItem> {
	return {
		store: {} as IUseTableStoreReturn<IItem>['store'],
		data: ref<readonly IItem[]>([]) as Readonly<Ref<readonly IItem[]>>,
		total: ref(0),
		loading: ref(false),
		pagination: ref<IPaginationParams>({ page: 1, pageSize: 10 }),
		sort: ref<ISortParams | undefined>(undefined),
		filters: ref<readonly IFilterParams[]>([]),
		search: ref(''),
		getData: vi.fn(),
		bulkDelete: vi.fn().mockResolvedValue({ result: 'ok', isSuccess: true }),
		refresh: vi.fn(),
		reset: vi.fn(),
		updatePagination: vi.fn(),
		updateSort: vi.fn(),
		updateFilter: vi.fn(),
		updateSearch: vi.fn(),
		updateData: vi.fn(),
		updateTotal: vi.fn(),
	} as unknown as IUseTableStoreReturn<IItem>;
}

// Mount a harness so the composable runs inside a real component (onMounted fires).
function harness(store: IUseTableStoreReturn<IItem>, options?: IUseSstDataTableOptions<IItem>) {
	let bindings!: ISstDataTableBindings<IItem>;
	const Comp = defineComponent({
		setup() {
			bindings = useSstDataTable<IItem>(store, options);
			return () => h('div');
		},
	});
	const wrapper = mount(Comp);
	return {
		wrapper,
		get bindings() {
			return bindings;
		},
	};
}

describe('useSstDataTable', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('refreshes on mount by default and exposes lazy bindings from the store', () => {
		const store = makeStore();
		(store.total as Ref<number>).value = 42;
		(store.pagination as Ref<IPaginationParams>).value = { page: 3, pageSize: 20 };
		const { bindings } = harness(store);
		expect(store.refresh).toHaveBeenCalledTimes(1);
		expect(bindings.lazy).toBe(true);
		expect(bindings.totalRecords).toBe(42);
		expect(bindings.first).toBe(40); // (3 - 1) * 20
		expect(bindings.rows).toBe(20);
	});

	it('does not refresh on mount when immediate is false', () => {
		const store = makeStore();
		harness(store, { immediate: false });
		expect(store.refresh).not.toHaveBeenCalled();
	});

	it('maps @page (0-based) to updatePagination (1-based)', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings.onPage({ page: 2, rows: 25, first: 50, pageCount: 4 } as never);
		expect(store.updatePagination).toHaveBeenCalledWith({ page: 3, pageSize: 25 });
	});

	it('maps @sort to updateSort with ESortOrder, and clears on null field', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings.onSort({ sortField: 'name', sortOrder: -1 } as never);
		expect(store.updateSort).toHaveBeenCalledWith({ id: `name-${ESortOrder.DESC}`, field: 'name', order: ESortOrder.DESC });
		bindings.onSort({ sortField: null, sortOrder: null } as never);
		expect(store.updateSort).toHaveBeenLastCalledWith(undefined);
	});

	it('exposes sortField/sortOrder from the store sort', () => {
		const store = makeStore();
		(store.sort as Ref<ISortParams | undefined>).value = { id: 'name-1', field: 'name', order: ESortOrder.ASC };
		const { bindings } = harness(store);
		expect(bindings.sortField).toBe('name');
		expect(bindings.sortOrder).toBe(1);
	});

	it('debounces @filter and maps global → search and per-column value → filters', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings.onFilter({ filters: { global: { value: 'ada', matchMode: 'contains' }, name: { value: 'lin', matchMode: 'contains' } } } as never);
		expect(store.updateSearch).not.toHaveBeenCalled(); // debounced
		vi.advanceTimersByTime(300);
		expect(store.updateSearch).toHaveBeenCalledWith('ada');
		expect(store.updateFilter).toHaveBeenCalledWith([{ key: 'name', value: 'lin' }]);
	});

	it('honors a custom mapFilters', () => {
		const store = makeStore();
		const mapFilters = vi.fn().mockReturnValue({ search: 'x', filters: [{ key: 'k', value: 'v' }] });
		const { bindings } = harness(store, { mapFilters });
		bindings.onFilter({ filters: { name: { value: 'n', matchMode: 'equals' } } } as never);
		vi.advanceTimersByTime(300);
		expect(mapFilters).toHaveBeenCalled();
		expect(store.updateSearch).toHaveBeenCalledWith('x');
		expect(store.updateFilter).toHaveBeenCalledWith([{ key: 'k', value: 'v' }]);
	});

	it('removeSelected delegates ids to store.bulkDelete', async () => {
		const store = makeStore();
		const { bindings } = harness(store);
		await bindings.removeSelected([{ id: '1', name: 'a' }, { id: '2', name: 'b' }]);
		expect(store.bulkDelete).toHaveBeenCalledWith(['1', '2']);
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run (from `packages/vue/`): `npx vitest run src/primevue/use-sst-data-table.test.ts`
Expected: FAIL — cannot resolve `./use-sst-data-table`.

- [ ] **Step 4: Implement the composable**

Create `packages/vue/src/primevue/use-sst-data-table.ts`:

```ts
import { getCurrentInstance, onMounted, reactive } from 'vue';
import { ESortOrder, type IFilterParams, type IResponse } from '@sst/core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import type {
	DataTableFilterEvent,
	DataTableFilterMeta,
	DataTablePageEvent,
	DataTableSortEvent,
} from 'primevue/datatable';

/** PrimeVue encodes ascending as 1 and descending as -1 in `sortOrder`. */
const PRIME_ASC = 1;
const PRIME_DESC = -1;

/** Options for {@link useSstDataTable}. */
export interface IUseSstDataTableOptions<T extends { id: string }> {
	/** Call `store.refresh()` on mount (PrimeVue lazy does not auto-fetch). Default `true`. */
	readonly immediate?: boolean;
	/** Debounce (ms) before a `@filter` is pushed to the store. Default `300`. */
	readonly filterDebounceMs?: number;
	/** Override how PrimeVue's filter object maps to store search/filters (e.g. to encode `matchMode`). */
	readonly mapFilters?: (filters: DataTableFilterMeta) => { search?: string; filters?: IFilterParams[] };
}

/**
 * Reactive, `v-bind`-able bag of PrimeVue `DataTable` lazy props plus the
 * `@page` / `@sort` / `@filter` handlers and a `removeSelected` helper.
 *
 * @typeParam T - Row type; must carry a string `id`.
 */
export interface ISstDataTableBindings<T extends { id: string }> {
	readonly lazy: true;
	readonly value: readonly T[];
	readonly totalRecords: number;
	readonly loading: boolean;
	readonly first: number;
	readonly rows: number;
	readonly sortField: string | undefined;
	readonly sortOrder: number | undefined;
	onPage(event: DataTablePageEvent): void;
	onSort(event: DataTableSortEvent): void;
	onFilter(event: DataTableFilterEvent): void;
	removeSelected(rows: T | readonly T[]): Promise<IResponse<string>>;
}

function extractFilterValue(meta: unknown): unknown {
	if (meta && typeof meta === 'object') {
		if ('value' in meta) return (meta as { value: unknown }).value;
		if ('constraints' in meta) {
			const constraints = (meta as { constraints?: ReadonlyArray<{ value: unknown }> }).constraints;
			return constraints && constraints.length > 0 ? constraints[0]?.value : undefined;
		}
	}
	return undefined;
}

/** Default filter mapping: `global` → search; every other non-empty value → a `{ key, value }` filter. */
function defaultMapFilters(filters: DataTableFilterMeta): { search?: string; filters?: IFilterParams[] } {
	const result: { search?: string; filters?: IFilterParams[] } = {};
	const out: IFilterParams[] = [];
	for (const [key, meta] of Object.entries(filters ?? {})) {
		const value = extractFilterValue(meta);
		if (value === null || value === undefined || value === '') continue;
		if (key === 'global') {
			result.search = String(value);
		} else {
			out.push({ key, value: String(value) });
		}
	}
	if (out.length > 0) result.filters = out;
	return result;
}

/**
 * Bind a So Simple Table {@link IUseTableStoreReturn | store} to a PrimeVue v4
 * `DataTable` running in lazy mode. Spread the result onto `<DataTable v-bind>`.
 *
 * @typeParam T - Row type; must carry a string `id`.
 * @param store - A store from `useTableStore` / `defineTable`.
 * @param options - See {@link IUseSstDataTableOptions}.
 * @returns Reactive bindings ({@link ISstDataTableBindings}).
 *
 * @remarks Call inside a component `setup`; `immediate` uses `onMounted`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import DataTable from 'primevue/datatable';
 * import Column from 'primevue/column';
 * import { useSstDataTable } from '@sst/vue/primevue';
 * const bindings = useSstDataTable(table);
 * </script>
 * <template>
 *   <DataTable v-bind="bindings" dataKey="id" paginator :rows="10">
 *     <Column field="name" header="Name" sortable />
 *   </DataTable>
 * </template>
 * ```
 */
export function useSstDataTable<T extends { id: string }>(
	store: IUseTableStoreReturn<T>,
	options: IUseSstDataTableOptions<T> = {},
): ISstDataTableBindings<T> {
	const { immediate = true, filterDebounceMs = 300, mapFilters = defaultMapFilters } = options;
	let filterTimer: ReturnType<typeof setTimeout> | undefined;

	if (getCurrentInstance()) {
		onMounted(() => {
			if (immediate) store.refresh();
		});
	}

	const bindings = reactive({
		lazy: true as const,
		get value() {
			return store.data.value;
		},
		get totalRecords() {
			return store.total.value;
		},
		get loading() {
			return store.loading.value;
		},
		get first() {
			const pagination = store.pagination.value;
			return (pagination.page - 1) * pagination.pageSize;
		},
		get rows() {
			return store.pagination.value.pageSize;
		},
		get sortField() {
			return store.sort.value?.field;
		},
		get sortOrder() {
			const sort = store.sort.value;
			if (!sort) return undefined;
			return sort.order === ESortOrder.ASC ? PRIME_ASC : PRIME_DESC;
		},
		onPage(event: DataTablePageEvent) {
			store.updatePagination({ page: event.page + 1, pageSize: event.rows });
		},
		onSort(event: DataTableSortEvent) {
			const field = event.sortField;
			if (typeof field !== 'string' || field.length === 0) {
				store.updateSort(undefined);
				return;
			}
			const order = event.sortOrder === PRIME_DESC ? ESortOrder.DESC : ESortOrder.ASC;
			store.updateSort({ id: `${field}-${order}`, field, order });
		},
		onFilter(event: DataTableFilterEvent) {
			if (filterTimer !== undefined) clearTimeout(filterTimer);
			filterTimer = setTimeout(() => {
				const mapped = mapFilters(event.filters);
				const current = store.pagination.value;
				if (current.page !== 1) store.updatePagination({ ...current, page: 1 });
				store.updateSearch(mapped.search ?? '');
				store.updateFilter(mapped.filters ?? []);
			}, filterDebounceMs);
		},
		removeSelected(rows: T | readonly T[]): Promise<IResponse<string>> {
			const list = Array.isArray(rows) ? (rows as readonly T[]) : [rows];
			return store.bulkDelete(list.map((row) => row.id));
		},
	});

	return bindings as ISstDataTableBindings<T>;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run (from `packages/vue/`): `npx vitest run src/primevue/use-sst-data-table.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Format + commit**

```bash
npx prettier --write packages/vue/src/primevue/use-sst-data-table.ts packages/vue/src/primevue/use-sst-data-table.test.ts packages/vue/package.json
git add packages/vue/src/primevue/use-sst-data-table.ts packages/vue/src/primevue/use-sst-data-table.test.ts packages/vue/package.json package-lock.json
git commit -m "feat(vue): add useSstDataTable composable for PrimeVue DataTable"
```

---

### Task 2: `<SstDataTable>` wrapper + subpath barrel

**Files:**
- Create: `packages/vue/src/primevue/SstDataTable.vue`
- Create: `packages/vue/src/primevue/index.ts`
- Test: `packages/vue/src/primevue/SstDataTable.test.ts`

**Interfaces:**
- Consumes: `useSstDataTable`, `IUseSstDataTableOptions` from `./use-sst-data-table`; `IUseTableStoreReturn` (type) from `../lib/composables/use-table-store`; `DataTable` from `primevue/datatable`.
- Produces: default-exported `SstDataTable` component; barrel `index.ts` re-exporting the composable surface + `SstDataTable`.

- [ ] **Step 1: Implement the wrapper**

Create `packages/vue/src/primevue/SstDataTable.vue`:

```vue
<script setup lang="ts" generic="T extends { id: string }">
import DataTable from 'primevue/datatable';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import { useSstDataTable, type IUseSstDataTableOptions } from './use-sst-data-table';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		/** Store from `useTableStore` / `defineTable`. */
		store: IUseTableStoreReturn<T>;
		/** Refresh on mount. Default `true`. */
		immediate?: boolean;
		/** Debounce (ms) before a filter is pushed to the store. Default `300`. */
		filterDebounceMs?: number;
		/** Override PrimeVue-filters → store mapping. */
		mapFilters?: IUseSstDataTableOptions<T>['mapFilters'];
	}>(),
	{ immediate: true, filterDebounceMs: 300 },
);

const bindings = useSstDataTable<T>(props.store, {
	immediate: props.immediate,
	filterDebounceMs: props.filterDebounceMs,
	...(props.mapFilters ? { mapFilters: props.mapFilters } : {}),
});
</script>

<template>
	<DataTable v-bind="{ dataKey: 'id', ...$attrs, ...bindings }">
		<template v-for="(_, name) in $slots" #[name]="slotProps">
			<slot :name="name" v-bind="slotProps ?? {}" />
		</template>
	</DataTable>
</template>
```

- [ ] **Step 2: Implement the subpath barrel**

Create `packages/vue/src/primevue/index.ts`:

```ts
/**
 * @packageDocumentation
 * PrimeVue v4 integration for So Simple Table.
 *
 * Bind a `TableStore` to a PrimeVue `DataTable` in lazy mode while keeping every
 * native DataTable feature and the host theme. Exposes the headless
 * {@link useSstDataTable} composable and the {@link SstDataTable} wrapper.
 *
 * Import from the `@sst/vue/primevue` subpath. Requires `primevue` (>= 4) and
 * `vue` as peer dependencies.
 */
export * from './use-sst-data-table';
export { default as SstDataTable } from './SstDataTable.vue';
```

- [ ] **Step 3: Write a wrapper smoke test**

Create `packages/vue/src/primevue/SstDataTable.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import Column from 'primevue/column';
import type { IFilterParams, IPaginationParams, ISortParams } from '@sst/core';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import SstDataTable from './SstDataTable.vue';

interface IItem {
	id: string;
	name: string;
}

function makeStore(rows: IItem[]): IUseTableStoreReturn<IItem> {
	return {
		store: {} as IUseTableStoreReturn<IItem>['store'],
		data: ref<readonly IItem[]>(rows) as Readonly<Ref<readonly IItem[]>>,
		total: ref(rows.length),
		loading: ref(false),
		pagination: ref<IPaginationParams>({ page: 1, pageSize: 10 }),
		sort: ref<ISortParams | undefined>(undefined),
		filters: ref<readonly IFilterParams[]>([]),
		search: ref(''),
		getData: vi.fn(),
		bulkDelete: vi.fn(),
		refresh: vi.fn(),
		reset: vi.fn(),
		updatePagination: vi.fn(),
		updateSort: vi.fn(),
		updateFilter: vi.fn(),
		updateSearch: vi.fn(),
		updateData: vi.fn(),
		updateTotal: vi.fn(),
	} as unknown as IUseTableStoreReturn<IItem>;
}

describe('SstDataTable', () => {
	it('renders a PrimeVue DataTable, refreshes on mount, and shows rows in the default-slot column', () => {
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store },
			slots: { default: '<Column field="name" header="Name" />' },
		});
		expect(store.refresh).toHaveBeenCalledTimes(1);
		expect(wrapper.find('table').exists()).toBe(true);
		expect(wrapper.text()).toContain('Ada');
	});
});
```

- [ ] **Step 4: Run the new tests**

Run (from `packages/vue/`): `npx vitest run src/primevue/`
Expected: PASS (composable 8 + wrapper 1).

- [ ] **Step 5: Format + commit**

```bash
npx prettier --write packages/vue/src/primevue/SstDataTable.vue packages/vue/src/primevue/index.ts packages/vue/src/primevue/SstDataTable.test.ts
git add packages/vue/src/primevue/SstDataTable.vue packages/vue/src/primevue/index.ts packages/vue/src/primevue/SstDataTable.test.ts
git commit -m "feat(vue): add SstDataTable wrapper + @sst/vue/primevue barrel"
```

---

### Task 3: Packaging — multi-entry build, exports, peer dep, docs

**Files:**
- Modify: `packages/vue/vite.config.ts`
- Modify: `packages/vue/package.json` (exports, peerDependencies, peerDependenciesMeta)
- Modify: `packages/vue/README.md`, `packages/vue/CHANGELOG.md`

**Interfaces:**
- Produces: `dist/primevue.js`, `dist/primevue.cjs`, `dist/primevue/index.d.ts`; the `@sst/vue/primevue` export path.

- [ ] **Step 1: Switch Vite to a multi-entry lib build**

Replace the `build` block in `packages/vue/vite.config.ts` with:

```ts
	build: {
		lib: {
			entry: {
				index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
				primevue: fileURLToPath(new URL('./src/primevue/index.ts', import.meta.url)),
			},
			formats: ['es', 'cjs'],
			fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
		},
		rollupOptions: {
			external: (id) =>
				id === 'vue' ||
				id === '@sst/core' ||
				id === 'primevue' ||
				id.startsWith('primevue/') ||
				id.startsWith('@primevue/'),
			output: {
				globals: { vue: 'Vue', '@sst/core': 'SstCore' },
				assetFileNames: (assetInfo) => (assetInfo.name === 'style.css' ? 'style.css' : (assetInfo.name ?? 'asset')),
			},
		},
		sourcemap: true,
		cssCodeSplit: false,
	},
```

(The UMD `name: 'SstVue'` is removed — it is only used for `umd`/`iife` and is invalid with multiple entries.)

- [ ] **Step 2: Add the subpath export + optional peer dependency**

In `packages/vue/package.json`, add the `./primevue` export inside `exports` (after the `"."` entry):

```json
		"./primevue": {
			"types": "./dist/primevue/index.d.ts",
			"import": "./dist/primevue.js",
			"require": "./dist/primevue.cjs"
		},
```

Add `primevue` to `peerDependencies`:

```json
		"primevue": "^4.0.0",
```

Add a `peerDependenciesMeta` block (next to `peerDependencies`):

```json
	"peerDependenciesMeta": {
		"primevue": { "optional": true }
	},
```

- [ ] **Step 3: Build and verify outputs + isolation**

Run (from repo root):
```bash
npx nx run vue:build
ls packages/vue/dist
test -f packages/vue/dist/primevue.js && test -f packages/vue/dist/primevue.cjs && echo "JS entries OK"
test -f packages/vue/dist/primevue/index.d.ts && echo "primevue d.ts OK"
grep -l "primevue" packages/vue/dist/index.js || echo "OK: main entry has NO primevue import"
```
Expected: `primevue.js`/`primevue.cjs`/`primevue/index.d.ts` exist; the main `index.js` contains no `primevue` import.

> If `vite-plugin-dts` emits the subpath types at a different path than `dist/primevue/index.d.ts`, update the `exports["./primevue"].types` value to match the actual emitted file.

- [ ] **Step 4: Typecheck + full vue test**

Run (from repo root):
```bash
npx nx run vue:typecheck
npx nx run vue:test
```
Expected: typecheck clean; all vue tests pass (existing + new primevue tests).

- [ ] **Step 5: Document the subpath**

Append a section to `packages/vue/README.md` (before `## Links`):

```markdown
## PrimeVue (`@sst/vue/primevue`)

Render your table with PrimeVue v4's `DataTable` (lazy mode) while keeping every
native DataTable feature and your app's theme. Requires `primevue` (>= 4) as a
peer dependency; `@sst/vue/primevue` ships no CSS.

```vue
<script setup lang="ts">
import Column from 'primevue/column';
import { SstDataTable } from '@sst/vue/primevue';
import { useBreedsTable } from './breeds-table'; // a defineTable composable

const table = useBreedsTable();
</script>

<template>
  <SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
    <Column field="name" header="Breed" sortable />
    <Column field="life" header="Lifespan">
      <template #body="{ data }">{{ data.lifeMin }}–{{ data.lifeMax }} yrs</template>
    </Column>
  </SstDataTable>
</template>
```

Prefer full control? Use the headless composable and render `<DataTable>` yourself:

```ts
import { useSstDataTable } from '@sst/vue/primevue';
const bindings = useSstDataTable(table); // spread onto <DataTable v-bind="bindings" dataKey="id">
```

`useSstDataTable(store, options?)` maps PrimeVue's `@page`/`@sort`/`@filter` onto
the store (single-column sort; global filter → search; per-column value → filters,
overridable via `options.mapFilters`) and exposes `removeSelected(rows)` for bulk
delete. Pass `immediate: false` to skip the on-mount fetch.
```

Add to `packages/vue/CHANGELOG.md` under `## [Unreleased]`:

```markdown
### Added

- `@sst/vue/primevue` subpath: `useSstDataTable` composable and `<SstDataTable>`
  wrapper binding a `TableStore` to a PrimeVue v4 `DataTable` (lazy mode), with
  `primevue` as an optional peer dependency.
```

- [ ] **Step 6: Format + commit**

```bash
npx prettier --write packages/vue/vite.config.ts packages/vue/package.json packages/vue/README.md packages/vue/CHANGELOG.md
git add packages/vue/vite.config.ts packages/vue/package.json packages/vue/README.md packages/vue/CHANGELOG.md
git commit -m "build(vue): expose @sst/vue/primevue subpath; optional primevue peer; docs"
```

---

### Task 4: `test/primevue` smoke app + end-to-end verification

**Files:**
- Create: `test/primevue/package.json`, `test/primevue/.npmrc`, `test/primevue/vite.config.ts`, `test/primevue/tsconfig.json`, `test/primevue/index.html`, `test/primevue/src/main.ts`, `test/primevue/src/breeds-table.ts`, `test/primevue/src/App.vue`
- Modify: `.claude/launch.json` (add a `test-primevue` server)

- [ ] **Step 1: Scaffold the app files**

`test/primevue/package.json`:
```json
{
  "name": "@sst/test-primevue",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "description": "Browser smoke-test app for @sst/vue/primevue consumed via the local Verdaccio registry.",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@primevue/themes": "^4.5.0",
    "@sst/core": "^0.2.0",
    "@sst/vue": "^0.1.0",
    "primevue": "^4.5.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vue-tsc": "^2.1.0"
  }
}
```

`test/primevue/.npmrc`:
```
@sst:registry=http://localhost:4873/
```

`test/primevue/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	server: { port: 5174, strictPort: false },
	build: { sourcemap: true },
});
```

`test/primevue/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "types": []
  },
  "include": ["src"]
}
```

`test/primevue/index.html`:
```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>@sst/vue/primevue — smoke test</title>
	</head>
	<body>
		<div id="app"></div>
		<script type="module" src="/src/main.ts"></script>
	</body>
</html>
```

`test/primevue/src/main.ts`:
```ts
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import App from './App.vue';

createApp(App)
	.use(PrimeVue, { theme: { preset: Aura } })
	.mount('#app');
```

`test/primevue/src/breeds-table.ts`:
```ts
import { defineTable } from '@sst/vue';

export interface IBreed {
	id: string;
	name: string;
	description: string;
	lifeMin: number;
	lifeMax: number;
}

interface IDogApiResponse {
	data: ReadonlyArray<{
		id: string;
		attributes: { name: string; description: string; life: { min: number; max: number } };
	}>;
	meta: { pagination: { records: number } };
}

export const useBreedsTable = defineTable<IBreed, IDogApiResponse>({
	baseUrl: 'https://dogapi.dog/api/v2/breeds',
	queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
	sortMap: {}, // dogapi doesn't support sort
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: (raw) => ({
		result: raw.data.map((b) => ({
			id: b.id,
			name: b.attributes.name,
			description: b.attributes.description,
			lifeMin: b.attributes.life.min,
			lifeMax: b.attributes.life.max,
		})),
		totalCount: raw.meta.pagination.records,
		isSuccess: true,
	}),
});
```

`test/primevue/src/App.vue`:
```vue
<script setup lang="ts">
import Column from 'primevue/column';
import { SstDataTable } from '@sst/vue/primevue';
import { useBreedsTable } from './breeds-table';

const table = useBreedsTable();
const truncate = (text: string, max = 90): string => (text.length > max ? `${text.slice(0, max)}…` : text);
</script>

<template>
	<main style="max-width: 960px; margin: 24px auto; font-family: sans-serif">
		<h1>@sst/vue/primevue — smoke test</h1>
		<p>PrimeVue DataTable (Aura theme) backed by a So Simple Table store, rendering dogapi.dog.</p>
		<SstDataTable :store="table" paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]">
			<Column field="name" header="Breed" />
			<Column field="description" header="Description">
				<template #body="{ data }">{{ truncate(data.description) }}</template>
			</Column>
			<Column field="life" header="Lifespan">
				<template #body="{ data }">{{ data.lifeMin }}–{{ data.lifeMax }} yrs</template>
			</Column>
		</SstDataTable>
	</main>
</template>
```

(Columns are intentionally not `sortable` — dogapi has no sort. Pagination + theme are the E2E proof; sort/filter mapping is covered by unit tests.)

- [ ] **Step 2: Add a launch config**

In `.claude/launch.json`, add a second configuration to the `configurations` array:

```json
		{
			"name": "test-primevue",
			"runtimeExecutable": "npm",
			"runtimeArgs": ["run", "dev", "--prefix", "test/primevue"],
			"port": 5174
		}
```

- [ ] **Step 3: Republish @sst/vue and install the app**

Run (from repo root):
```bash
npm run publish:local          # rebuilds + republishes @sst/* (incl. the new subpath) to Verdaccio
rm -rf test/primevue/node_modules test/primevue/package-lock.json
npm install --prefix test/primevue
```
Expected: install resolves `@sst/core`/`@sst/vue` from the local registry and `primevue`/`@primevue/themes`/`vue` from npmjs.

- [ ] **Step 4: Typecheck + build the app**

Run (from repo root): `npm run build --prefix test/primevue`
Expected: `vue-tsc --noEmit` passes (confirms `@sst/vue/primevue` types resolve through the subpath) and `vite build` emits `dist/`.

- [ ] **Step 5: Verify in the browser**

Use the preview tooling (`preview_start` with `test-primevue`), then snapshot/screenshot: confirm a styled PrimeVue DataTable renders dogapi breeds and the paginator advances pages (network shows `page[number]` incrementing). Check the console for errors.

- [ ] **Step 6: Commit**

```bash
git add test/primevue .claude/launch.json
git commit -m "test(vue): add test/primevue smoke app for @sst/vue/primevue"
```

---

## Notes for the executor

- Unit tests (Tasks 1-2) run against `@sst/core` **source** via the Vitest alias and need only `primevue` installed (devDependency) — no publish required.
- The publish step (Task 4) is only because `test/primevue` consumes the **published** `@sst/vue`.
- `primevue`'s DataTable event types (`DataTablePageEvent`, `DataTableSortEvent`, `DataTableFilterEvent`, `DataTableFilterMeta`) are exported from `primevue/datatable` in v4. If a name differs in the installed version, adjust the imports (the tests cast event literals with `as never`, so only the production imports are version-sensitive).
- If `npm run publish:local` reports the registry is down, it auto-starts Verdaccio; ensure port 4873 is free.
