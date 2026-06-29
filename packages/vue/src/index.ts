/**
 * Vue 3 bindings for `@bridgebyte/sst-core` — the so-simple-table data layer.
 *
 * This is the public entry point of the `@bridgebyte/sst-vue` package. It re-exports the
 * framework-agnostic `@bridgebyte/sst-core` surface (types, the `TableStore`, repositories,
 * HTTP client, the `Observable` primitive, and helper utilities) for ergonomic
 * single-import usage, alongside the Vue-specific surface:
 *
 * - {@link useObservable} — bridge a core `IReadonlyObservable` to a Vue ref.
 * - {@link useTableStore} — wrap a core `TableStore` as reactive refs and bound actions.
 * - {@link defineTable} — declarative factory returning a `useTable()` composable.
 * - `SstTable` — a ready-made table component.
 *
 * @packageDocumentation
 */

// Re-exports from @bridgebyte/sst-core for ergonomic imports
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
} from '@bridgebyte/sst-core';
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
} from '@bridgebyte/sst-core';

// Vue surface
export * from './lib/composables/use-observable';
export * from './lib/composables/use-table-store';
export * from './lib/composables/define-table';
export { default as SstTable } from './lib/components/SstTable.vue';
