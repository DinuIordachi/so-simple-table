# `@bridgebyte/sst-dom` — Vanilla DOM Variant Design

**Date:** 2026-05-06
**Status:** Approved, ready for implementation plan

## Goal

Provide a "drop-in" HTML table for `@bridgebyte/sst-core` consumers who don't want a
framework. A single call — `mountTable({ target, store, columns })` — produces a
working table with header, sortable columns, body rows, and pagination
controls, wired reactively to a `TableStore<T>`.

## Architecture Decision

`@bridgebyte/sst-dom` is a **sibling package** alongside the planned `@bridgebyte/sst-ng`,
`@bridgebyte/sst-vue`, `@bridgebyte/sst-react`. It depends on `@bridgebyte/sst-core` but does not modify it
(except for the small `IColumn.render` cleanup below).

This preserves the architectural promise that `@bridgebyte/sst-core` is framework-agnostic
and free of DOM dependencies — core can still run in Node, SSR, React Native
(via `@bridgebyte/sst-react`), etc.

## Package Layout

```
packages/dom/
├── package.json              # name "@bridgebyte/sst-dom", type "module", peerDeps @bridgebyte/sst-core
├── tsconfig.json
├── tsconfig.build.json
├── tsup.config.ts            # bundles index.ts AND emits style.css to dist
├── vitest.config.ts          # environment: 'happy-dom'
├── project.json
├── README.md
└── src/
    ├── index.ts              # public barrel
    ├── types.ts              # IDomColumn<T>, IMountOptions<T>, ITableHandle
    ├── mount-table.ts        # main entry: mountTable(options) -> ITableHandle
    ├── mount-table.test.ts
    ├── render/
    │   ├── render-head.ts    # builds <thead>; sort header click handler
    │   ├── render-head.test.ts
    │   ├── render-body.ts    # builds <tbody>; cell render dispatch
    │   ├── render-body.test.ts
    │   ├── render-pagination.ts
    │   └── render-pagination.test.ts
    └── style.css             # ships to dist/style.css; semantic classes
```

Toolchain matches `@bridgebyte/sst-core`: TypeScript 5.6+, tsup for build, vitest for
tests, ESM-first with CJS fallback, source maps.

`vitest.config.ts` uses `environment: 'happy-dom'` so DOM APIs are available
in tests. Add `happy-dom` as a devDependency.

`tsup.config.ts` adds a `loader: { '.css': 'copy' }` step (or equivalent) so
`src/style.css` is copied to `dist/style.css` and exported via the `package.json`
`exports` map.

`package.json` `exports`:
```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./style.css": "./dist/style.css",
  "./package.json": "./package.json"
}
```

## Types

### `IDomColumn<T>` (extends core's `IColumn`)

```ts
import type { IColumn } from '@bridgebyte/sst-core';

export interface IDomColumn<T> extends IColumn {
	readonly render?: (row: T, column: IDomColumn<T>) => string | HTMLElement;
}
```

- `key`, `name`, `sortable`, `width` are inherited from core's `IColumn`.
- `render` is the per-column escape hatch. Omit it to get the default
  stringify behavior (`String(row[column.key] ?? '')`).
- If `render` returns a string it is set via `textContent` (no HTML injection).
  If it returns an `HTMLElement`, it is appended via `appendChild`. Returning
  malformed HTML strings does NOT execute — that's intentional XSS protection.

### `IMountOptions<T>`

```ts
export interface IMountOptions<T> {
	readonly target: string | HTMLElement;
	readonly store: ITableStore<T>;
	readonly columns: ReadonlyArray<IDomColumn<T>>;
	readonly emptyMessage?: string;       // default: 'No rows to display'
	readonly loadingMessage?: string;     // default: 'Loading…'
}
```

`target` resolution:
- String → `document.querySelector(target)` (so `'#my-table'` works for ids
  and `'.foo .bar'` works for selectors). Plain id strings without `#` are
  not supported — keeps the API single-mode and predictable.
- `HTMLElement` → used directly.
- If resolution fails, throw `Error('[@bridgebyte/sst-dom] target not found: …')`.

### `ITableHandle`

```ts
export interface ITableHandle {
	readonly destroy: () => void;
	readonly refresh: () => void;
}
```

- `destroy()` unsubscribes all observable subscriptions, removes the rendered
  DOM nodes, and clears event listeners. Safe to call multiple times.
- `refresh()` proxies `store.refresh()` for convenience.

## Rendered DOM Structure

```
<div class="sst-table" data-sst-loading="false|true">
  <table class="sst-table__table">
    <thead class="sst-table__head">
      <tr>
        <th class="sst-table__head-cell" data-key="...">                  <!-- non-sortable -->
        <th class="sst-table__head-cell sst-table__head-cell--sortable"
            data-key="..." data-sort="asc|desc|none">                     <!-- sortable -->
          <span class="sst-table__head-label">{column.name}</span>
          <span class="sst-table__head-indicator" aria-hidden="true">↕|↑|↓</span>
        </th>
      </tr>
    </thead>
    <tbody class="sst-table__body">
      <!-- one of three states: -->
      <tr class="sst-table__row"><td class="sst-table__cell" data-key="...">…</td></tr>
      <tr class="sst-table__state-row"><td colspan="N">{loadingMessage}</td></tr>
      <tr class="sst-table__state-row"><td colspan="N">{emptyMessage}</td></tr>
    </tbody>
  </table>

  <nav class="sst-pagination" aria-label="pagination">
    <button class="sst-pagination__btn sst-pagination__btn--prev" disabled?>← Prev</button>
    <span class="sst-pagination__info">Page {page} of {totalPages} · {total} items</span>
    <button class="sst-pagination__btn sst-pagination__btn--next" disabled?>Next →</button>
  </nav>
</div>
```

`totalPages = Math.max(1, Math.ceil(total / pagination.pageSize))`. Prev is
disabled when `page === 1`; next when `page >= totalPages`.

## Reactivity Wiring

Each observable drives a focused update — no full re-renders unless `data$`
changes:

| Observable     | Update target                                                                  |
| -------------- | ------------------------------------------------------------------------------ |
| `data$`        | Replace `<tbody>` rows. If empty, render the empty-state row.                  |
| `loading$`     | Toggle `[data-sst-loading]` attribute on the wrapper. If true and `data$` is empty, render the loading-state row. |
| `total$`       | Update pagination info text + recompute `totalPages` + button disabled states. |
| `pagination$`  | Update pagination info text + button disabled states.                          |
| `sort$`        | Update `data-sort` attributes on the relevant `<th>` elements.                 |

All subscriptions skip the initial emit (`emitOnSubscribe: false`) so the
initial render runs once explicitly during `mountTable`, not via subscription
side effects. After mount, every change goes through subscriptions.

### Header click handler (sortable columns only)

Cycles per click on a column with `sortable: true`:
1. If `sort$` is `undefined` or for a different column → set `{ field: column.key, order: ASC }`.
2. If current sort is for this column and `ASC` → set to `DESC`.
3. If current sort is for this column and `DESC` → set to `undefined`.

Sort `id` field uses the convention `${field}-${order}` (matches what the test
app already uses).

### Pagination button handlers

- Prev: `store.updatePagination({ ...current, page: current.page - 1 })`, no-op if `page === 1`.
- Next: `store.updatePagination({ ...current, page: current.page + 1 })`, no-op if `page >= totalPages`.

## Styling

A small `style.css` ships with the package, importable via `@bridgebyte/sst-dom/style.css`.
It uses CSS custom properties so users can theme without overriding selectors:

```css
.sst-table {
	--sst-border: 1px solid #e5e7eb;
	--sst-fg: inherit;
	--sst-muted: #6b7280;
	--sst-row-hover: #f9fafb;
	--sst-radius: 6px;
	--sst-pad-cell: 8px 10px;
	color: var(--sst-fg);
}
/* ... rules using these custom properties ... */
```

Importing the CSS is **optional** — without it, the table works (just
unstyled). Class names alone are stable contract for users who want to write
their own CSS.

## Migration: drop `IColumn.render`

Core's `IColumn` currently has a `render?: boolean` field with no consumer.
Remove it as part of the `@bridgebyte/sst-dom` work so `@bridgebyte/sst-dom`'s `IDomColumn.render`
can be a function without colliding.

This is a 0.1.0 → 0.2.0 break. Bump `@bridgebyte/sst-core` version, republish to
Verdaccio. Internal change only — nothing else uses the field.

## Tests

Vitest with `environment: 'happy-dom'` so the DOM is available without
spinning up a real browser.

Test groups:
1. **`mount-table`** — happy path: mounts with a stub store, asserts
   `<thead>`/`<tbody>`/pagination present, asserts cell content matches
   `data$.get()` and the column key.
2. **target resolution** — string id, CSS selector, HTMLElement; throws on
   failure with a useful message.
3. **render-head** — sortable click cycles ASC → DESC → undefined; clicking
   a different sortable column resets to ASC; non-sortable columns ignore
   clicks.
4. **render-body** — default stringify, custom `render(row)` returning string,
   custom `render(row)` returning HTMLElement; empty state row when `data$`
   is `[]`; loading state row when `loading$` is `true` AND `data$` is `[]`.
5. **render-pagination** — prev disabled at page 1, next disabled at last
   page, info text format, click handlers update store correctly.
6. **destroy** — unsubscribes (subsequent store updates do not touch the
   removed DOM); idempotent (calling twice does not throw).

Each `.test.ts` file lives next to its source file.

## Test app updates: `test/core/` → `test/dom/`

1. Rename the directory.
2. Update `package.json` name to `@bridgebyte/sst-test-dom`, add `@bridgebyte/sst-dom` to deps.
3. Update `index.html` title and remove the inline `<table>` markup, replace
   with a single `<div id="my-table"></div>` mount target. Pagination,
   loading, and totals are now produced by `@bridgebyte/sst-dom`, so the surrounding
   page can drop those elements; keep the search/sort/filter inputs (those
   stay app-side per the design choice).
4. Update `src/main.ts` to:
   - Import `mountTable` from `@bridgebyte/sst-dom` and `import '@bridgebyte/sst-dom/style.css'`.
   - Drop the manual row-rendering, the manual pagination handlers, and
     the sort `<select>` (sort is now triggered by clicking sortable column
     headers in the rendered table).
   - Define `IDomColumn<IItem>[]` (mark `title` and `createdAt` as
     `sortable: true`; add a `render` for `status` to demonstrate the
     escape hatch — e.g. a colored badge).
   - Call `mountTable({ target: '#my-table', store, columns })`.
   - Keep the search input and the status filter `<select>` (those wire
     directly to `store.updateSearch` / `store.updateFilter` and exercise
     core's reactivity outside `@bridgebyte/sst-dom`'s scope).
   - Keep the call-log details panel — it's a useful debugging affordance
     and exercises core directly.
5. Update `test/dom/README.md` accordingly.

## Out of Scope (explicit non-goals)

- **Built-in search input.** Users wire `<input>` to `store.updateSearch`.
- **Built-in filter UI.** `column.filters` from core stays for a future variant.
- **Virtual scrolling / large-list optimizations.** Render the visible page only.
- **Column resizing, drag-reorder, multi-column sort.** Out of v1.
- **Theming presets / dark-mode toggle.** Custom properties enable theming;
  picking themes is the user's job.
- **Server-side rendering.** `@bridgebyte/sst-dom` is browser-only.

## Acceptance Criteria

- `packages/dom/` builds, tests pass, typechecks clean.
- `npx nx run dom:test` and `npx nx run dom:build` succeed.
- `@bridgebyte/sst-dom` published to local Verdaccio at `0.1.0`.
- `test/dom/` renders the same data as the previous `test/core/` smoke test,
  via `mountTable(...)` with no manual DOM wiring for the table itself.
- `@bridgebyte/sst-core` republished at `0.2.0` with `IColumn.render` removed.
