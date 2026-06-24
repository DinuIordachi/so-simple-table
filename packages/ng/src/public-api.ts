/**
 * Public API surface for `@sst/ng` — the Angular adapter for the so-simple-table
 * (`@sst`) data-table toolkit.
 *
 * @remarks
 * This barrel re-exports two layers:
 *
 * - **Framework-agnostic core** (re-exported from `@sst/core` for ergonomic imports):
 *   shared types ({@link IColumn}, {@link IResponseList}, {@link IHttpClient}, …) and
 *   utilities ({@link Observable}, {@link watch}, {@link mapTableParams}, …).
 * - **Angular surface**: the dependency-injection-friendly building blocks that
 *   consumers extend or render.
 *
 * The primary Angular entry points are:
 *
 * - {@link SstNgRepository} / {@link SstNgListRepository} — extend and override the
 *   `baseUrl` (and optionally `queryKeys` / `responseListMapper`) getters to bind a
 *   repository to a REST endpoint.
 * - {@link SstTableService} — extend and call `super(options)` to wire a repository
 *   into a reactive, Signal-backed table store.
 * - {@link SstTableComponent} — the `<sst-table>` standalone component that renders the
 *   store and exposes content-projection slots for custom cells, empty state, and bulk
 *   actions.
 * - {@link NgHttpClient} — adapts Angular's `HttpClient` to the core {@link IHttpClient}
 *   contract; injected automatically by the repositories.
 *
 * @packageDocumentation
 */

// Re-exports from @sst/core for ergonomic imports
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
export { ESortOrder, DEFAULT_QUERY_KEYS, Observable, watch, deepEqual, arrayToMap, mapTableParams } from '@sst/core';

// Angular surface
export * from './lib/http/ng-http-client';
export * from './lib/repositories/sst-ng-list.repository';
export * from './lib/repositories/sst-ng-select.repository';
export * from './lib/repositories/sst-ng.repository';
export * from './lib/store/to-signal.helper';
export * from './lib/store/sst-table.service';
export * from './lib/component/sst-table.component';
