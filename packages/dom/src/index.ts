/**
 * @packageDocumentation
 * Vanilla-DOM renderer for `@bridgebyte/sst-core` table stores.
 *
 * This package mounts a fully reactive, dependency-free HTML table into the
 * page and keeps it in sync with an {@link @bridgebyte/sst-core#ITableStore}. The single
 * consumer entry point is {@link mountTable}, which renders the table head,
 * body, and pagination controls, wires up sort/pagination interactions, and
 * returns an {@link ITableHandle} for refreshing or tearing the table down.
 *
 * The public surface re-exported here consists of:
 *
 * - {@link mountTable} — mount a table and obtain its lifecycle handle.
 * - {@link IDomColumn} — column definition extending the core `IColumn` with an
 *   optional per-cell `render` callback.
 * - {@link IMountOptions} — options accepted by {@link mountTable}.
 * - {@link ITableHandle} — handle exposing `destroy()` and `refresh()`.
 */
export * from './types';
export * from './mount-table';
