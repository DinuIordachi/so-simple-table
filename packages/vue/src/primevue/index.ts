/**
 * @packageDocumentation
 * PrimeVue v4 integration for So Simple Table.
 *
 * Bind a `TableStore` to a PrimeVue `DataTable` in lazy mode while keeping every
 * native DataTable feature and the host theme. Exposes the headless
 * {@link useSstDataTable} composable and the {@link SstDataTable} wrapper.
 *
 * Import from the `@sst/vue/primevue` subpath. Requires `primevue` (>= 4) and
 * `vue` as peer dependencies.
 */
export * from './use-sst-data-table';
export * from './filter-helpers';
export { default as SstDataTable } from './SstDataTable.vue';
