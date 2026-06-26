<script setup lang="ts" generic="T extends { id: string | number }">
import { computed, useSlots } from 'vue';
import DataTable from 'primevue/datatable';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import { useSstDataTable, type IUseSstDataTableOptions } from './use-sst-data-table';
import { resolveLayoutSlot, RESERVED_LAYOUT_SLOTS, type TableBreakpoint } from './responsive';
import { useBreakpoint } from './use-breakpoint';

defineOptions({ inheritAttrs: false });
// Slot props are typed as `any` so consumers can apply a narrowing annotation on
// forwarded slots — e.g. `#expansion="{ data }: { data: Row }"` or a layout slot's
// `#xs="{ rows }: { rows: Row[] }"` — exactly as they could on a raw PrimeVue
// `<DataTable>` (whose slot data is `any`). `Record<string, unknown>` (or even
// `Record<string, any>`) would reject such an annotation: an index signature does
// not satisfy a required named property like `data`, so it isn't assignable to
// `{ data: Row }`. `any` is, restoring slot ergonomics vs. the unwrapped component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
defineSlots<Record<string, (props: any) => any>>();

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
		/** Viewport width at/above which the DataTable renders; `'none'` ⇒ never. Default `'lg'`. */
		tableBreakpoint?: TableBreakpoint;
	}>(),
	{ immediate: true, filterDebounceMs: 300, tableBreakpoint: 'lg' },
);

const bindings = useSstDataTable<T>(props.store, {
	immediate: props.immediate,
	filterDebounceMs: props.filterDebounceMs,
	...(props.mapFilters ? { mapFilters: props.mapFilters } : {}),
	...(props.onSave ? { onSave: props.onSave } : {}),
});

const slots = useSlots();
const breakpoint = useBreakpoint();

/** Reserved breakpoint slots the host supplied. */
const definedLayoutSlots = computed<ReadonlySet<string>>(
	() => new Set(Object.keys(slots).filter((name) => RESERVED_LAYOUT_SLOTS.has(name))),
);
/** The layout slot to render now, or `null` to render the DataTable. */
const activeSlot = computed(() =>
	resolveLayoutSlot({
		definedSlots: definedLayoutSlots.value,
		current: breakpoint.value,
		tableBreakpoint: props.tableBreakpoint,
	}),
);
/** Non-reserved slots forwarded to the DataTable (PrimeVue slots + `<Column>` default). */
const forwardedSlotNames = computed(() => Object.keys(slots).filter((name) => !RESERVED_LAYOUT_SLOTS.has(name)));

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
	<slot v-if="activeSlot" :name="activeSlot" :rows="store.data.value" :loading="store.loading.value" :store="store" />
	<DataTable v-else v-bind="{ dataKey: 'id', ...$attrs, ...bindings }">
		<template v-for="name in forwardedSlotNames" #[name]="slotProps">
			<slot :name="name" v-bind="slotProps ?? {}" />
		</template>
	</DataTable>
</template>
