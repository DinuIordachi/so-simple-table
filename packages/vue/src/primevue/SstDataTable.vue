<script setup lang="ts" generic="T extends { id: string }">
import DataTable from 'primevue/datatable';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import { useSstDataTable, type IUseSstDataTableOptions } from './use-sst-data-table';

defineOptions({ inheritAttrs: false });
defineSlots<Record<string, (props: Record<string, unknown>) => unknown>>();

const props = withDefaults(
	defineProps<{
		/** Store from `useTableStore` / `defineTable`. */
		store: IUseTableStoreReturn<T>;
		/** Refresh on mount. Default `true`. */
		immediate?: boolean;
		/** Debounce (ms) before a filter is pushed to the store. Default `300`. */
		filterDebounceMs?: number;
		/** Override PrimeVue-filters → store mapping. */
		mapFilters?: IUseSstDataTableOptions<T>['mapFilters'];
		/** Persist an inline edit (optimistic; reverts on rejection). */
		onSave?: IUseSstDataTableOptions<T>['onSave'];
	}>(),
	{ immediate: true, filterDebounceMs: 300 },
);

const bindings = useSstDataTable<T>(props.store, {
	immediate: props.immediate,
	filterDebounceMs: props.filterDebounceMs,
	...(props.mapFilters ? { mapFilters: props.mapFilters } : {}),
	...(props.onSave ? { onSave: props.onSave } : {}),
});

defineExpose({
	/** Currently selected rows. */
	get selection() {
		return bindings.selection;
	},
	/** Clear the current selection. */
	clearSelection: () => bindings.clearSelection(),
	/** Delete row(s) by id; defaults to the current selection. */
	removeSelected: (rows?: T | readonly T[]) => bindings.removeSelected(rows),
});
</script>

<template>
	<DataTable v-bind="{ dataKey: 'id', ...$attrs, ...bindings }">
		<template v-for="(_, name) in $slots" #[name]="slotProps">
			<slot :name="name" v-bind="slotProps ?? {}" />
		</template>
	</DataTable>
</template>
