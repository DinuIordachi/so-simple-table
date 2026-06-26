# Design: responsive layout slots for `@sst/vue/primevue` `SstDataTable`

**Date:** 2026-06-26
**Status:** Approved (design)
**Scope:** Add viewport-responsive, slot-based layouts to `<SstDataTable>`: below a configurable breakpoint the host renders a custom layout (e.g. each row as a card) instead of the PrimeVue DataTable, with a mobile-first cascade across Tailwind breakpoints. Non-breaking; no `@sst/core` change. Proven by extending the `test/primevue` app.

## Motivation

`<SstDataTable>` is a thin pass-through that binds a store onto PrimeVue's `<DataTable>` and forwards every slot transparently. On small screens a wide data table is a poor experience — the common fix is to render each row as a card/list item. PrimeVue's own responsive options (`responsiveLayout="scroll"`, column stacking) don't allow an arbitrary custom mobile layout. This feature lets the host supply per-breakpoint layout slots; below the "table" range the active layout renders instead of the table, receiving the page's rows.

## Decisions (from brainstorming)

- **Viewport `matchMedia`, Tailwind breakpoints** (sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536; base `xs` < 640). Matches the "screen sizes / Tailwind" mental model. (Container queries via `ResizeObserver` are a possible future opt-in, not the default.)
- **Reserved slots named by Tailwind token**, mobile-first cascade: a slot applies from its min-width up to the next defined slot (or the table range).
- **`tableBreakpoint` prop** (default `'lg'`) sets where the real DataTable takes over; `'none'` = never render the table.
- **No-match fallback = the table.** If no layout slot applies at the current width, render the DataTable. No layout slots at all ⇒ always the table (today's behavior; fully backward compatible).
- **Slot payload:** `{ rows, loading, store }` — `rows` and `loading` for ergonomic templates, `store` as the full escape hatch (pagination/sort/search/refresh).
- **SSR-safe:** render the table pre-mount/SSR, switch on the client after `matchMedia` reads real width (no hydration mismatch).

## Public API

### New prop on `<SstDataTable>`
```ts
/** Viewport width at/above which the PrimeVue DataTable renders. `'none'` ⇒ never. Default 'lg'. */
tableBreakpoint?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
```

### Reserved layout slots (Tailwind tokens)
`#xs` (< 640), `#sm` (≥ 640), `#md` (≥ 768), `#lg` (≥ 1024), `#xl` (≥ 1280), `#2xl` (≥ 1536).

Each receives scoped props:
```ts
{
  rows: readonly T[];               // current page rows (unwrapped store.data)
  loading: boolean;                 // unwrapped store.loading
  store: IUseTableStoreReturn<T>;   // full escape hatch
}
```

All **non-reserved** slots (PrimeVue's `header`/`footer`/`empty`/`loading`/`expansion`/`paginatorstart`/… and the default-slot `<Column>` children) keep forwarding to `<DataTable>` exactly as today.

```html
<SstDataTable :store="store" table-breakpoint="lg">
  <Column field="name" header="Name" />
  <Column field="email" header="Email" />

  <!-- < lg: each row becomes a card; cascades up from xs -->
  <template #xs="{ rows, loading, store }">
    <Spinner v-if="loading" />
    <article v-for="row in rows" :key="row.id" class="card">
      <h3>{{ row.name }}</h3>
      <p>{{ row.email }}</p>
    </article>
    <button @click="store.updatePagination({ page: store.pagination.value.page + 1 })">More</button>
  </template>

  <!-- optional: a roomier layout for md..<lg overrides #xs there -->
  <template #md="{ rows }"> … </template>
</SstDataTable>
```

## Architecture — three isolated, testable units

### 1. `use-breakpoint.ts` → `useBreakpoint()`
- Breakpoint map: `{ xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }` (px).
- `onMounted` (client only): registers `window.matchMedia('(min-width: <px>px)')` for sm…2xl, computes the current token (largest whose min-width ≤ viewport), updates a `ref` on change.
- SSR / pre-mount / no `window`: resolves to the largest token (`'2xl'`) so the most-desktop path renders (the table, or — when `tableBreakpoint="none"` — the largest defined layout slot); the real value lands on mount.
- `onBeforeUnmount`: removes listeners.
- Returns `Ref<BreakpointToken>`. Exported from the `@sst/vue/primevue` subpath as a public utility.

### 2. `responsive.ts` → `resolveLayoutSlot(...)` (pure)
```ts
type BreakpointToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type TableBreakpoint = Exclude<BreakpointToken, 'xs'> | 'none';

function resolveLayoutSlot(opts: {
  definedSlots: ReadonlySet<string>;  // which of xs…2xl the host provided
  current: BreakpointToken;           // current viewport breakpoint
  tableBreakpoint: TableBreakpoint;
}): BreakpointToken | null;            // slot to render, or null ⇒ render table
```
Order ranks `xs<sm<md<lg<xl<2xl`; `'none'` ranks above all. Logic:
1. If `rank(current) ≥ rank(tableBreakpoint)` → `null` (table).
2. Else among `definedSlots` with `rank ≤ rank(current)` **and** `rank < rank(tableBreakpoint)`, return the highest-ranked; if none → `null` (table fallback).

Pure, no DOM — the cascade brain, exhaustively unit-tested. Also exports the ordered breakpoint list / reserved-slot set used by the wrapper.

### 3. `SstDataTable.vue`
- Add `tableBreakpoint` prop (default `'lg'`).
- `const current = useBreakpoint()`.
- `definedLayoutSlots = computed(() => reserved names present in $slots)`.
- `activeSlot = computed(() => resolveLayoutSlot({ definedSlots: definedLayoutSlots.value, current: current.value, tableBreakpoint: props.tableBreakpoint }))`.
- `forwardedSlots = computed(() => Object.keys($slots).filter(n => !RESERVED.has(n)))`.
- Template fork:
  ```html
  <template>
    <slot
      v-if="activeSlot"
      :name="activeSlot"
      :rows="store.data.value"
      :loading="store.loading.value"
      :store="store"
    />
    <DataTable v-else v-bind="{ dataKey: 'id', ...$attrs, ...bindings }">
      <template v-for="name in forwardedSlots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </DataTable>
  </template>
  ```
- `useSstDataTable` bindings still drive the table path unchanged. `defineExpose` (selection/clearSelection/removeSelected) unchanged.
- Optional dev-only `console.warn` when a defined layout slot's rank ≥ `tableBreakpoint` (it can never render).

## Cascade semantics (examples, `tableBreakpoint="lg"`)

| Defined slots | 320 (xs) | 700 (sm) | 800 (md) | 1024 (lg) | 1400 (xl) |
|---|---|---|---|---|---|
| `{xs}` | xs | xs | xs | **table** | table |
| `{xs, md}` | xs | xs | md | table | table |
| `{md}` | **table** | table | md | table | table |
| `{}` | table | table | table | table | table |

`tableBreakpoint="none"`, defined `{xs, lg}`: 320→xs, 1024→lg, 1920→lg (no table).

## Files

- **Add** `packages/vue/src/primevue/use-breakpoint.ts` — `useBreakpoint()` composable.
- **Add** `packages/vue/src/primevue/responsive.ts` — `resolveLayoutSlot`, breakpoint order, reserved-slot set, `BreakpointToken`/`TableBreakpoint` types.
- **Modify** `packages/vue/src/primevue/SstDataTable.vue` — `tableBreakpoint` prop, breakpoint wiring, template fork, reserved-vs-forwarded slot split.
- **Modify** `packages/vue/src/primevue/index.ts` — export `useBreakpoint`, `resolveLayoutSlot`, and the breakpoint types.
- **Tests:** add `responsive.test.ts` (pure cascade), `use-breakpoint.test.ts` (mocked `matchMedia`); extend `SstDataTable.test.ts`.
- **`test/primevue`:** add a `#xs` card layout to the products table (small-screen card list) demonstrating `rows` + `store` pagination.
- **Docs:** README section in `packages/vue/README.md`; `[Unreleased]` CHANGELOG entry (Added).

## Testing

- **Unit — `resolveLayoutSlot`:** every row of the table above (table-threshold, cascade-up, no-match→table, empty set, `'none'`).
- **Unit — `useBreakpoint`:** mock `window.matchMedia`; assert the reactive token reflects the matched query and updates on a `change` event; assert no-`window` safety returns the SSR default.
- **Component — `SstDataTable.test.ts`:** (a) no layout slots ⇒ `<DataTable>` renders (backward compat); (b) below `tableBreakpoint` with a defined `#xs`, the slot renders and receives `rows`/`loading`/`store`; (c) cascade — define `#xs`, simulate `md` width ⇒ `#xs` renders; (d) reserved slots are **not** forwarded to `<DataTable>`, non-reserved ones are. `matchMedia` is mocked to drive width.
- **E2E (`test/primevue`):** resize the preview below `lg` ⇒ the card layout shows; at/above `lg` ⇒ the table. Browser-verified, no console errors.

## Out of scope

- Container queries (`ResizeObserver` on the component's own box) — future opt-in.
- Per-row slot convenience (we pass the whole `rows` array; the host writes its own `v-for`).
- A built-in mobile paginator/sort UI — the slot gets `store` and builds its own controls.
- Any `@sst/core` change, and any change to the standalone `<SstTable>` component (this feature is PrimeVue-subpath only).

## Success criteria

- A host adds a `#xs` (or any token) slot and a `tableBreakpoint`, and gets a custom card layout below that width with zero extra wiring; the slot receives `{ rows, loading, store }`.
- The mobile-first cascade resolves per the table above; no-match falls back to the table.
- Existing usage is byte-for-byte unchanged when no layout slots are present; all current tests stay green; package stays SSR-correct.
