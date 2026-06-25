# PrimeVue Editing/Selection/Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three non-breaking enhancements to `@sst/vue/primevue`: (#6) named-slot typing + filter helpers, (#2) inline editing via `onSave` with optimistic update/rollback, (#3) reactive selection + bulk helpers. Prove with the `test/primevue` app.

**Architecture:** All additions live in the existing `useSstDataTable` single `v-bind`-able bag (real DataTable props/events or plain functions — no leaked attrs) plus `SstDataTable.vue` (`defineSlots`, `onSave` prop, `defineExpose`). No `@sst/core` change.

**Tech Stack:** TypeScript (strict), Vue 3, PrimeVue v4 DataTable, Vitest + @vue/test-utils.

## Global Constraints

- **Non-breaking:** `useSstDataTable(store)` still returns the same `v-bind`-able object; `v-bind="useSstDataTable(store)"` keeps working. New members are DataTable props/events or functions.
- **TS:** strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`; conditional spreads for optionals.
- **Formatting:** tabs; `npx prettier --write` touched files.
- **No `@sst/core` change.** Editing uses the `onSave` callback; selection is loaded-rows only.
- **Verdaccio:** `test/primevue` consumes the published `@sst/vue`; republish (`npm run publish:local`) before reinstalling.

---

### Task 1: #6 — named-slot typing + filter helpers

**Files:**
- Modify: `packages/vue/src/primevue/SstDataTable.vue` (defineSlots)
- Create: `packages/vue/src/primevue/filter-helpers.ts`
- Test: `packages/vue/src/primevue/filter-helpers.test.ts`
- Modify: `packages/vue/src/primevue/index.ts` (export helpers)
- Test: `packages/vue/src/primevue/SstDataTable.test.ts` (named-slot render)

- [ ] **Step 1: Add `defineSlots` to the wrapper**

In `packages/vue/src/primevue/SstDataTable.vue`, after the existing `defineOptions({ inheritAttrs: false });` line, add:

```ts
defineSlots<Record<string, (props: Record<string, unknown>) => unknown>>();
```

- [ ] **Step 2: Write the filter helpers**

Create `packages/vue/src/primevue/filter-helpers.ts`:

```ts
import type { IFilterParams } from '@sst/core';
import type { DataTableFilterMeta } from 'primevue/datatable';

function readFilterValue(meta: unknown): unknown {
	if (meta && typeof meta === 'object') {
		if ('value' in meta) return (meta as { value: unknown }).value;
		if ('constraints' in meta) {
			const constraints = (meta as { constraints?: ReadonlyArray<{ value: unknown }> }).constraints;
			return constraints && constraints.length > 0 ? constraints[0]?.value : undefined;
		}
	}
	return undefined;
}

function readMatchMode(meta: unknown): string | undefined {
	if (meta && typeof meta === 'object') {
		if ('matchMode' in meta && typeof (meta as { matchMode?: unknown }).matchMode === 'string') {
			return (meta as { matchMode: string }).matchMode;
		}
		if ('constraints' in meta) {
			const first = (meta as { constraints?: ReadonlyArray<{ matchMode?: unknown }> }).constraints?.[0];
			if (first && typeof first.matchMode === 'string') return first.matchMode;
		}
	}
	return undefined;
}

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === '';
}

/**
 * A `mapFilters` that maps a single column's filter value to the store's
 * free-text `search` (all other filter entries ignored). Useful when the
 * backend exposes search rather than per-column filtering.
 */
export function searchColumn(field: string): (filters: DataTableFilterMeta) => { search?: string } {
	return (filters) => {
		const value = readFilterValue(filters?.[field]);
		return { search: isEmpty(value) ? '' : String(value) };
	};
}

/**
 * A `mapFilters` that emits value-based per-column filters plus a companion
 * `${key}${suffix}` filter carrying each column's `matchMode` (default suffix
 * `'MatchMode'`), and routes the `global` entry to `search`.
 */
export function withMatchModes(options: { suffix?: string } = {}): (
	filters: DataTableFilterMeta,
) => { search?: string; filters?: IFilterParams[] } {
	const suffix = options.suffix ?? 'MatchMode';
	return (filters) => {
		const result: { search?: string; filters?: IFilterParams[] } = {};
		const out: IFilterParams[] = [];
		for (const [key, meta] of Object.entries(filters ?? {})) {
			const value = readFilterValue(meta);
			if (isEmpty(value)) continue;
			if (key === 'global') {
				result.search = String(value);
				continue;
			}
			out.push({ key, value: String(value) });
			const matchMode = readMatchMode(meta);
			if (matchMode) out.push({ key: `${key}${suffix}`, value: matchMode });
		}
		if (out.length > 0) result.filters = out;
		return result;
	};
}
```

- [ ] **Step 3: Export from the barrel**

In `packages/vue/src/primevue/index.ts`, add before the `SstDataTable` export:

```ts
export * from './filter-helpers';
```

- [ ] **Step 4: Tests for helpers + named slot**

Create `packages/vue/src/primevue/filter-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { searchColumn, withMatchModes } from './filter-helpers';

describe('searchColumn', () => {
	it('maps the named column value to search', () => {
		expect(searchColumn('title')({ title: { value: 'phone', matchMode: 'contains' } } as never)).toEqual({
			search: 'phone',
		});
	});
	it('returns empty search when the column is empty', () => {
		expect(searchColumn('title')({ title: { value: null, matchMode: 'contains' } } as never)).toEqual({ search: '' });
	});
});

describe('withMatchModes', () => {
	it('emits value + companion matchMode params and routes global to search', () => {
		const out = withMatchModes()({
			global: { value: 'g', matchMode: 'contains' },
			price: { value: 10, matchMode: 'gte' },
		} as never);
		expect(out.search).toBe('g');
		expect(out.filters).toEqual([
			{ key: 'price', value: '10' },
			{ key: 'priceMatchMode', value: 'gte' },
		]);
	});
	it('honors a custom suffix', () => {
		const out = withMatchModes({ suffix: '_op' })({ name: { value: 'a', matchMode: 'equals' } } as never);
		expect(out.filters).toEqual([
			{ key: 'name', value: 'a' },
			{ key: 'name_op', value: 'equals' },
		]);
	});
});
```

Append to `packages/vue/src/primevue/SstDataTable.test.ts` a named-slot test (reuse the file's `makeStore` + PrimeVue mount pattern):

```ts
	it('forwards a DataTable-level #header slot', () => {
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				header: '<span class="toolbar">Toolbar</span>',
			},
		});
		expect(wrapper.find('.toolbar').exists()).toBe(true);
	});
```

- [ ] **Step 5: Verify + format + commit**

```bash
npx nx run vue:test
npx nx run vue:typecheck
npx prettier --write packages/vue/src/primevue/SstDataTable.vue packages/vue/src/primevue/filter-helpers.ts packages/vue/src/primevue/filter-helpers.test.ts packages/vue/src/primevue/index.ts packages/vue/src/primevue/SstDataTable.test.ts
git add packages/vue/src/primevue/SstDataTable.vue packages/vue/src/primevue/filter-helpers.ts packages/vue/src/primevue/filter-helpers.test.ts packages/vue/src/primevue/index.ts packages/vue/src/primevue/SstDataTable.test.ts
git commit -m "feat(vue): primevue named-slot typing + filter helpers (searchColumn, withMatchModes)"
```

---

### Task 2: #2 — inline editing (`onSave`)

**Files:**
- Modify: `packages/vue/src/primevue/use-sst-data-table.ts`
- Modify: `packages/vue/src/primevue/SstDataTable.vue` (onSave prop)
- Test: `packages/vue/src/primevue/use-sst-data-table.test.ts`

**Interfaces:**
- Consumes: `DataTableCellEditCompleteEvent`, `DataTableRowEditSaveEvent` (types) from `primevue/datatable`.
- Produces: `ISstDataTableEdit<T>`; `IUseSstDataTableOptions.onSave`; bag handlers `onCellEditComplete`, `onRowEditSave`.

- [ ] **Step 1: Write failing editing tests**

Append to `packages/vue/src/primevue/use-sst-data-table.test.ts` (reuse `makeStore`/`harness`/`flush`):

```ts
	it('optimistically applies a cell edit and calls onSave', async () => {
		const store = makeStore();
		(store.data as Ref<readonly IItem[]>).value = [{ id: '1', name: 'a' }];
		const onSave = vi.fn().mockResolvedValue(undefined);
		const { bindings } = harness(store, { onSave });
		bindings.onCellEditComplete({ data: { id: '1', name: 'a' }, newData: { id: '1', name: 'b' }, field: 'name', newValue: 'b' } as never);
		expect(store.updateData).toHaveBeenCalledWith([{ id: '1', name: 'b' }]);
		expect(onSave).toHaveBeenCalledWith({ row: { id: '1', name: 'a' }, newData: { id: '1', name: 'b' }, field: 'name', newValue: 'b' });
	});

	it('reverts the optimistic edit when onSave rejects', async () => {
		const store = makeStore();
		const original = [{ id: '1', name: 'a' }];
		(store.data as Ref<readonly IItem[]>).value = original;
		const onSave = vi.fn().mockRejectedValue(new Error('nope'));
		const { bindings } = harness(store, { onSave });
		bindings.onRowEditSave({ data: { id: '1', name: 'a' }, newData: { id: '1', name: 'b' }, index: 0 } as never);
		await flush();
		// first call applies newData, second call reverts to the original array
		expect((store.updateData as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual([{ id: '1', name: 'b' }]);
		expect((store.updateData as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(original);
	});
```

- [ ] **Step 2: Run, expect fail**

Run (from `packages/vue/`): `npx vitest run src/primevue/use-sst-data-table.test.ts`
Expected: the two new tests FAIL (`onCellEditComplete`/`onRowEditSave` undefined).

- [ ] **Step 3: Implement editing in the composable**

In `use-sst-data-table.ts`:

(a) Extend the `primevue/datatable` type import with `DataTableCellEditCompleteEvent, DataTableRowEditSaveEvent`.

(b) Add the edit type (near `IUseSstDataTableOptions`):

```ts
/** A persisted edit emitted by PrimeVue's cell/row editing. */
export interface ISstDataTableEdit<T extends { id: string }> {
	readonly row: T;
	readonly newData: T;
	readonly field?: string;
	readonly newValue?: unknown;
}
```

(c) Add `onSave` to `IUseSstDataTableOptions`:

```ts
	/** Persist an inline edit. The row is updated optimistically and reverted if this rejects. */
	readonly onSave?: (edit: ISstDataTableEdit<T>) => Promise<void> | void;
```

(d) Add the two handlers to `ISstDataTableBindings`:

```ts
	/** Handle PrimeVue's `@cell-edit-complete`: optimistic update + `onSave`. */
	onCellEditComplete(event: DataTableCellEditCompleteEvent): void;
	/** Handle PrimeVue's `@row-edit-save`: optimistic update + `onSave`. */
	onRowEditSave(event: DataTableRowEditSaveEvent): void;
```

(e) In `useSstDataTable`, destructure `onSave` from options and add an `applyEdit` helper + the two handlers inside the `reactive({...})` bag:

```ts
	const { immediate = true, filterDebounceMs = 300, mapFilters = defaultMapFilters, onSave } = options;

	function applyEdit(edit: ISstDataTableEdit<T>): void {
		const previous = store.data.value;
		store.updateData(previous.map((r) => (r.id === edit.row.id ? edit.newData : r)));
		if (!onSave) return;
		Promise.resolve(onSave(edit)).catch(() => store.updateData(previous));
	}
```

Add to the bag (alongside `onPage`/`onSort`/`onFilter`):

```ts
		onCellEditComplete(event: DataTableCellEditCompleteEvent) {
			applyEdit({
				row: event.data as T,
				newData: event.newData as T,
				field: event.field,
				newValue: event.newValue,
			});
		},
		onRowEditSave(event: DataTableRowEditSaveEvent) {
			applyEdit({ row: event.data as T, newData: event.newData as T });
		},
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run src/primevue/use-sst-data-table.test.ts` → PASS.

- [ ] **Step 5: Add `onSave` to the wrapper**

In `SstDataTable.vue`, add to the `withDefaults(defineProps<{…}>())` props:

```ts
		/** Persist an inline edit (optimistic; reverts on rejection). */
		onSave?: IUseSstDataTableOptions<T>['onSave'];
```

and pass it through in the `useSstDataTable` options object:

```ts
	...(props.onSave ? { onSave: props.onSave } : {}),
```

- [ ] **Step 6: Verify + format + commit**

```bash
npx nx run vue:test && npx nx run vue:typecheck
npx prettier --write packages/vue/src/primevue/use-sst-data-table.ts packages/vue/src/primevue/use-sst-data-table.test.ts packages/vue/src/primevue/SstDataTable.vue
git add packages/vue/src/primevue/use-sst-data-table.ts packages/vue/src/primevue/use-sst-data-table.test.ts packages/vue/src/primevue/SstDataTable.vue
git commit -m "feat(vue): inline editing via onSave (optimistic update + rollback) in SstDataTable"
```

---

### Task 3: #3 — reactive selection + bulk helpers

**Files:**
- Modify: `packages/vue/src/primevue/use-sst-data-table.ts`
- Modify: `packages/vue/src/primevue/SstDataTable.vue` (defineExpose)
- Test: `packages/vue/src/primevue/use-sst-data-table.test.ts`

**Interfaces:**
- Produces: bag gains `selection` (value) + `onUpdate:selection` (handler) + `clearSelection()`; `removeSelected(rows?)` becomes optional-arg (defaults to current selection).

- [ ] **Step 1: Write failing selection tests**

Append to `use-sst-data-table.test.ts`:

```ts
	it('tracks selection via onUpdate:selection and clears it', () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings['onUpdate:selection']([{ id: '1', name: 'a' }]);
		expect(bindings.selection).toEqual([{ id: '1', name: 'a' }]);
		bindings.clearSelection();
		expect(bindings.selection).toEqual([]);
	});

	it('removeSelected() with no args deletes the current selection', async () => {
		const store = makeStore();
		const { bindings } = harness(store);
		bindings['onUpdate:selection']([{ id: '1', name: 'a' }, { id: '2', name: 'b' }]);
		await bindings.removeSelected();
		expect(store.bulkDelete).toHaveBeenCalledWith(['1', '2']);
	});
```

- [ ] **Step 2: Run, expect fail**

`npx vitest run src/primevue/use-sst-data-table.test.ts` → new tests FAIL.

- [ ] **Step 3: Implement selection in the composable**

In `use-sst-data-table.ts`:

(a) Import `ref` from `vue` (alongside the existing imports).

(b) Add to `ISstDataTableBindings`:

```ts
	/** Currently selected rows (PrimeVue `v-model:selection`). */
	readonly selection: readonly T[];
	/** PrimeVue `@update:selection` handler. */
	'onUpdate:selection'(value: T | readonly T[] | null | undefined): void;
	/** Clear the current selection. */
	clearSelection(): void;
```

and change `removeSelected`'s signature to optional:

```ts
	removeSelected(rows?: T | readonly T[]): Promise<IResponse<string>>;
```

(c) In `useSstDataTable`, before the `reactive(...)` bag:

```ts
	const selectionRef = ref<readonly T[]>([]);
```

(d) Add to the bag:

```ts
		get selection() {
			return selectionRef.value;
		},
		'onUpdate:selection'(value: T | readonly T[] | null | undefined) {
			selectionRef.value = Array.isArray(value) ? (value as readonly T[]) : value ? [value as T] : [];
		},
		clearSelection() {
			selectionRef.value = [];
		},
```

and update `removeSelected` to default to the selection:

```ts
		removeSelected(rows?: T | readonly T[]): Promise<IResponse<string>> {
			const source = rows ?? selectionRef.value;
			const list: readonly T[] = Array.isArray(source) ? (source as readonly T[]) : [source as T];
			return store.bulkDelete(list.map((row) => row.id));
		},
```

- [ ] **Step 4: Run, expect pass**

`npx vitest run src/primevue/` → all PASS.

- [ ] **Step 5: Expose selection from the wrapper**

In `SstDataTable.vue`, after `const bindings = useSstDataTable<T>(...)`, add:

```ts
defineExpose({
	get selection() {
		return bindings.selection;
	},
	clearSelection: () => bindings.clearSelection(),
	removeSelected: (rows?: T | readonly T[]) => bindings.removeSelected(rows),
});
```

- [ ] **Step 6: Verify + format + commit**

```bash
npx nx run vue:test && npx nx run vue:typecheck && npx nx run vue:build
npx prettier --write packages/vue/src/primevue/use-sst-data-table.ts packages/vue/src/primevue/use-sst-data-table.test.ts packages/vue/src/primevue/SstDataTable.vue
git add packages/vue/src/primevue/use-sst-data-table.ts packages/vue/src/primevue/use-sst-data-table.test.ts packages/vue/src/primevue/SstDataTable.vue
git commit -m "feat(vue): reactive selection + clearSelection; removeSelected defaults to selection"
```

---

### Task 4: E2E in `test/primevue` + docs

**Files:**
- Modify: `test/primevue/src/App.vue`
- Modify: `packages/vue/README.md`, `packages/vue/CHANGELOG.md`

- [ ] **Step 1: Extend `App.vue`**

Update `test/primevue/src/App.vue` to (a) use `searchColumn('title')` for the filter, (b) add `selectionMode="multiple"` + a `#header` toolbar showing the selected count and a clear button via a template ref, (c) make Price editable with `editMode="cell"` + an `#editor` and wire `onSave` to a dummyjson PUT:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import { SstDataTable, searchColumn } from '@sst/vue/primevue';
import { useProductsTable, type IProduct } from './products-table';

const table = useProductsTable();
const tableRef = ref<InstanceType<typeof SstDataTable> | null>(null);

const filters = ref<{ title: { value: string | null; matchMode: string } }>({
	title: { value: null, matchMode: 'contains' },
});

const onSave = async ({ row, newData }: { row: IProduct; newData: IProduct }): Promise<void> => {
	await fetch(`https://dummyjson.com/products/${row.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ price: newData.price }),
	});
};
</script>

<template>
	<main style="max-width: 1040px; margin: 24px auto; font-family: sans-serif">
		<h1>@sst/vue/primevue — smoke test</h1>
		<SstDataTable
			ref="tableRef"
			:store="table"
			:mapFilters="searchColumn('title')"
			:onSave="onSave"
			v-model:filters="filters"
			selectionMode="multiple"
			editMode="cell"
			paginator
			:rows="10"
			:rowsPerPageOptions="[10, 20, 50]"
			filterDisplay="row"
		>
			<template #header>
				<div style="display: flex; gap: 12px; align-items: center; justify-content: flex-end">
					<span>{{ tableRef?.selection.length ?? 0 }} selected</span>
					<Button label="Clear" size="small" @click="tableRef?.clearSelection()" />
				</div>
			</template>
			<Column selectionMode="multiple" headerStyle="width: 3rem" />
			<Column field="title" header="Title" sortable :showFilterMenu="false">
				<template #filter="{ filterModel, filterCallback }">
					<InputText v-model="filterModel.value" placeholder="Search title…" @input="filterCallback()" />
				</template>
			</Column>
			<Column field="brand" header="Brand" sortable />
			<Column field="category" header="Category" sortable />
			<Column field="price" header="Price" sortable>
				<template #body="{ data }">${{ data.price.toFixed(2) }}</template>
				<template #editor="{ data }">
					<InputNumber v-model="data.price" mode="currency" currency="USD" />
				</template>
			</Column>
			<Column field="rating" header="Rating" sortable>
				<template #body="{ data }">{{ data.rating.toFixed(2) }} ★</template>
			</Column>
			<Column field="stock" header="Stock" sortable />
		</SstDataTable>
	</main>
</template>
```

(Imports `InputNumber`/`Button` resolve from `primevue`; they're already installed.)

- [ ] **Step 2: Document + changelog**

Add a short note under the vue README "PrimeVue" section covering `onSave`, selection (`selectionMode` + the exposed `selection`/`clearSelection`/`removeSelected`), the `#header` slot, and the `searchColumn`/`withMatchModes` helpers. Add a `[Unreleased]` CHANGELOG bullet to `packages/vue/CHANGELOG.md`:

```markdown
- `@sst/vue/primevue`: inline editing via `onSave` (optimistic + rollback), reactive
  `selection` with `clearSelection`/`removeSelected`, DataTable-level named-slot
  typing, and `searchColumn`/`withMatchModes` filter helpers.
```

- [ ] **Step 3: Republish + reinstall + build the app**

```bash
npm run publish:local
rm -rf test/primevue/node_modules test/primevue/package-lock.json
npm install --prefix test/primevue
npm run build --prefix test/primevue
```
Expected: `vue-tsc` + `vite build` pass.

- [ ] **Step 4: Browser-verify**

`preview_start` `test-primevue`, then:
- select two row checkboxes → header shows "2 selected"; "Clear" resets to 0
- double-click a Price cell, change it, blur → a `PUT https://dummyjson.com/products/:id` fires (network)
- sort/search/paginate still work
- no console errors

- [ ] **Step 5: Commit**

```bash
npx prettier --write test/primevue/src/App.vue packages/vue/README.md packages/vue/CHANGELOG.md
git add test/primevue/src/App.vue packages/vue/README.md packages/vue/CHANGELOG.md
git commit -m "test(primevue): showcase editing, selection toolbar, and filter helper"
```

---

## Notes for the executor

- Tasks 1–3 run against `@sst/core` source via the Vitest alias and only need `primevue` installed (devDep). Only Task 4 needs `publish:local`.
- `onCellEditComplete`/`onRowEditSave`/`onUpdate:selection`/`selection` are real DataTable props/events; `clearSelection`/`removeSelected` are functions — none leak as DOM attrs when spread via `v-bind`, preserving the single-bag, non-breaking API.
- If PrimeVue's `DataTableRowEditSaveEvent` field names differ in the installed version, adjust the handler reads (tests cast event literals with `as never`, so only production reads are version-sensitive).
- `defineExpose` accessors read the reactive `bindings` so the wrapper's `selection` stays live for the `#header` toolbar.
