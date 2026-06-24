# Changelog

All notable changes to `@sst/dom` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-24

### Added

- `mountTable(options)` — renders a `TableStore<T>` into an HTML table and
  returns an idempotent `{ destroy(), refresh() }` handle.
- `IDomColumn<T>` — extends core `IColumn` with an optional `render(row, column)`
  cell renderer (returns a string for XSS-safe text, or an `HTMLElement` for markup).
- Sortable headers with a three-state click cycle and `data-sort` attributes,
  plus reactive pagination controls and empty/loading state rows.
- Themeable, optional `style.css` driven entirely by CSS custom properties on
  `.sst-table`; stable BEM-style class-name contract.
