# PrimeVue Responsive Layout Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add viewport-responsive, slot-based layouts to `@bridgebyte/sst-vue/primevue`'s `<SstDataTable>`: below a configurable breakpoint, the host renders a custom layout (e.g. each row as a card) instead of the PrimeVue DataTable, with a mobile-first cascade across Tailwind breakpoints.

**Architecture:** Three isolated units — a pure `resolveLayoutSlot` cascade function (`responsive.ts`), a `useBreakpoint()` composable over `window.matchMedia` (`use-breakpoint.ts`), and a template fork in `SstDataTable.vue` that renders the active layout slot or the DataTable. No `@bridgebyte/sst-core` change; no change to the standalone `<SstTable>`.

**Tech Stack:** TypeScript (strict), Vue 3 `<script setup>`, PrimeVue v4 DataTable, Vitest + @vue/test-utils.

## Global Constraints

- **Non-breaking:** when no layout slots are present, `<SstDataTable>` renders the DataTable exactly as today; `useSstDataTable`/all existing props unchanged.
- **TS:** strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` — use `!` on known-safe indexed access and conditional spreads for optionals.
- **Formatting:** tabs for indentation; run `npx prettier --write` on touched files before each commit.
- **Breakpoints (Tailwind, px):** `xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536`. `xs` is the base (< sm) and has no media query.
- **Slot payload:** every layout slot receives `{ rows: readonly T[]; loading: boolean; store: IUseTableStoreReturn<T> }`.
- **`tableBreakpoint` default:** `'lg'`; accepts `'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none'`.
- **SSR-safe:** no `window` access at module top level; the composable defaults to the largest token before mount / when `matchMedia` is unavailable.
- **Verdaccio:** `test/primevue` consumes the published `@bridgebyte/sst-vue`; run `npm run publish:local` (repo root) and reinstall in `test/primevue` before browser verification. Unit/component tests are the authoritative gate.

---

### Task 1: Pure cascade resolver (`responsive.ts`)

**Files:**
- Create: `packages/vue/src/primevue/responsive.ts`
- Test: `packages/vue/src/primevue/responsive.test.ts`

**Interfaces:**
- Produces:
  - `type BreakpointToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`
  - `type TableBreakpoint = Exclude<BreakpointToken, 'xs'> | 'none'`
  - `const BREAKPOINT_ORDER: readonly BreakpointToken[]` (ascending)
  - `const BREAKPOINT_MIN_WIDTH: Readonly<Record<BreakpointToken, number>>`
  - `const RESERVED_LAYOUT_SLOTS: ReadonlySet<string>`
  - `function resolveLayoutSlot(opts: { definedSlots: ReadonlySet<string>; current: BreakpointToken; tableBreakpoint: TableBreakpoint }): BreakpointToken | null`

- [ ] **Step 1: Write the failing test**

Create `packages/vue/src/primevue/responsive.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveLayoutSlot, BREAKPOINT_ORDER, RESERVED_LAYOUT_SLOTS, type BreakpointToken } from './responsive';

const set = (...names: string[]): ReadonlySet<string> => new Set(names);

describe('resolveLayoutSlot', () => {
	it('cascades a single xs slot up to the table breakpoint (lg)', () => {
		const r = (current: BreakpointToken) => resolveLayoutSlot({ definedSlots: set('xs'), current, tableBreakpoint: 'lg' });
		expect(r('xs')).toBe('xs');
		expect(r('sm')).toBe('xs');
		expect(r('md')).toBe('xs');
		expect(r('lg')).toBeNull(); // table owns >= lg
		expect(r('xl')).toBeNull();
	});

	it('lets a larger defined slot override the smaller one in its range', () => {
		const r = (current: BreakpointToken) => resolveLayoutSlot({ definedSlots: set('xs', 'md'), current, tableBreakpoint: 'lg' });
		expect(r('xs')).toBe('xs');
		expect(r('sm')).toBe('xs');
		expect(r('md')).toBe('md');
		expect(r('lg')).toBeNull();
	});

	it('falls back to the table when no defined slot covers the current width', () => {
		const r = (current: BreakpointToken) => resolveLayoutSlot({ definedSlots: set('md'), current, tableBreakpoint: 'lg' });
		expect(r('xs')).toBeNull(); // nothing <= xs is defined
		expect(r('sm')).toBeNull();
		expect(r('md')).toBe('md');
		expect(r('lg')).toBeNull();
	});

	it('always returns null (table) when no layout slots are defined', () => {
		for (const current of BREAKPOINT_ORDER) {
			expect(resolveLayoutSlot({ definedSlots: set(), current, tableBreakpoint: 'lg' })).toBeNull();
		}
	});

	it("never renders the table when tableBreakpoint is 'none'", () => {
		const r = (current: BreakpointToken) => resolveLayoutSlot({ definedSlots: set('xs', 'lg'), current, tableBreakpoint: 'none' });
		expect(r('xs')).toBe('xs');
		expect(r('md')).toBe('xs'); // cascades up from xs
		expect(r('lg')).toBe('lg');
		expect(r('2xl')).toBe('lg'); // cascades up from lg
	});

	it('ignores defined slots at or above the table breakpoint', () => {
		// #xl is defined but tableBreakpoint is lg, so xl never renders.
		expect(resolveLayoutSlot({ definedSlots: set('xl'), current: 'xl', tableBreakpoint: 'lg' })).toBeNull();
	});

	it('reserves exactly the six breakpoint tokens', () => {
		expect([...RESERVED_LAYOUT_SLOTS].sort()).toEqual(['2xl', 'lg', 'md', 'sm', 'xl', 'xs']);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/vue && npx vitest run src/primevue/responsive.test.ts`
Expected: FAIL — `Failed to resolve import "./responsive"` / module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/vue/src/primevue/responsive.ts`:

```ts
/** Tailwind viewport breakpoint tokens, ascending. `xs` is the base (< sm). */
export type BreakpointToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Breakpoint at/above which the DataTable renders; `'none'` ⇒ never render the table. */
export type TableBreakpoint = Exclude<BreakpointToken, 'xs'> | 'none';

/** Breakpoint tokens in ascending min-width order. */
export const BREAKPOINT_ORDER: readonly BreakpointToken[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

/** Min-width (px) for each breakpoint, mirroring Tailwind's defaults. */
export const BREAKPOINT_MIN_WIDTH: Readonly<Record<BreakpointToken, number>> = {
	xs: 0,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536,
};

/** Layout-slot names consumed by `SstDataTable` (never forwarded to the DataTable). */
export const RESERVED_LAYOUT_SLOTS: ReadonlySet<string> = new Set<string>(BREAKPOINT_ORDER);

/** Rank in ascending order; `'none'` ranks above every real breakpoint. */
function rank(token: BreakpointToken | 'none'): number {
	return token === 'none' ? BREAKPOINT_ORDER.length : BREAKPOINT_ORDER.indexOf(token);
}

/**
 * Resolve which layout slot to render for the current viewport, or `null` to
 * render the DataTable.
 *
 * Mobile-first cascade: below `tableBreakpoint`, the largest defined slot whose
 * breakpoint ≤ the current breakpoint wins. If none applies, fall back to the
 * table (`null`). Slots at or above `tableBreakpoint` never render.
 */
export function resolveLayoutSlot(opts: {
	definedSlots: ReadonlySet<string>;
	current: BreakpointToken;
	tableBreakpoint: TableBreakpoint;
}): BreakpointToken | null {
	const { definedSlots, current, tableBreakpoint } = opts;
	const tableRank = rank(tableBreakpoint);
	if (rank(current) >= tableRank) return null; // table owns this range

	let best: BreakpointToken | null = null;
	for (const token of BREAKPOINT_ORDER) {
		const r = rank(token);
		if (r >= tableRank) break; // slots at/above the table range never render
		if (r <= rank(current) && definedSlots.has(token)) best = token;
	}
	return best; // null ⇒ no slot applies ⇒ table fallback
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/vue && npx vitest run src/primevue/responsive.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Format and commit**

```bash
cd /Users/dinuiordachi/Projects/so-simple-table
npx prettier --write packages/vue/src/primevue/responsive.ts packages/vue/src/primevue/responsive.test.ts
git add packages/vue/src/primevue/responsive.ts packages/vue/src/primevue/responsive.test.ts
git commit -m "feat(vue): pure breakpoint cascade resolver for primevue responsive layouts"
```

---

### Task 2: Breakpoint composable (`use-breakpoint.ts`)

**Files:**
- Create: `packages/vue/src/primevue/use-breakpoint.ts`
- Test: `packages/vue/src/primevue/use-breakpoint.test.ts`

**Interfaces:**
- Consumes (Task 1): `BREAKPOINT_ORDER`, `BREAKPOINT_MIN_WIDTH`, `BreakpointToken`.
- Produces: `function useBreakpoint(): Ref<BreakpointToken>` — reactive current viewport breakpoint; `'2xl'` before mount / when `window.matchMedia` is unavailable.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/src/primevue/use-breakpoint.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useBreakpoint } from './use-breakpoint';
import type { BreakpointToken } from './responsive';

/** Minimal controllable `window.matchMedia` mock keyed by `(min-width: Npx)`. */
function installMatchMedia(initialWidth: number): { setWidth(next: number): void } {
	interface MQ {
		media: string;
		matches: boolean;
		px: number;
		listeners: Set<() => void>;
		addEventListener(type: string, cb: () => void): void;
		removeEventListener(type: string, cb: () => void): void;
	}
	const entries: MQ[] = [];
	let width = initialWidth;
	(window as unknown as { matchMedia(q: string): MQ }).matchMedia = (query: string): MQ => {
		const px = Number(/(\d+)px/.exec(query)?.[1] ?? 0);
		const entry: MQ = {
			media: query,
			px,
			matches: width >= px,
			listeners: new Set<() => void>(),
			addEventListener: (_type, cb) => entry.listeners.add(cb),
			removeEventListener: (_type, cb) => entry.listeners.delete(cb),
		};
		entries.push(entry);
		return entry;
	};
	return {
		setWidth(next: number): void {
			width = next;
			for (const entry of entries) {
				entry.matches = next >= entry.px;
				for (const cb of entry.listeners) cb();
			}
		},
	};
}

function harness(): { bp: Ref<BreakpointToken> } {
	let bp!: Ref<BreakpointToken>;
	const Comp = defineComponent({
		setup() {
			bp = useBreakpoint();
			return () => h('div');
		},
	});
	mount(Comp);
	return {
		get bp() {
			return bp;
		},
	};
}

afterEach(() => {
	delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

describe('useBreakpoint', () => {
	it("reports 'xs' below the sm breakpoint", () => {
		installMatchMedia(500);
		expect(harness().bp.value).toBe('xs');
	});

	it("reports 'md' between md and lg", () => {
		installMatchMedia(800);
		expect(harness().bp.value).toBe('md');
	});

	it('reacts to viewport changes', () => {
		const mm = installMatchMedia(500);
		const h = harness();
		expect(h.bp.value).toBe('xs');
		mm.setWidth(1300);
		expect(h.bp.value).toBe('xl');
	});

	it("defaults to '2xl' when matchMedia is unavailable (SSR-safe)", () => {
		// no installMatchMedia → window.matchMedia is undefined
		expect(harness().bp.value).toBe('2xl');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/vue && npx vitest run src/primevue/use-breakpoint.test.ts`
Expected: FAIL — `Failed to resolve import "./use-breakpoint"`.

- [ ] **Step 3: Write the implementation**

Create `packages/vue/src/primevue/use-breakpoint.ts`:

```ts
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { BREAKPOINT_MIN_WIDTH, BREAKPOINT_ORDER, type BreakpointToken } from './responsive';

/**
 * Reactive current Tailwind viewport breakpoint, driven by `window.matchMedia`.
 *
 * SSR / pre-mount / no `window`: resolves to the largest token (`'2xl'`) so the
 * most-desktop path renders; the real value lands on mount. Media-query
 * listeners are removed on unmount. Call only from a component `setup()`.
 */
export function useBreakpoint(): Ref<BreakpointToken> {
	const LARGEST = BREAKPOINT_ORDER[BREAKPOINT_ORDER.length - 1]!; // '2xl'
	const current = ref<BreakpointToken>(LARGEST);

	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return current; // SSR / unsupported: keep the desktop default
	}

	// One min-width query per breakpoint above the base (`xs` has no query).
	const queries = BREAKPOINT_ORDER.filter((token) => BREAKPOINT_MIN_WIDTH[token] > 0).map((token) => ({
		token,
		mql: window.matchMedia(`(min-width: ${BREAKPOINT_MIN_WIDTH[token]}px)`),
	}));

	const compute = (): void => {
		let active: BreakpointToken = 'xs';
		for (const { token, mql } of queries) {
			if (mql.matches) active = token; // ascending order ⇒ largest match wins
		}
		current.value = active;
	};

	onMounted(() => {
		for (const { mql } of queries) mql.addEventListener('change', compute);
		compute();
	});

	onBeforeUnmount(() => {
		for (const { mql } of queries) mql.removeEventListener('change', compute);
	});

	return current;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/vue && npx vitest run src/primevue/use-breakpoint.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Format and commit**

```bash
cd /Users/dinuiordachi/Projects/so-simple-table
npx prettier --write packages/vue/src/primevue/use-breakpoint.ts packages/vue/src/primevue/use-breakpoint.test.ts
git add packages/vue/src/primevue/use-breakpoint.ts packages/vue/src/primevue/use-breakpoint.test.ts
git commit -m "feat(vue): useBreakpoint composable (matchMedia, SSR-safe) for primevue"
```

---

### Task 3: Wire the responsive fork into `SstDataTable.vue` + exports

**Files:**
- Modify: `packages/vue/src/primevue/SstDataTable.vue`
- Modify: `packages/vue/src/primevue/index.ts`
- Test: `packages/vue/src/primevue/SstDataTable.test.ts` (extend)

**Interfaces:**
- Consumes (Tasks 1–2): `resolveLayoutSlot`, `RESERVED_LAYOUT_SLOTS`, `TableBreakpoint` from `./responsive`; `useBreakpoint` from `./use-breakpoint`.
- Produces: `<SstDataTable>` gains a `tableBreakpoint?: TableBreakpoint` prop (default `'lg'`) and reserved layout slots `#xs…#2xl`; `index.ts` re-exports `./responsive` and `./use-breakpoint`.

- [ ] **Step 1: Add the failing component tests**

In `packages/vue/src/primevue/SstDataTable.test.ts`, update the imports at the top (add `afterEach`, `h`) and add a `matchMedia` mock + new tests. Replace the import lines 1–3:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref, h, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
```

Then, immediately before the final `});` that closes `describe('SstDataTable', …)`, insert:

```ts
	// --- responsive layout slots ---

	function installMatchMedia(width: number): void {
		interface MQ {
			media: string;
			matches: boolean;
			px: number;
			addEventListener(type: string, cb: () => void): void;
			removeEventListener(type: string, cb: () => void): void;
		}
		(window as unknown as { matchMedia(q: string): MQ }).matchMedia = (query: string): MQ => {
			const px = Number(/(\d+)px/.exec(query)?.[1] ?? 0);
			return {
				media: query,
				px,
				matches: width >= px,
				addEventListener: () => {},
				removeEventListener: () => {},
			};
		};
	}

	afterEach(() => {
		delete (window as unknown as { matchMedia?: unknown }).matchMedia;
	});

	it('renders a layout slot below tableBreakpoint and passes rows/loading/store', () => {
		installMatchMedia(500); // < lg
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		let received: { rows: readonly IItem[]; loading: boolean; store: unknown } | undefined;
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				xs: (sp: { rows: readonly IItem[]; loading: boolean; store: unknown }) => {
					received = sp;
					return sp.rows.map((r) => h('div', { class: 'card' }, r.name));
				},
			},
		});
		expect(wrapper.find('table').exists()).toBe(false); // no DataTable
		expect(wrapper.findAll('.card')).toHaveLength(1);
		expect(wrapper.text()).toContain('Ada');
		expect(received?.rows).toHaveLength(1);
		expect(received?.loading).toBe(false);
		expect(received?.store).toBe(store);
	});

	it('cascades a smaller layout slot upward (xs shown at md width)', () => {
		installMatchMedia(800); // md range, only #xs defined
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				xs: () => h('div', { class: 'card' }, 'card'),
			},
		});
		expect(wrapper.findAll('.card')).toHaveLength(1);
	});

	it('renders the table at/above tableBreakpoint and does not forward reserved slots', () => {
		installMatchMedia(1280); // >= lg
		const store = makeStore([{ id: '1', name: 'Ada' }]);
		const wrapper = mount(SstDataTable, {
			global: { plugins: [PrimeVue], components: { Column } },
			props: { store: store as never },
			slots: {
				default: '<Column field="name" header="Name" />',
				header: '<span class="toolbar">Toolbar</span>',
				xs: () => h('div', { class: 'card' }, 'card'),
			},
		});
		expect(wrapper.find('table').exists()).toBe(true); // DataTable renders
		expect(wrapper.find('.toolbar').exists()).toBe(true); // non-reserved slot forwarded
		expect(wrapper.find('.card').exists()).toBe(false); // reserved #xs NOT forwarded/rendered
	});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `cd packages/vue && npx vitest run src/primevue/SstDataTable.test.ts`
Expected: the 2 original tests PASS; the 3 new tests FAIL (the `#xs` slot is currently forwarded to the DataTable, so `.card` renders even at desktop and `table` still exists at mobile).

- [ ] **Step 3: Modify the wrapper**

Replace the entire contents of `packages/vue/src/primevue/SstDataTable.vue` with:

```vue
<script setup lang="ts" generic="T extends { id: string | number }">
import { computed, useSlots } from 'vue';
import DataTable from 'primevue/datatable';
import type { IUseTableStoreReturn } from '../lib/composables/use-table-store';
import { useSstDataTable, type IUseSstDataTableOptions } from './use-sst-data-table';
import { resolveLayoutSlot, RESERVED_LAYOUT_SLOTS, type TableBreakpoint } from './responsive';
import { useBreakpoint } from './use-breakpoint';

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
	<slot
		v-if="activeSlot"
		:name="activeSlot"
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
```

- [ ] **Step 4: Add the new exports**

Replace `packages/vue/src/primevue/index.ts` with:

```ts
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
export * from './filter-helpers';
export * from './responsive';
export * from './use-breakpoint';
export { default as SstDataTable } from './SstDataTable.vue';
```

- [ ] **Step 5: Run tests, typecheck, and build**

```bash
cd /Users/dinuiordachi/Projects/so-simple-table/packages/vue
npx vitest run                 # expected: all suites green (incl. 5 SstDataTable tests)
npm run typecheck              # expected: vue-tsc clean
npm run build                  # expected: dist/primevue.* + index.* built, no errors
```

- [ ] **Step 6: Format and commit**

```bash
cd /Users/dinuiordachi/Projects/so-simple-table
npx prettier --write packages/vue/src/primevue/SstDataTable.vue packages/vue/src/primevue/SstDataTable.test.ts packages/vue/src/primevue/index.ts
git add packages/vue/src/primevue/SstDataTable.vue packages/vue/src/primevue/SstDataTable.test.ts packages/vue/src/primevue/index.ts
git commit -m "feat(vue): responsive layout slots + tableBreakpoint on SstDataTable"
```

---

### Task 4: Example, docs, and browser verification

**Files:**
- Modify: `test/primevue/src/App.vue`
- Modify: `packages/vue/README.md`
- Modify: `packages/vue/CHANGELOG.md`

**Interfaces:**
- Consumes: the published `@bridgebyte/sst-vue/primevue` `<SstDataTable>` with `tableBreakpoint` + `#xs` slot.

- [ ] **Step 1: Add a `#xs` card layout to the demo (PrimeVue `Card`)**

First register PrimeVue's `Card` component. In `test/primevue/src/App.vue`, add the import alongside the other PrimeVue component imports (after `import Button from 'primevue/button';`):

```ts
import Card from 'primevue/card';
```

Then add `table-breakpoint="lg"` to the opening `<SstDataTable` tag (it already has `:store`, `:mapFilters`, etc. — add the attribute on its own line for clarity). Then, immediately after the opening `<SstDataTable …>` tag's `>` and before `<template #header>`, insert the layout slot rendering a real list of PrimeVue cards:

```html
			<template #xs="{ rows, loading, store }">
				<div v-if="loading" style="padding: 16px">Loading…</div>
				<Card v-for="row in rows" :key="row.id" style="margin-bottom: 8px">
					<template #title>{{ row.title }}</template>
					<template #subtitle>{{ row.brand }} · {{ row.category }}</template>
					<template #content>
						${{ row.price.toFixed(2) }} · {{ row.rating.toFixed(2) }} ★ · stock {{ row.stock }}
					</template>
				</Card>
				<button
					style="margin-top: 8px"
					:disabled="loading"
					@click="store.updatePagination({ page: store.pagination.value.page + 1 })"
				>
					Load next page
				</button>
			</template>
```

- [ ] **Step 2: Add a README section**

Append the following subsection to the `@bridgebyte/sst-vue/primevue` portion of `packages/vue/README.md` (after the editing/selection content, before any closing/footer section):

```markdown
### Responsive layouts

Below a configurable width, render your own layout per Tailwind breakpoint
instead of the table. Define any of `#xs` (<640), `#sm` (≥640), `#md` (≥768),
`#lg` (≥1024), `#xl` (≥1280), `#2xl` (≥1536). A slot applies from its width up
to the next defined slot (mobile-first cascade); at/above `tableBreakpoint`
(default `lg`, or `'none'` to never show the table) the DataTable renders. Each
slot receives `{ rows, loading, store }`.

```vue
<SstDataTable :store="store" table-breakpoint="lg">
  <Column field="name" header="Name" />

  <!-- < lg: each row becomes a card; cascades up from xs -->
  <template #xs="{ rows, loading, store }">
    <article v-for="row in rows" :key="row.id" class="card">{{ row.name }}</article>
    <button @click="store.updatePagination({ page: store.pagination.value.page + 1 })">More</button>
  </template>
</SstDataTable>
```

The `useBreakpoint()` composable (current Tailwind breakpoint, SSR-safe) is also
exported for standalone use.
```

- [ ] **Step 3: Add a CHANGELOG entry**

In `packages/vue/CHANGELOG.md`, under `## [Unreleased]` → `### Added`, add as a new bullet:

```markdown
- `@bridgebyte/sst-vue/primevue` responsive layouts: per-breakpoint layout slots
  (`#xs`…`#2xl`, Tailwind widths) on `<SstDataTable>` with a mobile-first cascade
  and a `tableBreakpoint` prop (default `lg`, or `'none'`). Each slot receives
  `{ rows, loading, store }`. Exports the `useBreakpoint` composable. SSR-safe;
  non-breaking.
```

- [ ] **Step 4: Republish and reinstall for the demo**

```bash
cd /Users/dinuiordachi/Projects/so-simple-table
npm run publish:local                      # bump + publish @bridgebyte/sst-* to Verdaccio
cd test/primevue && npm install @bridgebyte/sst-vue@latest && cd ../..
```
Expected: install resolves the new `@bridgebyte/sst-vue` from `http://localhost:4873`.

- [ ] **Step 5: Browser-verify the responsive switch**

Start the demo and verify with the preview tools (do not ask the user to check manually):
1. `preview_start` on `test/primevue` (Vite dev server).
2. `preview_resize` to a narrow viewport (e.g. 480×800) → `preview_snapshot`: the product **cards** render, no `<table>`.
3. `preview_resize` to wide (e.g. 1280×800) → `preview_snapshot`: the PrimeVue **table** renders, no cards.
4. `preview_console_logs`: no errors/warnings.
5. `preview_screenshot` at both widths to share proof.

- [ ] **Step 6: Format and commit**

```bash
cd /Users/dinuiordachi/Projects/so-simple-table
npx prettier --write test/primevue/src/App.vue
git add test/primevue/src/App.vue packages/vue/README.md packages/vue/CHANGELOG.md
git commit -m "docs(vue): responsive layout example (test/primevue) + README + CHANGELOG"
```

---

## Self-Review

**Spec coverage:**
- `tableBreakpoint` prop (default `lg`, `'none'`) — Task 3 prop + Task 1 type. ✓
- Reserved slots `#xs…#2xl`, mobile-first cascade — Task 1 `resolveLayoutSlot` + Task 3 fork. ✓
- Slot payload `{ rows, loading, store }` — Task 3 template + Task 3 test assertion. ✓
- Viewport `matchMedia`, Tailwind widths — Task 2 composable + Task 1 `BREAKPOINT_MIN_WIDTH`. ✓
- No-match → table fallback; no slots → table (backward compat) — Task 1 tests + Task 3 original tests. ✓
- SSR-safe default — Task 2 `'2xl'` default + test. ✓
- Export `useBreakpoint` + `resolveLayoutSlot` + types — Task 3 `index.ts`. ✓
- Non-reserved slots still forwarded — Task 3 fork + forwarding test. ✓
- Tests (`responsive.test.ts`, `use-breakpoint.test.ts`, `SstDataTable.test.ts`) — Tasks 1–3. ✓
- `test/primevue` example + README + CHANGELOG — Task 4. ✓
- E2E resize verification — Task 4 Step 5. ✓
- No `@bridgebyte/sst-core` change; no `<SstTable>` change — confirmed (files not touched). ✓

**Placeholder scan:** none — every step has full code/commands.

**Type consistency:** `BreakpointToken`/`TableBreakpoint` defined in Task 1 and consumed verbatim in Tasks 2–3; `resolveLayoutSlot` signature identical across Task 1 (def), Task 1 tests, and Task 3 usage; `useBreakpoint(): Ref<BreakpointToken>` consistent Task 2 ↔ Task 3; slot payload keys `rows`/`loading`/`store` identical in Task 3 template, Task 3 test, and Task 4 example.
