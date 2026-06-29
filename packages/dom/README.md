# @sst/dom

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)

Vanilla DOM variant of [@sst/core](../core/README.md). One call —
`mountTable(...)` — produces an HTML table with sortable headers,
default-or-custom cells, and pagination controls, wired reactively to a
`TableStore<T>`.

## Install

```bash
npm install @sst/core @sst/dom
```

## Quick start

```ts
import { HttpRepository, TableStore, type IBaseItem } from '@sst/core';
import { mountTable, type IDomColumn } from '@sst/dom';
import '@sst/dom/style.css'; // optional but recommended

interface IStrategy extends IBaseItem {
  createdAt: string;
  status: 'active' | 'paused';
}

class StrategyRepository extends HttpRepository<IStrategy> {}

const store = new TableStore<IStrategy>({
  repository: new StrategyRepository({ baseUrl: 'https://api.example.com/strategies' }),
  sortMap: { createdAt: 'ByCreationDate' },
});

const columns: ReadonlyArray<IDomColumn<IStrategy>> = [
  { key: 'id', name: 'ID' },
  { key: 'name', name: 'Name', sortable: true },
  { key: 'status', name: 'Status', render: (row) => statusBadge(row.status) },
  { key: 'createdAt', name: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
];

const handle = mountTable<IStrategy>({ target: '#my-table', store, columns });

// later, if needed:
// handle.refresh();
// handle.destroy();
```

> **Note** `mountTable` calls `store.refresh()` once at mount time so the
> table populates immediately. If you've pre-populated `store` via
> `updateData(...)` and want to avoid the network round-trip, mount AFTER
> the data is in place — or wrap the repository to short-circuit the first
> call. The auto-refresh on subsequent observable changes is unaffected.

## API

### `mountTable(options)`

| Option           | Type                           | Required | Default                |
| ---------------- | ------------------------------ | -------- | ---------------------- |
| `target`         | `string \| HTMLElement`        | yes      | —                      |
| `store`          | `ITableStore<T>`               | yes      | —                      |
| `columns`        | `ReadonlyArray<IDomColumn<T>>` | yes      | —                      |
| `emptyMessage`   | `string`                       | no       | `'No rows to display'` |
| `loadingMessage` | `string`                       | no       | `'Loading…'`           |

`target` is resolved via `document.querySelector`. Strings like `'#my-table'`
or `'main .grid'` both work. Throws if nothing matches.

Returns `{ destroy(): void; refresh(): void }`. `destroy` is idempotent —
unsubscribes from the store, removes the DOM nodes, and drops listeners.
`refresh` is a convenience proxy to `store.refresh()`.

### `IDomColumn<T>`

Extends `IColumn` from `@sst/core` with one field:

```ts
render?: (row: T, column: IDomColumn<T>) => string | HTMLElement;
```

When omitted, cells render as `String(row[column.key] ?? '')`.

When the renderer returns a string it is set via `textContent` (no HTML
interpretation — XSS-safe by default). Return an `HTMLElement` when you
need real markup, e.g. badges, links, icons.

### Sort cycle

Clicking a `sortable: true` header cycles through three states:

1. `undefined` (no sort) → `{ field, order: ASC }`
2. `ASC` → `{ field, order: DESC }`
3. `DESC` → `undefined`

Clicking a different sortable column at any time resets to that column,
`ASC`. The header's `data-sort` attribute (`asc | desc | none`) drives the
indicator glyph, so you can restyle it via CSS without touching JS.

### Rendered DOM structure

```
<div class="sst-table" data-sst-loading="false|true">
  <table class="sst-table__table">
    <thead class="sst-table__head">
      <tr>
        <th class="sst-table__head-cell" data-key="..." data-sort="none">{name}</th>
        <th class="sst-table__head-cell sst-table__head-cell--sortable"
            data-key="..." data-sort="asc|desc|none">
          <span class="sst-table__head-label">{name}</span>
          <span class="sst-table__head-indicator" aria-hidden="true"></span>
        </th>
      </tr>
    </thead>
    <tbody class="sst-table__body">
      <tr class="sst-table__row"><td class="sst-table__cell" data-key="...">…</td></tr>
    </tbody>
  </table>
  <nav class="sst-pagination" aria-label="pagination">
    <button class="sst-pagination__btn sst-pagination__btn--prev">← Prev</button>
    <span class="sst-pagination__info">Page X of Y · N items</span>
    <button class="sst-pagination__btn sst-pagination__btn--next">Next →</button>
  </nav>
</div>
```

When `data$` is empty, the body shows a single state row instead:
`<tr class="sst-table__state-row"><td colspan="N">{message}</td></tr>` —
either `emptyMessage` (when not loading) or `loadingMessage` (when loading).

## Theming

Every visual is controlled by CSS custom properties on `.sst-table`. Override
them in your own stylesheet:

```css
.sst-table {
  --sst-fg: #1f2937;
  --sst-muted: #6b7280;
  --sst-border: 1px solid #e5e7eb;
  --sst-row-hover: #f9fafb;
  --sst-radius: 8px;
  --sst-pad-cell: 10px 12px;
  --sst-font-size: 14px;
}
```

The shipped `style.css` is optional — class names alone are stable
contract. Skip the import if you want to start from scratch.

## Out of scope (intentional)

- **Search input.** Wire `<input>` to `store.updateSearch`.
- **Filter UI.** `column.filters` from core stays for a future variant.
- **Virtual scrolling, column resize, multi-column sort.** Out of v1.

## Links

- [So Simple Table monorepo](https://github.com/DinuIordachi/so-simple-table)
- [`@sst/core`](../core/README.md) — the framework-agnostic core
- [Changelog](./CHANGELOG.md)

## License

Proprietary — © 2026 Dinu Iordachi. All rights reserved. See [LICENSE](./LICENSE).
