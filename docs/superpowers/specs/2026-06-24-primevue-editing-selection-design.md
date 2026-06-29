# Design: round out `@bridgebyte/sst-vue/primevue` — slots, editing, selection

**Date:** 2026-06-24
**Status:** Approved (design)
**Scope:** Three independent enhancements to `@bridgebyte/sst-vue/primevue`, bundled into one spec/plan: (#6) named-slot typing fix + filter helpers, (#2) inline editing → `onSave`, (#3) reactive selection + bulk helpers. Non-breaking; no `@bridgebyte/sst-core` change. Proven by extending the `test/primevue` app.

## Motivation

An audit of PrimeVue v4 DataTable's props/emits/slots vs. the current integration found native features (column reorder/resize, scroll/frozen, expansion, grouping, context menu) already work via `$attrs`/slot passthrough, but three **store-coupled** capabilities are missing or rough:

1. **Named DataTable-level slots don't typecheck** (`#header`/`#footer`/`#empty`/`#expansion`/…) — the wrapper's dynamic slot-forwarding infers a numeric-keyed slot type, so `<SstDataTable #header>` errors. This blocks toolbars/empty templates/expansion UIs.
2. **Inline editing** (`@cell-edit-complete` / `@row-edit-save`) has no binding to persist edits.
3. **Selection** is left fully native; there's no reactive selected state or "act on the selection" ergonomics beyond `removeSelected(rows)`.

## Decisions (from brainstorming)

- **Non-breaking, single bag:** `useSstDataTable` keeps returning one `v-bind`-able object. Additions are either real DataTable props/events (`selection`, `onUpdate:selection`, `onCellEditComplete`, `onRowEditSave`) or plain functions (`clearSelection`, `removeSelected`) — functions don't leak as DOM attrs.
- **Filter matchMode:** default stays value-only; ship opt-in helpers.
- **Editing:** consumer `onSave` callback, optimistic local update with rollback on rejection. No core change.
- **Selection:** reactive state + helpers for the loaded selection; cross-page "select all matching the query" is out of scope.

## #6 — Polish (foundation)

### Named-slot typing
Add to `SstDataTable.vue`:
```ts
defineSlots<Record<string, (props: Record<string, unknown>) => unknown>>();
```
All DataTable-level named slots now typecheck and forward. Column-level slots (`#body`/`#editor`/`#filter`) are typed by `<Column>` and unaffected.

### Filter helpers (new `packages/vue/src/primevue/filter-helpers.ts`)
```ts
/** Map one column's filter value to the store's free-text search (the rest ignored). */
export function searchColumn(field: string): (filters: DataTableFilterMeta) => { search?: string };

/** Value-based filters plus a companion `${key}${suffix}` param carrying each matchMode. */
export function withMatchModes(options?: { suffix?: string }): (
  filters: DataTableFilterMeta,
) => { search?: string; filters?: IFilterParams[] };
```
Both return a `mapFilters` function (the existing `useSstDataTable`/`SstDataTable` option). `searchColumn('title')` replaces the test app's hand-written mapper. `withMatchModes()` emits e.g. `title=phone` + `titleMatchMode=contains` for backends that want the operator. Exported from `@bridgebyte/sst-vue/primevue`.

## #2 — Inline editing

```ts
export interface ISstDataTableEdit<T extends { id: string }> {
  readonly row: T;          // original row (event.data)
  readonly newData: T;      // row with the edit applied (event.newData)
  readonly field?: string;  // cell mode only
  readonly newValue?: unknown; // cell mode only
}
// IUseSstDataTableOptions<T> gains:
readonly onSave?: (edit: ISstDataTableEdit<T>) => Promise<void> | void;
```
The bag gains `onCellEditComplete(event)` and `onRowEditSave(event)`. Both:
1. build the `ISstDataTableEdit`,
2. **optimistically** replace the row by `id` in the store (`store.updateData(next)`),
3. `await onSave?.(edit)`; on rejection, revert via `store.updateData(previous)`.

The consumer sets `editMode="cell"|"row"` and editable columns (`#editor` slots) in their template; the adapter only bridges the save. No `@bridgebyte/sst-core` change.

## #3 — Selection

The adapter owns an internal `selection` ref (`readonly T[]`, normalizing PrimeVue's `T | T[] | null`). The bag gains:
- `selection` (current value — a real DataTable prop, so `v-bind` + `selectionMode` give a working `v-model:selection`),
- `onUpdate:selection` (writes the internal ref).

The return adds (functions, not leaked as attrs):
- `clearSelection(): void`,
- `removeSelected(rows?: readonly T[])` — now defaults to the current `selection` when called with no args (still delegates to `store.bulkDelete` + refresh).

Read selection via `t.selection`; count via `t.selection.length`. The consumer just sets `selectionMode="multiple"` (and `dataKey="id"`, already the wrapper default).

`<SstDataTable>` wrapper: gains an `onSave` prop (forwarded), and `defineExpose({ selection, clearSelection, removeSelected })` so `<SstDataTable ref>` can drive a toolbar.

## Files

- **Modify** `packages/vue/src/primevue/use-sst-data-table.ts` — `onSave` option, `ISstDataTableEdit`, edit handlers, internal selection ref + `selection`/`onUpdate:selection`/`clearSelection`, `removeSelected` default.
- **Modify** `packages/vue/src/primevue/SstDataTable.vue` — `defineSlots`, `onSave` prop, `defineExpose`.
- **Add** `packages/vue/src/primevue/filter-helpers.ts` + export from `packages/vue/src/primevue/index.ts`.
- **Tests:** extend `use-sst-data-table.test.ts` (editing optimistic + rollback; selection update + `removeSelected`/`clearSelection`); extend `SstDataTable.test.ts` (a `#header` slot renders); add `filter-helpers.test.ts`.
- **`test/primevue`:** `App.vue` — a `#header` toolbar (selected count + clear), `selectionMode="multiple"`, an editable Price cell with `onSave` (PUT to dummyjson); switch the title filter to `searchColumn('title')`. `products-table.ts` unchanged.
- **Docs:** short sections in `packages/vue/README.md`; `[Unreleased]` CHANGELOG entry.

## Testing

- **Unit:** `withMatchModes`/`searchColumn` (pure mapping); `onCellEditComplete` optimistically updates the store and calls `onSave`, and reverts when `onSave` rejects; `onUpdate:selection` updates `selection`; `removeSelected()` (no args) deletes the current selection; `clearSelection()` empties it; a mounted `<SstDataTable>` with a `#header` slot renders it.
- **E2E (`test/primevue`):** select rows → header count updates; clear works; edit a Price cell → a `PUT https://dummyjson.com/products/:id` fires (dummyjson echoes the update). Browser-verified, no console errors.

## Out of scope

- Multi-column sort, cross-page "select all matching the query", virtual-scroll lazy loading, state/URL persistence (future).
- Full-CRUD-repository coupling in `@bridgebyte/sst-core` (editing uses the `onSave` callback instead).
- Real bulk-delete E2E (dummyjson has no bulk endpoint; covered by unit tests).

## Success criteria

- `<SstDataTable #header>` (and other DataTable slots) typecheck and render.
- A consumer wires inline editing with a one-line `onSave`, and selection with `selectionMode` + `t.selection`/`removeSelected()` — no extra plumbing.
- Existing API unchanged (`v-bind="useSstDataTable(store)"` still works); all current tests stay green.
