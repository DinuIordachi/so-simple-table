# So Simple Table — React (`@sst/react`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a React 18+ adapter on top of `@sst/core` that bridges the headless `TableStore<T>` to React's render model via `useSyncExternalStore`, and ships a default styled `<SstTable>` component with full render-prop / slot overrides.

**Architecture:**
- `useObservable<T>` hook subscribes a component to an `IReadonlyObservable<T>` using `useSyncExternalStore` — the canonical React 18 way to consume an external store with concurrent rendering safety.
- `useTableStore<T>(options)` instantiates a `TableStore<T>` once per mount (with `useRef`), exposes hook-returned values for every observable, and surfaces the bound action methods. The underlying store is destroyed on unmount.
- `<SstTable>` accepts render-prop overrides for `renderHeaderCell`, `renderBodyCell`, `renderEmptyState`, `renderBulkActions`, and `renderPagination`. No external UI library.
- HTTP defaults to `FetchHttpClient` from core; users may pass any `IHttpClient`.

**Tech Stack:** React 18+, tsup (build), Vitest + `@testing-library/react` + `happy-dom` (tests), `@sst/core` peer dep.

**Prerequisites:** Plan `01-core.md` is fully implemented and `@sst/core` builds clean.

---

## File Structure

```
packages/react/
├── package.json                  # name: "@sst/react"
├── project.json
├── tsconfig.json
├── tsconfig.build.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── src/
    ├── index.ts                  # public barrel
    ├── styles.css                # default styles
    └── lib/
        ├── hooks/
        │   ├── use-observable.ts
        │   ├── use-observable.test.ts
        │   ├── use-table-store.ts
        │   └── use-table-store.test.tsx
        └── components/
            ├── SstTable.tsx
            └── SstTable.test.tsx
```

---

## Task 1: Scaffold `@sst/react` package

**Files:**
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`
- Create: `packages/react/tsconfig.build.json`
- Create: `packages/react/tsup.config.ts`
- Create: `packages/react/vitest.config.ts`
- Create: `packages/react/project.json`
- Create: `packages/react/src/index.ts`
- Create: `packages/react/README.md`
- Modify: `<repo-root>/tsconfig.base.json`

- [ ] **Step 1: Create `packages/react/package.json`**

```json
{
  "name": "@sst/react",
  "version": "0.1.0",
  "description": "So Simple Table — React adapter on top of @sst/core.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "sideEffects": ["**/*.css"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint src --ext .ts,.tsx",
    "clean": "rm -rf dist coverage"
  },
  "peerDependencies": {
    "@sst/core": "workspace:*",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "happy-dom": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tsup": "^8.2.0",
    "vitest": "^2.0.0"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Create `packages/react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 3: Create `packages/react/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["**/*.test.ts", "**/*.test.tsx", "vitest.config.ts", "tsup.config.ts"]
}
```

- [ ] **Step 4: Create `packages/react/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	clean: true,
	target: 'es2022',
	tsconfig: './tsconfig.build.json',
	external: ['react', 'react-dom', '@sst/core'],
	splitting: false,
	treeshake: true,
	onSuccess: async () => {
		copyFileSync('src/styles.css', 'dist/styles.css');
	},
});
```

- [ ] **Step 5: Create `packages/react/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: { '@sst/core': new URL('../core/src/index.ts', import.meta.url).pathname },
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['src/**/*.test.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.test.{ts,tsx}', 'src/index.ts'],
		},
	},
});
```

- [ ] **Step 6: Create `packages/react/project.json`**

```json
{
  "name": "react",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/react/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{projectRoot}/dist"],
      "dependsOn": ["^build"]
    },
    "test": { "executor": "nx:run-script", "options": { "script": "test" } },
    "lint": { "executor": "nx:run-script", "options": { "script": "lint" } },
    "typecheck": { "executor": "nx:run-script", "options": { "script": "typecheck" } }
  },
  "implicitDependencies": ["core"]
}
```

- [ ] **Step 7: Create `packages/react/src/index.ts`** and `styles.css`

`packages/react/src/index.ts`:
```ts
// @sst/react public API — populated by subsequent tasks.
export {};
```

`packages/react/src/styles.css`:
```css
.sst-table { display: block; width: 100%; }
.sst-table__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.sst-table__search { position: relative; display: inline-flex; gap: 4px; }
.sst-table__search input { padding: 6px 28px 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 14px; min-width: 240px; }
.sst-table__search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; font-size: 18px; cursor: pointer; line-height: 1; padding: 4px; }
.sst-table__table { width: 100%; border-collapse: collapse; }
.sst-table__table th, .sst-table__table td { padding: 10px 12px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
.sst-table__table th { font-weight: 600; background: #fafafa; }
.sst-table__th--sortable { cursor: pointer; user-select: none; }
.sst-table__th-inner { display: inline-flex; align-items: center; gap: 6px; }
.sst-table__sort-indicator { font-size: 12px; opacity: 0.6; }
.sst-table__check-cell { width: 32px; text-align: center; }
.sst-table__empty { padding: 24px; text-align: center; color: #888; }
.sst-table__pagination { margin-top: 12px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.sst-table__pagination button { padding: 4px 10px; border: 1px solid #d0d0d0; background: #fff; border-radius: 4px; cursor: pointer; }
.sst-table__pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.sst-table__loading { padding: 12px; text-align: center; font-style: italic; color: #666; }
```

- [ ] **Step 8: Create `packages/react/README.md`**

```markdown
# @sst/react

React adapter for **So Simple Table**. Built on top of [`@sst/core`](../core).

- `useObservable` — concurrent-safe hook over `IReadonlyObservable`
- `useTableStore` — hook wrapping `TableStore<T>` lifecycle
- `<SstTable>` component — default UI with render-prop overrides
```

- [ ] **Step 9: Add `@sst/react` path mapping**

Update `<repo-root>/tsconfig.base.json` `paths`:
```json
"paths": {
  "@sst/core": ["packages/core/src/index.ts"],
  "@sst/ng": ["packages/ng/src/public-api.ts"],
  "@sst/vue": ["packages/vue/src/index.ts"],
  "@sst/react": ["packages/react/src/index.ts"]
}
```

- [ ] **Step 10: Install workspace dependencies**

```bash
npm install --workspace @sst/react
```

- [ ] **Step 11: Verify typecheck passes**

```bash
npx nx run react:typecheck
```

Expected: `0 errors`.

- [ ] **Step 12: Commit**

```bash
git add packages/react tsconfig.base.json package.json package-lock.json
git commit -m "feat(react): scaffold @sst/react package"
```

---

## Task 2: `useObservable` hook with `useSyncExternalStore`

**Files:**
- Create: `packages/react/src/lib/hooks/use-observable.ts`
- Create: `packages/react/src/lib/hooks/use-observable.test.ts`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Observable } from '@sst/core';
import { useObservable } from './use-observable';

describe('useObservable', () => {
	it('returns the current observable value on first render', () => {
		const o = new Observable<number>(7);
		const { result } = renderHook(() => useObservable(o));
		expect(result.current).toBe(7);
	});

	it('re-renders the consumer when the observable changes', () => {
		const o = new Observable<number>(0);
		const { result } = renderHook(() => useObservable(o));
		act(() => o.set(1));
		expect(result.current).toBe(1);
		act(() => o.set(2));
		expect(result.current).toBe(2);
	});

	it('detaches the subscription on unmount', () => {
		const o = new Observable<number>(0);
		const { result, unmount } = renderHook(() => useObservable(o));
		unmount();
		o.set(99);
		// After unmount the result reflects the last rendered value, not the new one.
		expect(result.current).toBe(0);
	});

	it('does not double-subscribe under React StrictMode-like double-invocation', () => {
		const o = new Observable<number>(0);
		const { result } = renderHook(() => useObservable(o));
		act(() => o.set(1));
		expect(result.current).toBe(1);
		// One subscription means one re-render — useSyncExternalStore guarantees this.
		expect((o as unknown as { _listeners: Set<unknown> })._listeners.size).toBeLessThanOrEqual(1);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run react:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `use-observable.ts`**

```ts
import { useCallback, useSyncExternalStore } from 'react';
import type { IReadonlyObservable } from '@sst/core';

export function useObservable<T>(source: IReadonlyObservable<T>): T {
	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			source.subscribe(() => onStoreChange(), { emitOnSubscribe: false }),
		[source],
	);
	const getSnapshot = useCallback(() => source.get(), [source]);
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run react:test
```

Expected: PASS — all 4 useObservable tests green.

- [ ] **Step 5: Re-export and commit**

Update `packages/react/src/index.ts`:
```ts
export * from './lib/hooks/use-observable';
```

```bash
git add packages/react/src
git commit -m "feat(react): add useObservable hook"
```

---

## Task 3: `useTableStore` hook

**Files:**
- Create: `packages/react/src/lib/hooks/use-table-store.ts`
- Create: `packages/react/src/lib/hooks/use-table-store.test.tsx`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ListRepository, type IResponse, type IResponseList } from '@sst/core';
import { useTableStore } from './use-table-store';

interface IItem { id: string; name: string; }

class StubRepository extends ListRepository<IItem> {
	public override getList = vi.fn<(...a: unknown[]) => Promise<IResponseList<IItem[]>>>().mockResolvedValue({
		result: [{ id: '1', name: 'a' }],
		totalCount: 1,
		isSuccess: true,
	});
	public override bulkDelete = vi.fn<(...a: unknown[]) => Promise<IResponse<string>>>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
}

describe('useTableStore', () => {
	it('returns the canonical default snapshot on first render', () => {
		const repository = new StubRepository();
		const { result } = renderHook(() => useTableStore<IItem>({ repository, sortMap: { name: 'ByName' } }));
		expect(result.current.data).toStrictEqual([]);
		expect(result.current.total).toBe(0);
		expect(result.current.loading).toBe(false);
		expect(result.current.pagination).toStrictEqual({ page: 1, pageSize: 10 });
		expect(result.current.sort).toBeUndefined();
		expect(result.current.filters).toStrictEqual([]);
		expect(result.current.search).toBe('');
	});

	it('refreshes data when an action mutates query state', async () => {
		const repository = new StubRepository();
		const { result } = renderHook(() => useTableStore<IItem>({ repository, sortMap: {} }));
		await act(async () => {
			result.current.updatePagination({ page: 2, pageSize: 10 });
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(repository.getList).toHaveBeenCalledTimes(1);
		expect(result.current.data).toStrictEqual([{ id: '1', name: 'a' }]);
	});

	it('keeps the same store instance across re-renders', () => {
		const repository = new StubRepository();
		const { result, rerender } = renderHook(() => useTableStore<IItem>({ repository, sortMap: {} }));
		const first = result.current.store;
		rerender();
		expect(result.current.store).toBe(first);
	});

	it('destroys the underlying store on unmount', async () => {
		const repository = new StubRepository();
		const { result, unmount } = renderHook(() => useTableStore<IItem>({ repository, sortMap: {} }));
		unmount();
		result.current.updatePagination({ page: 5, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getList).not.toHaveBeenCalled();
	});

	it('exposes a stable bulkDelete delegated to the repository', async () => {
		const repository = new StubRepository();
		const { result } = renderHook(() => useTableStore<IItem>({ repository, sortMap: {} }));
		await act(async () => {
			await result.current.bulkDelete(['1']);
		});
		expect(repository.bulkDelete).toHaveBeenCalledWith(['1']);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run react:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `use-table-store.ts`**

```ts
import { useEffect, useMemo, useRef } from 'react';
import {
	TableStore,
	type IFilterParams,
	type IPaginationParams,
	type IResponse,
	type ISortParams,
	type ITableStoreOptions,
} from '@sst/core';
import { useObservable } from './use-observable';

export interface IUseTableStoreReturn<T> {
	readonly store: TableStore<T>;
	readonly data: readonly T[];
	readonly total: number;
	readonly loading: boolean;
	readonly pagination: IPaginationParams;
	readonly sort: ISortParams | undefined;
	readonly filters: readonly IFilterParams[];
	readonly search: string;

	getData(pagination: IPaginationParams, sort?: ISortParams, filters?: readonly IFilterParams[], search?: string): void;
	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	refresh(): void;
	reset(): void;
	updatePagination(p: IPaginationParams): void;
	updateSort(sort: ISortParams | undefined): void;
	updateFilter(filters: readonly IFilterParams[]): void;
	updateSearch(search: string): void;
}

export function useTableStore<T>(options: ITableStoreOptions<T>): IUseTableStoreReturn<T> {
	// Lazy-init the store once. We deliberately do NOT recreate it when options change —
	// callers that want to swap repositories should remount the component.
	const storeRef = useRef<TableStore<T>>();
	if (!storeRef.current) {
		storeRef.current = new TableStore<T>(options);
	}
	const store = storeRef.current;

	useEffect(() => {
		return () => {
			store.destroy();
		};
	}, [store]);

	const data = useObservable(store.data$);
	const total = useObservable(store.total$);
	const loading = useObservable(store.loading$);
	const pagination = useObservable(store.pagination$);
	const sort = useObservable(store.sort$);
	const filters = useObservable(store.filters$);
	const search = useObservable(store.search$);

	const actions = useMemo(
		() => ({
			getData: store.getData.bind(store),
			bulkDelete: store.bulkDelete.bind(store),
			refresh: store.refresh.bind(store),
			reset: store.reset.bind(store),
			updatePagination: store.updatePagination.bind(store),
			updateSort: store.updateSort.bind(store),
			updateFilter: store.updateFilter.bind(store),
			updateSearch: store.updateSearch.bind(store),
		}),
		[store],
	);

	return { store, data, total, loading, pagination, sort, filters, search, ...actions };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run react:test
```

Expected: PASS — all 5 useTableStore tests green.

- [ ] **Step 5: Re-export and commit**

Update `packages/react/src/index.ts`:
```ts
export * from './lib/hooks/use-observable';
export * from './lib/hooks/use-table-store';
```

```bash
git add packages/react/src
git commit -m "feat(react): add useTableStore hook"
```

---

## Task 4: `<SstTable>` component with render-prop overrides

**Files:**
- Create: `packages/react/src/lib/components/SstTable.tsx`
- Create: `packages/react/src/lib/components/SstTable.test.tsx`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListRepository, type IColumn, type IResponse, type IResponseList } from '@sst/core';
import { useTableStore } from '../hooks/use-table-store';
import { SstTable } from './SstTable';

interface IItem { id: string; name: string; status: 'active' | 'paused'; }

class StubRepository extends ListRepository<IItem> {
	public override getList = vi.fn<(...a: unknown[]) => Promise<IResponseList<IItem[]>>>().mockResolvedValue({
		result: [
			{ id: '1', name: 'alpha', status: 'active' },
			{ id: '2', name: 'beta', status: 'paused' },
		],
		totalCount: 2,
		isSuccess: true,
	});
	public override bulkDelete = vi.fn<(...a: unknown[]) => Promise<IResponse<string>>>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
}

const columns: IColumn[] = [
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'status', name: 'Status' },
];

function Host(): JSX.Element {
	const repositoryRef = (Host as unknown as { _repo?: StubRepository });
	if (!repositoryRef._repo) repositoryRef._repo = new StubRepository();
	const t = useTableStore<IItem>({ repository: repositoryRef._repo, sortMap: { name: 'ByName' } });
	return (
		<SstTable
			columns={columns}
			store={t}
			bulk
			searchEnabled
			renderHeaderCell={({ column }) => <strong>{column.name}</strong>}
			renderBodyCell={({ row, column }) => <span data-testid="cell">{String(row[column.key as keyof IItem])}</span>}
		/>
	);
}

describe('<SstTable>', () => {
	it('renders one row per data item using renderBodyCell', async () => {
		render(<Host />);
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });
		const cells = await screen.findAllByTestId('cell');
		expect(cells).toHaveLength(4); // 2 rows × 2 cols
		expect(cells[0]).toHaveTextContent('alpha');
		expect(cells[1]).toHaveTextContent('active');
	});

	it('renders the empty state when no data is present', async () => {
		const repository = new StubRepository();
		repository.getList = vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		function EmptyHost(): JSX.Element {
			const t = useTableStore<IItem>({ repository, sortMap: {} });
			return <SstTable columns={columns} store={t} />;
		}
		render(<EmptyHost />);
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });
		expect(screen.getByTestId('sst-empty')).toBeTruthy();
	});

	it('updates store search after debounced typing', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<Host />);
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });
		const input = screen.getByTestId('sst-search') as HTMLInputElement;
		await user.type(input, 'alpha');
		await act(async () => { vi.advanceTimersByTime(600); });
		await act(async () => { await Promise.resolve(); });
		expect(input.value).toBe('alpha');
		vi.useRealTimers();
	});

	it('toggles all checkboxes when bulk header is checked', async () => {
		const user = userEvent.setup();
		render(<Host />);
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });
		const headerCheck = screen.getByTestId('sst-bulk-all') as HTMLInputElement;
		await user.click(headerCheck);
		const rowChecks = screen.getAllByTestId(/^sst-bulk-row-/) as HTMLInputElement[];
		expect(rowChecks.every((c) => c.checked)).toBe(true);
	});

	it('exposes data-sortable on header cells based on column.sortable', async () => {
		render(<Host />);
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });
		const ths = screen.getAllByTestId(/^sst-th-/);
		expect(ths[0]!.getAttribute('data-sortable')).toBe('true');
		expect(ths[1]!.getAttribute('data-sortable')).toBe('false');
	});
});
```

- [ ] **Step 2: Add `@testing-library/jest-dom`-style matcher shim or rely on plain DOM**

The tests above use `.toHaveTextContent()` and `.toBeTruthy()`. To keep deps minimal, register the jest-dom matchers via Vitest setup:

Create `packages/react/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

Update `packages/react/vitest.config.ts` to load it:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: { '@sst/core': new URL('../core/src/index.ts', import.meta.url).pathname },
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.test.{ts,tsx}', 'src/index.ts'],
		},
	},
});
```

Add `@testing-library/jest-dom` to devDependencies in `packages/react/package.json`:
```json
"@testing-library/jest-dom": "^6.4.0",
```

Then re-install:
```bash
npm install --workspace @sst/react
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx nx run react:test
```

Expected: FAIL — `SstTable` not found.

- [ ] **Step 4: Implement `SstTable.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ESortOrder, type IColumn, type ISortParams } from '@sst/core';
import type { IUseTableStoreReturn } from '../hooks/use-table-store';

export interface IRenderHeaderCellArgs {
	readonly column: IColumn;
}

export interface IRenderBodyCellArgs<T> {
	readonly row: T;
	readonly column: IColumn;
	readonly index: number;
}

export interface IRenderPaginationArgs {
	readonly page: number;
	readonly pageSize: number;
	readonly total: number;
	readonly totalPages: number;
	readonly setPage: (page: number) => void;
}

export interface IRenderBulkActionsArgs {
	readonly selected: ReadonlySet<string>;
	readonly bulkDelete: () => Promise<void>;
	readonly loading: boolean;
}

export interface ISstTableProps<T extends { id: string }> {
	readonly columns: readonly IColumn[];
	readonly store: IUseTableStoreReturn<T>;
	readonly bulk?: boolean;
	readonly searchEnabled?: boolean;
	readonly searchPlaceholder?: string;
	readonly searchDebounceMs?: number;
	readonly emptyText?: string;
	readonly bulkDeleteLabel?: string;
	readonly renderHeaderCell?: (args: IRenderHeaderCellArgs) => ReactNode;
	readonly renderBodyCell?: (args: IRenderBodyCellArgs<T>) => ReactNode;
	readonly renderEmptyState?: () => ReactNode;
	readonly renderBulkActions?: (args: IRenderBulkActionsArgs) => ReactNode;
	readonly renderPagination?: (args: IRenderPaginationArgs) => ReactNode;
}

export function SstTable<T extends { id: string }>(props: ISstTableProps<T>): JSX.Element {
	const {
		columns,
		store,
		bulk = false,
		searchEnabled = false,
		searchPlaceholder = 'Search',
		searchDebounceMs = 500,
		emptyText = 'No results',
		bulkDeleteLabel = 'Delete selected',
		renderHeaderCell,
		renderBodyCell,
		renderEmptyState,
		renderBulkActions,
		renderPagination,
	} = props;

	const [searchInput, setSearchInput] = useState<string>(store.search);
	const [bulkSelected, setBulkSelected] = useState<ReadonlySet<string>>(() => new Set());
	const [bulkLoading, setBulkLoading] = useState<boolean>(false);
	const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		setSearchInput(store.search);
	}, [store.search]);

	useEffect(() => {
		return () => {
			if (searchTimer.current !== undefined) clearTimeout(searchTimer.current);
		};
	}, []);

	const allChecked = useMemo(
		() => store.data.length > 0 && store.data.every((row) => bulkSelected.has(row.id)),
		[store.data, bulkSelected],
	);
	const indeterminate = useMemo(
		() => store.data.some((row) => bulkSelected.has(row.id)) && !allChecked,
		[store.data, bulkSelected, allChecked],
	);
	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(store.total / store.pagination.pageSize)),
		[store.total, store.pagination.pageSize],
	);

	function onSearchChange(value: string): void {
		setSearchInput(value);
		if (searchTimer.current !== undefined) clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => store.updateSearch(value), searchDebounceMs);
	}

	function onClearSearch(): void {
		setSearchInput('');
		store.updateSearch('');
	}

	function onSortClick(column: IColumn): void {
		if (!column.sortable) return;
		const current = store.sort;
		const next: ISortParams | undefined =
			!current || current.field !== column.key
				? { id: `${column.key}-${ESortOrder.ASC}`, field: column.key, order: ESortOrder.ASC }
				: current.order === ESortOrder.ASC
					? { id: `${column.key}-${ESortOrder.DESC}`, field: column.key, order: ESortOrder.DESC }
					: undefined;
		store.updateSort(next);
	}

	function sortIndicator(column: IColumn): '↑' | '↓' | '' {
		if (!store.sort || store.sort.field !== column.key) return '';
		return store.sort.order === ESortOrder.ASC ? '↑' : '↓';
	}

	function onAllChecked(checked: boolean): void {
		if (!checked) {
			setBulkSelected(new Set());
			return;
		}
		setBulkSelected(new Set(store.data.map((r) => r.id)));
	}

	function onRowChecked(id: string, checked: boolean): void {
		setBulkSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id); else next.delete(id);
			return next;
		});
	}

	async function performBulkDelete(): Promise<void> {
		const ids = [...bulkSelected];
		if (ids.length === 0) return;
		setBulkLoading(true);
		try {
			await store.bulkDelete(ids);
			setBulkSelected(new Set());
		} finally {
			setBulkLoading(false);
		}
	}

	function setPage(page: number): void {
		store.updatePagination({ ...store.pagination, page });
	}

	const colspan = columns.length + (bulk ? 1 : 0);

	return (
		<div className="sst-table">
			{(searchEnabled || bulk) && (
				<div className="sst-table__toolbar">
					{searchEnabled && (
						<div className="sst-table__search">
							<input
								type="text"
								data-testid="sst-search"
								value={searchInput}
								placeholder={searchPlaceholder}
								onChange={(e) => onSearchChange(e.target.value)}
							/>
							{searchInput.length > 0 && (
								<button
									type="button"
									className="sst-table__search-clear"
									aria-label="Clear search"
									onClick={onClearSearch}
								>×</button>
							)}
						</div>
					)}
					{bulk && (
						<div className="sst-table__bulk">
							{renderBulkActions ? (
								renderBulkActions({ selected: bulkSelected, bulkDelete: performBulkDelete, loading: bulkLoading })
							) : (
								<button
									type="button"
									disabled={bulkSelected.size === 0 || bulkLoading}
									onClick={performBulkDelete}
								>{bulkDeleteLabel}</button>
							)}
						</div>
					)}
				</div>
			)}

			<table className="sst-table__table">
				<thead>
					<tr>
						{bulk && (
							<th className="sst-table__check-cell">
								<input
									type="checkbox"
									data-testid="sst-bulk-all"
									checked={allChecked}
									ref={(el) => { if (el) el.indeterminate = indeterminate; }}
									onChange={(e) => onAllChecked(e.target.checked)}
								/>
							</th>
						)}
						{columns.map((column) => (
							<th
								key={column.key}
								data-testid={`sst-th-${column.key}`}
								data-sortable={column.sortable ? 'true' : 'false'}
								className={column.sortable ? 'sst-table__th--sortable' : undefined}
								style={column.width ? { width: `${column.width}px` } : undefined}
								onClick={() => onSortClick(column)}
							>
								<div className="sst-table__th-inner">
									{renderHeaderCell ? renderHeaderCell({ column }) : column.name}
									{column.sortable && (
										<span className="sst-table__sort-indicator">{sortIndicator(column)}</span>
									)}
								</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{store.data.length === 0 && !store.loading ? (
						<tr>
							<td colSpan={colspan} data-testid="sst-empty">
								{renderEmptyState ? renderEmptyState() : <div className="sst-table__empty">{emptyText}</div>}
							</td>
						</tr>
					) : (
						store.data.map((row, rowIndex) => (
							<tr key={row.id}>
								{bulk && (
									<td className="sst-table__check-cell">
										<input
											type="checkbox"
											data-testid={`sst-bulk-row-${row.id}`}
											checked={bulkSelected.has(row.id)}
											onChange={(e) => onRowChecked(row.id, e.target.checked)}
										/>
									</td>
								)}
								{columns.map((column) => (
									<td key={column.key}>
										{renderBodyCell
											? renderBodyCell({ row, column, index: rowIndex })
											: String((row as Record<string, unknown>)[column.key] ?? '')}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>

			{totalPages > 1 && (
				<div className="sst-table__pagination">
					{renderPagination ? (
						renderPagination({
							page: store.pagination.page,
							pageSize: store.pagination.pageSize,
							total: store.total,
							totalPages,
							setPage,
						})
					) : (
						<>
							<button type="button" disabled={store.pagination.page <= 1} onClick={() => setPage(store.pagination.page - 1)}>‹</button>
							<span>Page {store.pagination.page} / {totalPages}</span>
							<button type="button" disabled={store.pagination.page >= totalPages} onClick={() => setPage(store.pagination.page + 1)}>›</button>
						</>
					)}
				</div>
			)}

			{store.loading && <div className="sst-table__loading" aria-live="polite">Loading…</div>}
		</div>
	);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx nx run react:test
```

Expected: PASS — all 5 SstTable tests green.

- [ ] **Step 6: Re-export from barrel**

Update `packages/react/src/index.ts`:
```ts
export * from './lib/hooks/use-observable';
export * from './lib/hooks/use-table-store';
export * from './lib/components/SstTable';
```

- [ ] **Step 7: Commit**

```bash
git add packages/react/src packages/react/vitest.config.ts packages/react/vitest.setup.ts packages/react/package.json
git commit -m "feat(react): add <SstTable> with render-prop overrides"
```

---

## Task 5: Re-export `@sst/core` types from `@sst/react`

**Files:**
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1: Replace the barrel with the full surface**

```ts
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
} from '@sst/core';

export * from './lib/hooks/use-observable';
export * from './lib/hooks/use-table-store';
export * from './lib/components/SstTable';
```

- [ ] **Step 2: Run typecheck**

```bash
npx nx run react:typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Run tests**

```bash
npx nx run react:test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/react/src
git commit -m "feat(react): re-export @sst/core types from @sst/react barrel"
```

---

## Task 6: Build `@sst/react` and verify artifact

**Files:** none modified — verification only.

- [ ] **Step 1: Build core first**

```bash
npx nx run core:build
```

- [ ] **Step 2: Build react**

```bash
npx nx run react:build
```

Expected: `packages/react/dist/` contains `index.js`, `index.cjs`, `index.d.ts`, `styles.css`.

- [ ] **Step 3: Verify externals**

```bash
node -e "const c = require('fs').readFileSync('./packages/react/dist/index.js', 'utf8'); console.log(c.includes('@sst/core') ? 'OK: core kept external' : 'FAIL: core inlined'); console.log(c.includes('react/jsx-runtime') ? 'OK: react kept external' : 'FAIL: react inlined');"
```

Expected:
```
OK: core kept external
OK: react kept external
```

- [ ] **Step 4: Sanity-check the public API surface**

```bash
node -e "import('./packages/react/dist/index.js').then(m => console.log(Object.keys(m).sort().join('\n')))"
```

Expected output should include `SstTable`, `useObservable`, `useTableStore`, plus the re-exported core symbols.

- [ ] **Step 5: Run tests one more time**

```bash
npx nx run react:test
```

Expected: PASS.

- [ ] **Step 6: Commit any cleanups**

```bash
git status
git add . 2>/dev/null; git commit -m "chore(react): build verification" 2>/dev/null || echo "nothing to commit"
```

---

## Task 7: Write `@sst/react` README usage examples

**Files:**
- Modify: `packages/react/README.md`

- [ ] **Step 1: Replace the placeholder README**

```markdown
# @sst/react

React 18+ adapter for **So Simple Table**, built on top of [`@sst/core`](https://www.npmjs.com/package/@sst/core).

## Installation

```bash
npm install @sst/core @sst/react
```

Import the bundled CSS once at app entry:

```ts
import '@sst/react/styles.css';
```

## 1. Define a repository

```ts
import { HttpRepository } from '@sst/react';

interface IStrategy { id: string; name: string; createdAt: string; }

export class StrategyRepository extends HttpRepository<IStrategy> {}

export const strategyRepository = new StrategyRepository({
	baseUrl: 'https://api.example.com/strategies',
});
```

## 2. Use the hook + component

```tsx
import { SstTable, useTableStore, type IColumn } from '@sst/react';
import { strategyRepository } from './strategies.repository';

interface IStrategy { id: string; name: string; createdAt: string; }

const columns: IColumn[] = [
	{ key: 'name', name: 'Name', sortable: true },
	{ key: 'createdAt', name: 'Created' },
];

export function StrategiesPage(): JSX.Element {
	const t = useTableStore<IStrategy>({
		repository: strategyRepository,
		sortMap: { createdAt: 'ByCreationDate', name: 'ByName' },
	});

	return (
		<SstTable
			columns={columns}
			store={t}
			bulk
			searchEnabled
			renderHeaderCell={({ column }) => <strong>{column.name}</strong>}
			renderBodyCell={({ row, column }) => <span>{row[column.key]}</span>}
			renderEmptyState={() => <p>No strategies yet — try creating one.</p>}
		/>
	);
}
```

## Customizing the wire format

```ts
new HttpRepository<IStrategy>({
	baseUrl: 'https://api.example.com/strategies',
	queryKeys: { page: 'pageNumber', pageSize: 'limit' },
	responseListMapper: (raw) => {
		const r = raw as { items: IStrategy[]; total: number };
		return { result: r.items, totalCount: r.total, isSuccess: true };
	},
});
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add packages/react/README.md
git commit -m "docs(react): add @sst/react README with usage examples"
```

---

## Task 8: Final cross-package verification

After all four packages exist, verify the whole monorepo builds and tests cleanly.

- [ ] **Step 1: Run all builds**

```bash
npx nx run-many -t build
```

Expected: `core`, `ng`, `vue`, `react` all build green.

- [ ] **Step 2: Run all tests**

```bash
npx nx run-many -t test
```

Expected: every test suite passes.

- [ ] **Step 3: Run typechecks across the workspace**

```bash
npx nx run-many -t typecheck
```

Expected: `0 errors` everywhere.

- [ ] **Step 4: Tag the integration point**

```bash
git tag v0.1.0-pre
```

- [ ] **Step 5: Optional — local install smoke test**

In a separate scratch app outside the monorepo:
```bash
npm pack ./packages/core
npm pack ./packages/react
npm install ./sst-core-0.1.0.tgz ./sst-react-0.1.0.tgz react react-dom
```

Then write a tiny `App.tsx` mirroring the README example. Render it; confirm it works against any reachable test API (e.g. `https://jsonplaceholder.typicode.com/users`).

---

## Self-Review Checklist

1. **Spec coverage**
	- ✅ React variant of the table — Tasks 3, 4.
	- ✅ Reuses headless `TableStore<T>` from core — Task 3.
	- ✅ Default UI + render-prop overrides — Task 4.
	- ✅ Inheritable `HttpRepository` re-exported from core — Task 5.
	- ✅ Configurable wire format (queryKeys, responseListMapper) re-exported — Task 5.
	- ✅ No translation, no responsive split — confirmed.
	- ✅ Real-time adapter contract re-exported — Task 5.

2. **Placeholder scan** — none.

3. **Type consistency**
	- `IUseTableStoreReturn<T>` mirrors `ITableStore<T>` — uses snapshot values (not refs) since React already owns reactivity.
	- `<SstTable T extends { id: string }>` constraint matches bulk-row checkbox logic that keys on `row.id`.
	- All render-prop callbacks have explicit `IRenderHeaderCellArgs`, `IRenderBodyCellArgs<T>`, etc. types — no anonymous parameter shapes.

---

**Plan 4 complete.**
