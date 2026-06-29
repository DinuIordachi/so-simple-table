<script setup lang="ts" generic="T extends { id: string | number }">
import { computed, useSlots } from 'vue';
import DataTable from 'primevue/datatable';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import {
	useSstDataTable,
	defaultMapFilters,
	type IUseSstDataTableOptions,
	type ISstLayoutSlotProps,
} from './use-sst-data-table';
import { resolveLayoutSlot, RESERVED_LAYOUT_SLOTS, type TableBreakpoint, type BreakpointToken } from './responsive';
import { useBreakpoint } from './use-breakpoint';

defineOptions({ inheritAttrs: false });
/* eslint-disable @typescript-eslint/no-explicit-any */
// The responsive layout slots carry the row type, so `#xs="{ rows }"` gives a typed
// `rows: readonly T[]` (each `row` is `T`) with no annotation. Forwarded slots
// (PrimeVue's `header`/`empty`/`expansion`/… and the default `<Column>` slot) keep
// `any` props so consumers can narrow them — e.g. `#expansion="{ data }: { data: Row }"`
// — exactly as on a raw PrimeVue `<DataTable>` (whose slot data is `any`).
defineSlots<{
	[name: string]: (props: any) => any;
	xs?: (props: ISstLayoutSlotProps<T>) => any;
	sm?: (props: ISstLayoutSlotProps<T>) => any;
	md?: (props: ISstLayoutSlotProps<T>) => any;
	lg?: (props: ISstLayoutSlotProps<T>) => any;
	xl?: (props: ISstLayoutSlotProps<T>) => any;
	'2xl'?: (props: ISstLayoutSlotProps<T>) => any;
}>();
/* eslint-enable @typescript-eslint/no-explicit-any */

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
		/** Breakpoint assumed before mount / during SSR (no `window`). Default `'2xl'` (the table). */
		ssrBreakpoint?: BreakpointToken;
	}>(),
	{ immediate: true, filterDebounceMs: 300, tableBreakpoint: 'lg' },
);

const bindings = useSstDataTable<T>(props.store, {
	immediate: props.immediate,
	filterDebounceMs: props.filterDebounceMs,
	// Read the props at call time so swapping `mapFilters` / `onSave` at runtime takes effect.
	mapFilters: (filters) => (props.mapFilters ?? defaultMapFilters)(filters),
	onSave: (edit) => props.onSave?.(edit),
});

const slots = useSlots();
const breakpoint = useBreakpoint(props.ssrBreakpoint ? { ssrDefault: props.ssrBreakpoint } : {});

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
	<!-- String() keeps the dynamic slot name a definite `string` for the dts compiler. -->
	<slot
		v-if="activeSlot"
		:name="String(activeSlot)"
		:rows="store.data.value"
		:loading="store.loading.value"
		:store="store"
	/>
	<DataTable v-else v-bind="{ dataKey: 'id', ...$attrs, ...bindings }">
		<template v-for="name in forwardedSlotNames" #[name]="slotProps">
			<slot :name="name" v-bind="slotProps ?? {}" />
		</template>
	</DataTable>
</template>
