/**
 * @packageDocumentation
 * PrimeVue v4 integration for So Simple Table.
 *
 * Bind a `TableStore` to a PrimeVue `DataTable` in lazy mode while keeping every
 * native DataTable feature and the host theme. Exposes the headless
 * {@link useSstDataTable} composable, the {@link SstDataTable} wrapper, and
 * responsive layout utilities ({@link useBreakpoint}, {@link resolveLayoutSlot}).
 *
 * Import from the `@bridgebyte/sst-vue/primevue` subpath. Requires `primevue` (>= 4) and
 * `vue` as peer dependencies.
 */
export * from './use-sst-data-table';
export * from './use-sst-filters';
export * from './filter-helpers';
export * from './responsive';
export * from './use-breakpoint';
export { default as SstDataTable } from './SstDataTable.vue';
