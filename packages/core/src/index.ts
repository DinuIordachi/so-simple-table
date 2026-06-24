/**
 * Framework-agnostic core of the so-simple-table library.
 *
 * @remarks
 * This package exposes the headless building blocks for data tables:
 *
 * - {@link TableStore} — the central, reactive state container that orchestrates
 *   pagination, sorting, filtering, search, and data fetching.
 * - The repository hierarchy ({@link ListRepository}, {@link SelectRepository},
 *   {@link Repository}) and its HTTP implementations
 *   ({@link HttpListRepository}, {@link HttpSelectRepository},
 *   {@link HttpRepository}) that abstract the data source.
 * - {@link FetchHttpClient} — a small `fetch`-based {@link IHttpClient}.
 * - {@link Observable} and {@link watch} — the minimal reactive primitives used
 *   to expose store state to any UI framework.
 * - {@link mapTableParams} and supporting utilities for translating table state
 *   into HTTP query parameters.
 *
 * All UI-framework bindings (e.g. Vue, React) live in separate packages and
 * build on top of these primitives.
 *
 * @packageDocumentation
 */

export * from './types';
export * from './state/observable';
export * from './state/watch';
export * from './utils/deep-equal';
export * from './utils/array-to-map';
export * from './http/fetch-http-client';
export * from './repositories/list.repository';
export * from './repositories/http-list.repository';
export * from './repositories/select.repository';
export * from './repositories/http-select.repository';
export * from './repositories/repository';
export * from './repositories/http-repository';
export * from './store/map-table-params';
export * from './store/table-store';
