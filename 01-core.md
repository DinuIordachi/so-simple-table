# So Simple Table — Core (`@bridgebyte/sst-core`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the existing `np-table` logic from `platform/libs/ngx-oppo` into a framework-agnostic, dependency-free TypeScript library that exposes reactive table state and a configurable Repository chain. This package is the foundation that the Angular, Vue, and React variants depend on.

**Architecture:**
- Pure TypeScript, zero runtime dependencies. Reactivity is handled by a tiny in-house `Observable<T>` (~80 LOC) with `get()`/`set()`/`subscribe()` semantics — replaces RxJS `BehaviorSubject`.
- Repository chain mirrors the current Angular code: `ListRepository → SelectRepository → Repository`, plus their `Http*` variants. HTTP is delegated to a pluggable `IHttpClient` adapter; `FetchHttpClient` is the default.
- `TableStore<T>` consumes a `ListRepository<T>`, owns reactive state (data, total, loading, pagination, sort, filters, search), and auto-refreshes whenever query state changes. All query keys (`page`/`pageSize`/`orderBy`/`orderByDescending`), the response shape, and filter/sort param formatting are configurable. `baseUrl` is mandatory.
- `IRealtimeAdapter<T>` interface is defined now; concrete adapters land later.

**Tech Stack:** TypeScript 5.6+, Vitest (testing), tsup (bundling), Nx (monorepo orchestrator) + npm workspaces. ESM-first with CJS fallback. Node 20+ for development.

**Plans in this series:**
1. **`@bridgebyte/sst-core`** ← this file
2. `@bridgebyte/sst-ng` (Angular variant) — `02-angular.md`
3. `@bridgebyte/sst-vue` (Vue 3 variant) — `03-vue.md`
4. `@bridgebyte/sst-react` (React variant) — `04-react.md`

---

## Prerequisites

- Node.js 20+ and npm 10+ installed.
- A clean working directory **outside** the existing `platform/` repository where you want the new monorepo to live (e.g., `~/projects/so-simple-table/`). Throughout this plan, that path is referred to as `<repo-root>`. All shell commands run from `<repo-root>` unless otherwise stated.
- Git installed and configured.

## File Structure

The monorepo layout established by this plan:

```
<repo-root>/
├── nx.json
├── package.json                       # workspace root, "workspaces": ["packages/*"]
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── .editorconfig
├── README.md
└── packages/
    └── core/
        ├── package.json               # name: "@bridgebyte/sst-core", type: "module"
        ├── tsconfig.json
        ├── tsconfig.build.json
        ├── tsup.config.ts
        ├── vitest.config.ts
        ├── README.md
        └── src/
            ├── index.ts               # barrel — re-exports public API
            ├── types/
            │   ├── index.ts
            │   ├── base-item.ts        # IBaseItem
            │   ├── pagination.ts       # IPaginationParams
            │   ├── sort.ts             # ISortParams, ESortOrder
            │   ├── filter.ts           # IFilterParams
            │   ├── column.ts           # IColumn, IColumnFilterOption
            │   ├── response.ts         # IResponse, IResponseList
            │   ├── http-client.ts      # IHttpClient, IHttpRequestOptions
            │   ├── repository-config.ts # IRepositoryConfig + defaults
            │   ├── table-store.ts      # ITableStore (public contract)
            │   └── realtime-adapter.ts # IRealtimeAdapter
            ├── state/
            │   ├── observable.ts       # Observable<T>
            │   ├── observable.test.ts
            │   ├── watch.ts            # watch(observables, cb)
            │   └── watch.test.ts
            ├── http/
            │   ├── fetch-http-client.ts
            │   └── fetch-http-client.test.ts
            ├── repositories/
            │   ├── list.repository.ts
            │   ├── select.repository.ts
            │   ├── repository.ts
            │   ├── http-list.repository.ts
            │   ├── http-list.repository.test.ts
            │   ├── http-select.repository.ts
            │   ├── http-select.repository.test.ts
            │   ├── http-repository.ts
            │   └── http-repository.test.ts
            ├── store/
            │   ├── table-store.ts
            │   ├── table-store.test.ts
            │   └── map-table-params.ts
            │   └── map-table-params.test.ts
            └── utils/
                ├── deep-equal.ts
                ├── deep-equal.test.ts
                └── array-to-map.ts
```

**Why this split:** types are isolated so framework variants can re-export them without dragging implementation. `state/` is the headless reactive primitive (used by every variant). `repositories/` and `store/` are the consumable building blocks. `http/` is swappable. Tests live next to source for locality.

---

## Task 1: Bootstrap monorepo

**Files:**
- Create: `<repo-root>/package.json`
- Create: `<repo-root>/nx.json`
- Create: `<repo-root>/tsconfig.base.json`
- Create: `<repo-root>/.gitignore`
- Create: `<repo-root>/.editorconfig`
- Create: `<repo-root>/.prettierrc`
- Create: `<repo-root>/README.md`

- [ ] **Step 1: Initialize git and a bare workspace**

```bash
mkdir so-simple-table && cd so-simple-table
git init
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "so-simple-table",
  "private": true,
  "version": "0.0.0",
  "description": "So Simple Table — framework-agnostic table library with pluggable framework variants.",
  "workspaces": ["packages/*"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "nx run-many -t build",
    "test": "nx run-many -t test",
    "lint": "nx run-many -t lint",
    "typecheck": "nx run-many -t typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,vue,html,scss,md,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,vue,html,scss,md,json}\""
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "nx": "^19.5.0",
    "prettier": "^3.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create `nx.json`**

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": [
      "default",
      "!{projectRoot}/**/*.test.ts",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/vitest.config.ts",
      "!{projectRoot}/jest.config.ts"
    ]
  },
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production"]
    },
    "lint": { "cache": true },
    "typecheck": { "cache": true, "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,
    "paths": {
      "@bridgebyte/sst-core": ["packages/core/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "**/dist", "**/coverage"]
}
```

- [ ] **Step 5: Create `.gitignore`, `.editorconfig`, `.prettierrc`**

`.gitignore`:
```
node_modules
dist
coverage
.nx/cache
.nx/workspace-data
*.tgz
*.log
.DS_Store
.env
.env.local
```

`.editorconfig`:
```
root = true
[*]
indent_style = tab
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
[*.{json,md,yml}]
indent_style = space
indent_size = 2
```

`.prettierrc`:
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "useTabs": true,
  "tabWidth": 4,
  "printWidth": 120,
  "overrides": [
    { "files": "*.{json,md,yml}", "options": { "useTabs": false, "tabWidth": 2 } },
    { "files": "*.scss", "options": { "singleQuote": false } }
  ]
}
```

- [ ] **Step 6: Install root dependencies**

```bash
npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 7: Verify Nx is wired**

```bash
npx nx --version
```

Expected: prints Nx version (>= 19).

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: bootstrap so-simple-table monorepo (npm + nx)"
```

---

## Task 2: Scaffold `@bridgebyte/sst-core` package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsconfig.build.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/project.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/README.md`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@bridgebyte/sst-core",
  "version": "0.1.0",
  "description": "So Simple Table — framework-agnostic core: reactive table state and configurable repositories.",
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
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint src --ext .ts",
    "clean": "rm -rf dist coverage"
  },
  "devDependencies": {
    "tsup": "^8.2.0",
    "vitest": "^2.0.0"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`** (dev/test config)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `packages/core/tsconfig.build.json`** (build excludes tests)

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	clean: true,
	target: 'es2022',
	tsconfig: './tsconfig.build.json',
	splitting: false,
	treeshake: true,
});
```

- [ ] **Step 5: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
		},
	},
});
```

- [ ] **Step 6: Create `packages/core/project.json`** (Nx target wiring)

```json
{
  "name": "core",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/core/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{projectRoot}/dist"]
    },
    "test": { "executor": "nx:run-script", "options": { "script": "test" } },
    "lint": { "executor": "nx:run-script", "options": { "script": "lint" } },
    "typecheck": { "executor": "nx:run-script", "options": { "script": "typecheck" } }
  }
}
```

- [ ] **Step 7: Create empty barrel `packages/core/src/index.ts`**

```ts
// @bridgebyte/sst-core public API — populated by subsequent tasks.
export {};
```

- [ ] **Step 8: Create `packages/core/README.md`**

```markdown
# @bridgebyte/sst-core

Framework-agnostic core for So Simple Table. Provides:

- `Observable<T>` — tiny reactive primitive (no RxJS).
- `TableStore<T>` — reactive table state (data, total, loading, pagination, sort, filters, search).
- `Repository` chain — `ListRepository`, `SelectRepository`, `Repository` with HTTP variants.
- `IHttpClient` adapter with default `FetchHttpClient`.

See per-framework variants `@bridgebyte/sst-ng`, `@bridgebyte/sst-vue`, `@bridgebyte/sst-react`.
```

- [ ] **Step 9: Install workspace dependencies**

From `<repo-root>`:
```bash
npm install --workspace @bridgebyte/sst-core
```

Expected: `packages/core/node_modules/.bin/` contains `tsup`, `vitest`.

- [ ] **Step 10: Verify scaffolding**

```bash
npx nx run core:typecheck
```

Expected: `0 errors`.

- [ ] **Step 11: Commit**

```bash
git add packages/core
git commit -m "feat(core): scaffold @bridgebyte/sst-core package"
```

---

## Task 3: Define base types

**Files:**
- Create: `packages/core/src/types/base-item.ts`
- Create: `packages/core/src/types/pagination.ts`
- Create: `packages/core/src/types/response.ts`
- Create: `packages/core/src/types/sort.ts`
- Create: `packages/core/src/types/filter.ts`
- Create: `packages/core/src/types/column.ts`
- Create: `packages/core/src/types/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write `base-item.ts`**

```ts
export interface IBaseItem {
	id: string;
	name?: string | null;
}
```

- [ ] **Step 2: Write `pagination.ts`**

```ts
export interface IPaginationParams {
	readonly page: number;
	readonly pageSize: number;
}
```

- [ ] **Step 3: Write `response.ts`**

Mirror the existing shape but stripped of unused fields (`status`, `name`, etc.) — those were app-specific.

```ts
export interface IResponseError {
	readonly errorCode: string;
	readonly message: string;
	readonly exceptionType?: string;
}

export interface IResponse<T> {
	readonly result: T;
	readonly isSuccess: boolean;
	readonly errors?: readonly IResponseError[];
	readonly message?: string;
}

export interface IResponseList<T> extends IResponse<T> {
	readonly totalCount: number;
}
```

- [ ] **Step 4: Write `sort.ts`**

```ts
export enum ESortOrder {
	ASC = 'ASC',
	DESC = 'DESC',
}

export interface ISortParams {
	readonly id: string;
	readonly field: string;
	readonly order: ESortOrder;
}
```

- [ ] **Step 5: Write `filter.ts`**

```ts
export interface IFilterParams {
	readonly key: string;
	readonly value: string;
}
```

- [ ] **Step 6: Write `column.ts`**

Extracted from `np-table.types.ts`, decoupled from `NzTableFilterList` (replaced by an in-house filter option type) and `SymbolList` (dropped — app-specific).

```ts
export interface IColumnFilterOption {
	readonly text: string;
	readonly value: string;
}

export interface IColumn {
	readonly name: string;
	readonly key: string;
	readonly width?: number;
	readonly render?: boolean;
	readonly sortable?: boolean;
	readonly columnTooltip?: string;
	readonly showCellTooltip?: boolean;
	readonly filters?: readonly IColumnFilterOption[];
	readonly filterMultiple?: boolean;
	readonly cutString?: boolean;
	readonly search?: {
		readonly placeholder: string;
		readonly pattern?: RegExp;
		readonly errorMessage?: string;
	};
}
```

- [ ] **Step 7: Write `types/index.ts`**

```ts
export * from './base-item';
export * from './pagination';
export * from './response';
export * from './sort';
export * from './filter';
export * from './column';
```

- [ ] **Step 8: Re-export from package barrel**

Update `packages/core/src/index.ts`:
```ts
export * from './types';
```

- [ ] **Step 9: Run typecheck**

```bash
npx nx run core:typecheck
```

Expected: `0 errors`.

- [ ] **Step 10: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): add base types (column, sort, filter, pagination, response)"
```

---

## Task 4: Implement `Observable<T>`

**Files:**
- Create: `packages/core/src/state/observable.ts`
- Create: `packages/core/src/state/observable.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/core/src/state/observable.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { Observable } from './observable';

describe('Observable', () => {
	it('returns the initial value via get()', () => {
		const o = new Observable<number>(7);
		expect(o.get()).toBe(7);
	});

	it('emits the current value to a subscriber by default', () => {
		const o = new Observable<string>('a');
		const listener = vi.fn();
		o.subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith('a', 'a');
	});

	it('skips initial emission when emitOnSubscribe is false', () => {
		const o = new Observable<number>(0);
		const listener = vi.fn();
		o.subscribe(listener, { emitOnSubscribe: false });
		expect(listener).not.toHaveBeenCalled();
	});

	it('notifies all subscribers when value changes', () => {
		const o = new Observable<number>(0);
		const a = vi.fn();
		const b = vi.fn();
		o.subscribe(a, { emitOnSubscribe: false });
		o.subscribe(b, { emitOnSubscribe: false });
		o.set(1);
		expect(a).toHaveBeenCalledWith(1, 0);
		expect(b).toHaveBeenCalledWith(1, 0);
	});

	it('does not notify when set() is called with the same value (Object.is)', () => {
		const o = new Observable<number>(5);
		const listener = vi.fn();
		o.subscribe(listener, { emitOnSubscribe: false });
		o.set(5);
		expect(listener).not.toHaveBeenCalled();
	});

	it('treats NaN === NaN as equal (Object.is)', () => {
		const o = new Observable<number>(NaN);
		const listener = vi.fn();
		o.subscribe(listener, { emitOnSubscribe: false });
		o.set(NaN);
		expect(listener).not.toHaveBeenCalled();
	});

	it('returns an unsubscribe function that removes the listener', () => {
		const o = new Observable<number>(0);
		const listener = vi.fn();
		const unsubscribe = o.subscribe(listener, { emitOnSubscribe: false });
		unsubscribe();
		o.set(1);
		expect(listener).not.toHaveBeenCalled();
	});

	it('isolates listeners — removing one does not affect the others', () => {
		const o = new Observable<number>(0);
		const keep = vi.fn();
		const remove = vi.fn();
		o.subscribe(keep, { emitOnSubscribe: false });
		const off = o.subscribe(remove, { emitOnSubscribe: false });
		off();
		o.set(1);
		expect(keep).toHaveBeenCalledTimes(1);
		expect(remove).not.toHaveBeenCalled();
	});

	it('snapshots subscribers at notify time so unsubscribing during emit is safe', () => {
		const o = new Observable<number>(0);
		const a = vi.fn(() => off());
		const b = vi.fn();
		const off = o.subscribe(a, { emitOnSubscribe: false });
		o.subscribe(b, { emitOnSubscribe: false });
		expect(() => o.set(1)).not.toThrow();
		expect(b).toHaveBeenCalledWith(1, 0);
	});

	it('provides a readonly view via asReadonly()', () => {
		const o = new Observable<number>(3);
		const ro = o.asReadonly();
		expect(ro.get()).toBe(3);
		const listener = vi.fn();
		ro.subscribe(listener, { emitOnSubscribe: false });
		o.set(4);
		expect(listener).toHaveBeenCalledWith(4, 3);
		// @ts-expect-error — readonly view must not expose set
		expect((ro as { set?: unknown }).set).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module `./observable` not found.

- [ ] **Step 3: Write `observable.ts`**

```ts
export type Listener<T> = (value: T, previous: T) => void;
export type Unsubscribe = () => void;

export interface ISubscribeOptions {
	readonly emitOnSubscribe?: boolean;
}

export interface IReadonlyObservable<T> {
	get(): T;
	subscribe(listener: Listener<T>, options?: ISubscribeOptions): Unsubscribe;
}

export class Observable<T> implements IReadonlyObservable<T> {
	private _value: T;
	private readonly _listeners = new Set<Listener<T>>();

	public constructor(initial: T) {
		this._value = initial;
	}

	public get(): T {
		return this._value;
	}

	public set(next: T): void {
		if (Object.is(this._value, next)) {
			return;
		}
		const prev = this._value;
		this._value = next;
		// Snapshot listeners so unsubscribing during a notify does not skip subsequent ones.
		for (const listener of [...this._listeners]) {
			listener(next, prev);
		}
	}

	public subscribe(listener: Listener<T>, options: ISubscribeOptions = {}): Unsubscribe {
		this._listeners.add(listener);
		if (options.emitOnSubscribe ?? true) {
			listener(this._value, this._value);
		}
		return () => {
			this._listeners.delete(listener);
		};
	}

	public asReadonly(): IReadonlyObservable<T> {
		return {
			get: () => this._value,
			subscribe: (listener, options) => this.subscribe(listener, options),
		};
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 10 Observable tests green.

- [ ] **Step 5: Re-export from package barrel**

Add to `packages/core/src/index.ts`:
```ts
export * from './state/observable';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): add Observable<T> reactive primitive with tests"
```

---

## Task 5: Implement `watch()` helper

`watch()` subscribes to N observables and fires a callback when any change, debounced to a microtask so multiple synchronous updates collapse into one fetch (replaces the existing `combineLatest + auditTime(0)` pattern).

**Files:**
- Create: `packages/core/src/state/watch.ts`
- Create: `packages/core/src/state/watch.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { Observable } from './observable';
import { watch } from './watch';

describe('watch', () => {
	it('does not fire on subscribe (skipInitial behavior is implicit)', async () => {
		const a = new Observable<number>(0);
		const b = new Observable<number>(0);
		const cb = vi.fn();
		watch([a, b], cb);
		await Promise.resolve();
		expect(cb).not.toHaveBeenCalled();
	});

	it('fires once when an observable changes', async () => {
		const a = new Observable<number>(0);
		const cb = vi.fn();
		watch([a], cb);
		a.set(1);
		await Promise.resolve();
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('coalesces synchronous updates into a single microtask call', async () => {
		const a = new Observable<number>(0);
		const b = new Observable<number>(0);
		const cb = vi.fn();
		watch([a, b], cb);
		a.set(1);
		a.set(2);
		b.set(7);
		expect(cb).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('returns an unsubscribe that detaches all listeners', async () => {
		const a = new Observable<number>(0);
		const cb = vi.fn();
		const off = watch([a], cb);
		off();
		a.set(1);
		await Promise.resolve();
		expect(cb).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module `./watch` not found.

- [ ] **Step 3: Implement `watch.ts`**

```ts
import type { IReadonlyObservable, Unsubscribe } from './observable';

export function watch(
	observables: ReadonlyArray<IReadonlyObservable<unknown>>,
	callback: () => void,
): Unsubscribe {
	let scheduled = false;
	const trigger = (): void => {
		if (scheduled) {
			return;
		}
		scheduled = true;
		queueMicrotask(() => {
			scheduled = false;
			callback();
		});
	};
	const unsubs = observables.map((o) => o.subscribe(trigger, { emitOnSubscribe: false }));
	return () => unsubs.forEach((u) => u());
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 4 watch tests green.

- [ ] **Step 5: Re-export from barrel**

Add to `packages/core/src/index.ts`:
```ts
export * from './state/watch';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/state packages/core/src/index.ts
git commit -m "feat(core): add watch() helper for coalesced multi-observable subscriptions"
```

---

## Task 6: Implement utility helpers (`deep-equal`, `array-to-map`)

The `TableStore` needs deep equality (replaces the lodash `isEqual` and the existing `core.isDeepEqual`) and an `arrayToMap` utility (mirrors the existing private one).

**Files:**
- Create: `packages/core/src/utils/deep-equal.ts`
- Create: `packages/core/src/utils/deep-equal.test.ts`
- Create: `packages/core/src/utils/array-to-map.ts`

- [ ] **Step 1: Write failing tests for `deep-equal`**

```ts
import { describe, it, expect } from 'vitest';
import { deepEqual } from './deep-equal';

describe('deepEqual', () => {
	it('returns true for primitives equal under Object.is', () => {
		expect(deepEqual(1, 1)).toBe(true);
		expect(deepEqual('a', 'a')).toBe(true);
		expect(deepEqual(null, null)).toBe(true);
		expect(deepEqual(undefined, undefined)).toBe(true);
		expect(deepEqual(NaN, NaN)).toBe(true);
	});

	it('returns false for differing primitives', () => {
		expect(deepEqual(1, 2)).toBe(false);
		expect(deepEqual('a', 'b')).toBe(false);
		expect(deepEqual(null, undefined)).toBe(false);
	});

	it('compares arrays by length and element-wise', () => {
		expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
		expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
	});

	it('compares plain objects by enumerable own keys', () => {
		expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
		expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
		expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
	});

	it('compares nested structures', () => {
		expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
		expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
	});

	it('returns false when one side is null/undefined and the other is not', () => {
		expect(deepEqual(null, {})).toBe(false);
		expect(deepEqual([], null)).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `deep-equal.ts`**

```ts
export function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
		return false;
	}
	if (Array.isArray(a) !== Array.isArray(b)) {
		return false;
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return false;
		}
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) {
				return false;
			}
		}
		return true;
	}
	const aKeys = Object.keys(a as object);
	const bKeys = Object.keys(b as object);
	if (aKeys.length !== bKeys.length) {
		return false;
	}
	for (const key of aKeys) {
		if (!Object.prototype.hasOwnProperty.call(b, key)) {
			return false;
		}
		if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
			return false;
		}
	}
	return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS.

- [ ] **Step 5: Implement `array-to-map.ts`** (no test — pure typed utility, exercised via store tests later)

```ts
export function arrayToMap<T, K extends keyof T>(items: readonly T[], key: K): Record<string, T> {
	const out: Record<string, T> = {};
	for (const item of items) {
		out[String(item[key])] = item;
	}
	return out;
}
```

- [ ] **Step 6: Re-export from barrel**

Add to `packages/core/src/index.ts`:
```ts
export * from './utils/deep-equal';
export * from './utils/array-to-map';
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): add deepEqual and arrayToMap utilities"
```

---

## Task 7: Define HTTP, repository-config, table-store, and realtime-adapter contracts

Pure type files — no runtime, no tests.

**Files:**
- Create: `packages/core/src/types/http-client.ts`
- Create: `packages/core/src/types/repository-config.ts`
- Create: `packages/core/src/types/table-store.ts`
- Create: `packages/core/src/types/realtime-adapter.ts`
- Modify: `packages/core/src/types/index.ts`

- [ ] **Step 1: Write `http-client.ts`**

```ts
export type HttpQueryParams = Record<string, string | number | boolean | ReadonlyArray<string | number | boolean> | undefined>;

export interface IHttpRequestOptions {
	readonly params?: HttpQueryParams;
	readonly headers?: Record<string, string>;
	readonly body?: unknown;
	readonly signal?: AbortSignal;
}

export interface IHttpClient {
	get<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	post<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	put<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
	delete<T>(url: string, options?: IHttpRequestOptions): Promise<T>;
}
```

- [ ] **Step 2: Write `repository-config.ts`**

```ts
import type { IHttpClient } from './http-client';
import type { IResponseList } from './response';

export interface IRepositoryQueryKeys {
	readonly page: string;
	readonly pageSize: string;
	readonly orderBy: string;
	readonly orderByDescending: string;
	readonly search: string;
}

/**
 * Strategy used by the table store to format filters and sort fields
 * into the outgoing query params object.
 */
export interface IParamFormattingStrategy {
	/**
	 * Format a filter into a (key, value) pair appended to query params.
	 * Default: `{ [filter.key]: [...existingValues, filter.value] }`.
	 */
	readonly formatFilter?: (filter: { key: string; value: string }, existing: unknown) => unknown;
	/**
	 * Format a sort field name into the value sent for the `orderBy` key.
	 * Default: pass-through.
	 */
	readonly formatSortField?: (field: string) => string;
}

/**
 * Maps a raw HTTP payload to the canonical IResponseList shape.
 * Default: assumes the payload already matches `IResponseList<T[]>`.
 */
export type ResponseListMapper<T> = (raw: unknown) => IResponseList<T[]>;

export interface IRepositoryConfig<T = unknown> {
	/** Required. Base URL for all repository requests, e.g. `https://api.example.com/users`. */
	readonly baseUrl: string;
	readonly httpClient?: IHttpClient;
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	readonly paramFormatting?: IParamFormattingStrategy;
	readonly responseListMapper?: ResponseListMapper<T>;
}

export const DEFAULT_QUERY_KEYS: IRepositoryQueryKeys = {
	page: 'page',
	pageSize: 'pageSize',
	orderBy: 'orderBy',
	orderByDescending: 'orderByDescending',
	search: 'name',
};
```

- [ ] **Step 3: Write `table-store.ts`** (public contract — what every framework adapter consumes)

```ts
import type { IReadonlyObservable } from '../state/observable';
import type { IFilterParams } from './filter';
import type { IPaginationParams } from './pagination';
import type { IResponse } from './response';
import type { ISortParams } from './sort';

export interface ITableStore<T> {
	readonly data$: IReadonlyObservable<readonly T[]>;
	readonly total$: IReadonlyObservable<number>;
	readonly loading$: IReadonlyObservable<boolean>;
	readonly pagination$: IReadonlyObservable<IPaginationParams>;
	readonly sort$: IReadonlyObservable<ISortParams | undefined>;
	readonly filters$: IReadonlyObservable<readonly IFilterParams[]>;
	readonly search$: IReadonlyObservable<string>;

	getData(
		pagination: IPaginationParams,
		sort?: ISortParams,
		filters?: readonly IFilterParams[],
		search?: string,
	): void;

	bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
	refresh(): void;
	reset(): void;

	updateData(data: readonly T[]): void;
	updateTotal(total: number): void;
	updateLoading(loading: boolean): void;
	updatePagination(pagination: IPaginationParams): void;
	updateSort(sort: ISortParams | undefined): void;
	updateFilter(filters: readonly IFilterParams[]): void;
	updateSearch(search: string): void;

	destroy(): void;
}
```

- [ ] **Step 4: Write `realtime-adapter.ts`** (placeholder contract for future implementations)

```ts
import type { ITableStore } from './table-store';
import type { Unsubscribe } from '../state/observable';

/**
 * Connects a real-time data source (WebSocket, SSE, etc.) to a table store.
 * Implementations are intentionally out of scope for the core package — this
 * interface only locks in the contract so plugins can be added without churn.
 */
export interface IRealtimeAdapter<T> {
	connect(store: ITableStore<T>): Unsubscribe;
}
```

- [ ] **Step 5: Update `types/index.ts`**

```ts
export * from './base-item';
export * from './pagination';
export * from './response';
export * from './sort';
export * from './filter';
export * from './column';
export * from './http-client';
export * from './repository-config';
export * from './table-store';
export * from './realtime-adapter';
```

- [ ] **Step 6: Run typecheck**

```bash
npx nx run core:typecheck
```

Expected: `0 errors`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/types
git commit -m "feat(core): define http-client, repository-config, table-store, realtime-adapter contracts"
```

---

## Task 8: Implement `FetchHttpClient`

Default `IHttpClient` implementation backed by the standard `fetch` API.

**Files:**
- Create: `packages/core/src/http/fetch-http-client.ts`
- Create: `packages/core/src/http/fetch-http-client.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FetchHttpClient } from './fetch-http-client';

describe('FetchHttpClient', () => {
	const originalFetch = globalThis.fetch;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		globalThis.fetch = mockFetch as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
		return new Response(JSON.stringify(body), {
			...init,
			headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
		});
	}

	it('issues a GET request with serialized scalar query params', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		const result = await client.get<{ ok: boolean }>('https://api.test/items', {
			params: { page: 1, pageSize: 10, includeArchived: false },
		});
		expect(result).toEqual({ ok: true });
		const [url, init] = mockFetch.mock.calls[0]!;
		expect(url).toBe('https://api.test/items?page=1&pageSize=10&includeArchived=false');
		expect((init as RequestInit).method).toBe('GET');
	});

	it('repeats array params per value', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.get('https://api.test/items', {
			params: { ids: ['a', 'b', 'c'] },
		});
		const [url] = mockFetch.mock.calls[0]!;
		expect(url).toBe('https://api.test/items?ids=a&ids=b&ids=c');
	});

	it('omits undefined query param values', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.get('https://api.test/items', {
			params: { page: 1, search: undefined },
		});
		const [url] = mockFetch.mock.calls[0]!;
		expect(url).toBe('https://api.test/items?page=1');
	});

	it('serializes JSON bodies for POST/PUT and sets content-type', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.post('https://api.test/items', { body: { name: 'x' } });
		const [, init] = mockFetch.mock.calls[0]!;
		expect((init as RequestInit).method).toBe('POST');
		expect((init as RequestInit).body).toBe(JSON.stringify({ name: 'x' }));
		expect(((init as RequestInit).headers as Record<string, string>)['content-type']).toBe('application/json');
	});

	it('sends DELETE with body when provided', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		await client.delete('https://api.test/items', { body: ['a', 'b'] });
		const [, init] = mockFetch.mock.calls[0]!;
		expect((init as RequestInit).method).toBe('DELETE');
		expect((init as RequestInit).body).toBe(JSON.stringify(['a', 'b']));
	});

	it('returns null when the response has 204 No Content', async () => {
		mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
		const client = new FetchHttpClient();
		const result = await client.delete<unknown>('https://api.test/items/1');
		expect(result).toBeNull();
	});

	it('throws an Error containing the status when the response is not ok', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ message: 'nope' }, { status: 500 }));
		const client = new FetchHttpClient();
		await expect(client.get('https://api.test/items')).rejects.toThrow(/500/);
	});

	it('forwards an AbortSignal to fetch', async () => {
		mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
		const client = new FetchHttpClient();
		const controller = new AbortController();
		await client.get('https://api.test/items', { signal: controller.signal });
		const [, init] = mockFetch.mock.calls[0]!;
		expect((init as RequestInit).signal).toBe(controller.signal);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `fetch-http-client.ts`**

```ts
import type { IHttpClient, IHttpRequestOptions, HttpQueryParams } from '../types/http-client';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface IFetchHttpClientOptions {
	readonly baseHeaders?: Record<string, string>;
}

export class FetchHttpClient implements IHttpClient {
	public constructor(private readonly options: IFetchHttpClientOptions = {}) {}

	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('GET', url, options);
	}

	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('POST', url, options);
	}

	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('PUT', url, options);
	}

	public delete<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return this.request<T>('DELETE', url, options);
	}

	private async request<T>(method: Method, url: string, options: IHttpRequestOptions = {}): Promise<T> {
		const fullUrl = this.appendQueryString(url, options.params);
		const headers: Record<string, string> = { ...(this.options.baseHeaders ?? {}), ...(options.headers ?? {}) };
		const init: RequestInit = { method, headers, signal: options.signal };
		if (options.body !== undefined) {
			init.body = JSON.stringify(options.body);
			if (!('content-type' in headers) && !('Content-Type' in headers)) {
				headers['content-type'] = 'application/json';
			}
		}
		const response = await fetch(fullUrl, init);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText} for ${method} ${fullUrl}`);
		}
		if (response.status === 204) {
			return null as T;
		}
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			return (await response.json()) as T;
		}
		return (await response.text()) as unknown as T;
	}

	private appendQueryString(url: string, params: HttpQueryParams | undefined): string {
		if (!params) {
			return url;
		}
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) continue;
			if (Array.isArray(value)) {
				for (const v of value) search.append(key, String(v));
			} else {
				search.append(key, String(value));
			}
		}
		const qs = search.toString();
		if (!qs) {
			return url;
		}
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}${qs}`;
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 8 fetch tests green.

- [ ] **Step 5: Re-export from barrel**

Add to `packages/core/src/index.ts`:
```ts
export * from './http/fetch-http-client';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src
git commit -m "feat(core): add FetchHttpClient default IHttpClient implementation"
```

---

## Task 9: Abstract `ListRepository`

**Files:**
- Create: `packages/core/src/repositories/list.repository.ts`

- [ ] **Step 1: Write `list.repository.ts`**

No tests for an abstract base. Tests live with the HTTP variant in Task 10.

```ts
import type { HttpQueryParams } from '../types/http-client';
import type { IResponse, IResponseList } from '../types/response';

export abstract class ListRepository<T> {
	public abstract getList(params?: HttpQueryParams): Promise<IResponseList<T[]>>;
	public abstract bulkDelete(ids: readonly string[]): Promise<IResponse<string>>;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx nx run core:typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Re-export and commit**

Add to `packages/core/src/index.ts`:
```ts
export * from './repositories/list.repository';
```

```bash
git add packages/core/src
git commit -m "feat(core): add abstract ListRepository<T>"
```

---

## Task 10: `HttpListRepository` with configurable response mapper

**Files:**
- Create: `packages/core/src/repositories/http-list.repository.ts`
- Create: `packages/core/src/repositories/http-list.repository.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import type { IHttpClient } from '../types/http-client';
import type { IResponseList } from '../types/response';
import { HttpListRepository } from './http-list.repository';

interface IItem {
	id: string;
	name: string;
}

class TestRepository extends HttpListRepository<IItem> {}

function makeClient(impl: Partial<IHttpClient>): IHttpClient {
	return {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		...impl,
	} as IHttpClient;
}

describe('HttpListRepository', () => {
	it('throws if instantiated without baseUrl', () => {
		expect(() => new TestRepository({ baseUrl: '' })).toThrow(/baseUrl/);
	});

	it('uses FetchHttpClient by default when none is provided', () => {
		const repo = new TestRepository({ baseUrl: 'https://api.test/items' });
		expect(repo).toBeInstanceOf(HttpListRepository);
	});

	it('getList() calls httpClient.get with baseUrl and params', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.getList({ page: 2 });
		expect(client.get).toHaveBeenCalledWith('https://api.test/items', { params: { page: 2 } });
	});

	it('getList() applies a custom responseListMapper', async () => {
		const raw = { items: [{ id: '1', name: 'a' }], total: 1 };
		const client = makeClient({ get: vi.fn().mockResolvedValue(raw) });
		const mapper = (r: unknown): IResponseList<IItem[]> => {
			const obj = r as { items: IItem[]; total: number };
			return { result: obj.items, totalCount: obj.total, isSuccess: true };
		};
		const repo = new TestRepository({
			baseUrl: 'https://api.test/items',
			httpClient: client,
			responseListMapper: mapper,
		});
		const out = await repo.getList();
		expect(out).toStrictEqual({ result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true });
	});

	it('bulkDelete() issues DELETE to {baseUrl}/bulk_delete with the ids body', async () => {
		const client = makeClient({
			delete: vi.fn().mockResolvedValue({ result: 'ok', isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.bulkDelete(['1', '2']);
		expect(client.delete).toHaveBeenCalledWith('https://api.test/items/bulk_delete', { body: ['1', '2'] });
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `http-list.repository.ts`**

```ts
import { FetchHttpClient } from '../http/fetch-http-client';
import { ListRepository } from './list.repository';
import type { HttpQueryParams, IHttpClient } from '../types/http-client';
import type { IRepositoryConfig, ResponseListMapper } from '../types/repository-config';
import type { IResponse, IResponseList } from '../types/response';

export class HttpListRepository<T> extends ListRepository<T> {
	protected readonly baseUrl: string;
	protected readonly httpClient: IHttpClient;
	protected readonly responseListMapper: ResponseListMapper<T>;

	public constructor(config: IRepositoryConfig<T>) {
		super();
		if (!config.baseUrl) {
			throw new Error('[HttpListRepository] config.baseUrl is required.');
		}
		this.baseUrl = config.baseUrl;
		this.httpClient = config.httpClient ?? new FetchHttpClient();
		this.responseListMapper = config.responseListMapper ?? ((raw) => raw as IResponseList<T[]>);
	}

	public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const raw = await this.httpClient.get<unknown>(this.baseUrl, params ? { params } : undefined);
		return this.responseListMapper(raw);
	}

	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.baseUrl}/bulk_delete`, { body: [...ids] });
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Re-export and commit**

Add to `packages/core/src/index.ts`:
```ts
export * from './repositories/http-list.repository';
```

```bash
git add packages/core/src
git commit -m "feat(core): add HttpListRepository with configurable response mapper"
```

---

## Task 11: Abstract `SelectRepository` and `HttpSelectRepository`

**Files:**
- Create: `packages/core/src/repositories/select.repository.ts`
- Create: `packages/core/src/repositories/http-select.repository.ts`
- Create: `packages/core/src/repositories/http-select.repository.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write `select.repository.ts`**

```ts
import { ListRepository } from './list.repository';
import type { IPaginationParams } from '../types/pagination';
import type { IResponse, IResponseList } from '../types/response';

export abstract class SelectRepository<T> extends ListRepository<T> {
	public abstract get(id: string): Promise<IResponse<T>>;
	public abstract getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>>;
}
```

- [ ] **Step 2: Write the failing tests for the HTTP variant**

```ts
import { describe, it, expect, vi } from 'vitest';
import type { IHttpClient } from '../types/http-client';
import { HttpSelectRepository } from './http-select.repository';

interface IItem {
	id: string;
	name: string;
}

class TestRepository extends HttpSelectRepository<IItem> {}

function makeClient(impl: Partial<IHttpClient>): IHttpClient {
	return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), ...impl } as IHttpClient;
}

describe('HttpSelectRepository', () => {
	it('get() encodes the id twice (mirrors legacy behavior)', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: { id: 'a/b', name: 'x' }, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.get('a/b');
		expect(client.get).toHaveBeenCalledWith('https://api.test/items/a%252Fb');
	});

	it('getListByIdList() repeats `ids` and includes pagination', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.getListByIdList(['1', '2'], { page: 3, pageSize: 50 });
		expect(client.get).toHaveBeenCalledWith('https://api.test/items', {
			params: { ids: ['1', '2'], page: 3, pageSize: 50 },
		});
	});

	it('getListByIdList() omits pagination when not provided', async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ result: [], totalCount: 0, isSuccess: true }),
		});
		const repo = new TestRepository({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.getListByIdList(['1']);
		expect(client.get).toHaveBeenCalledWith('https://api.test/items', { params: { ids: ['1'] } });
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `http-select.repository.ts`**

```ts
import { HttpListRepository } from './http-list.repository';
import { SelectRepository } from './select.repository';
import type { HttpQueryParams } from '../types/http-client';
import type { IPaginationParams } from '../types/pagination';
import type { IResponse, IResponseList } from '../types/response';

export class HttpSelectRepository<T> extends HttpListRepository<T> implements SelectRepository<T> {
	public get(id: string): Promise<IResponse<T>> {
		// Double-encode mirrors the legacy `encodeURIComponent(encodeURIComponent(id))` behavior
		// from `platform/src/app/repositories/core/repositories/http-select.repository.ts:10`.
		const encoded = encodeURIComponent(encodeURIComponent(id));
		return this.httpClient.get<IResponse<T>>(`${this.baseUrl}/${encoded}`);
	}

	public async getListByIdList(
		ids: readonly string[],
		pagination?: IPaginationParams,
	): Promise<IResponseList<T[]>> {
		const params: HttpQueryParams = { ids: [...ids] };
		if (pagination) {
			params.page = pagination.page;
			params.pageSize = pagination.pageSize;
		}
		return this.getList(params);
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 3 tests green.

- [ ] **Step 6: Re-export and commit**

Add to `packages/core/src/index.ts`:
```ts
export * from './repositories/select.repository';
export * from './repositories/http-select.repository';
```

```bash
git add packages/core/src
git commit -m "feat(core): add SelectRepository and HttpSelectRepository"
```

---

## Task 12: Abstract `Repository` (full CRUD) and `HttpRepository`

**Files:**
- Create: `packages/core/src/repositories/repository.ts`
- Create: `packages/core/src/repositories/http-repository.ts`
- Create: `packages/core/src/repositories/http-repository.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write `repository.ts`**

```ts
import { SelectRepository } from './select.repository';
import type { IResponse } from '../types/response';

export abstract class Repository<T> extends SelectRepository<T> {
	public abstract create(dto: object): Promise<IResponse<unknown>>;
	public abstract update(id: string, dto: object): Promise<IResponse<unknown>>;
	public abstract delete(id?: string): Promise<IResponse<unknown>>;
	public abstract duplicate(id: string): Promise<IResponse<string>>;
}
```

- [ ] **Step 2: Write the failing tests for `HttpRepository`**

```ts
import { describe, it, expect, vi } from 'vitest';
import type { IHttpClient } from '../types/http-client';
import { HttpRepository } from './http-repository';

interface IItem { id: string; name: string; }
class TestRepo extends HttpRepository<IItem> {}

function makeClient(impl: Partial<IHttpClient>): IHttpClient {
	return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), ...impl } as IHttpClient;
}

describe('HttpRepository', () => {
	it('create() POSTs to baseUrl with the dto body', async () => {
		const client = makeClient({ post: vi.fn().mockResolvedValue({ result: 'id-1', isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.create({ name: 'x' });
		expect(client.post).toHaveBeenCalledWith('https://api.test/items', { body: { name: 'x' } });
	});

	it('update() PUTs to {baseUrl}/{id} with the dto body', async () => {
		const client = makeClient({ put: vi.fn().mockResolvedValue({ result: {}, isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.update('1', { name: 'y' });
		expect(client.put).toHaveBeenCalledWith('https://api.test/items/1', { body: { name: 'y' } });
	});

	it('delete() DELETEs {baseUrl}/{id} when id is provided', async () => {
		const client = makeClient({ delete: vi.fn().mockResolvedValue({ result: {}, isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.delete('1');
		expect(client.delete).toHaveBeenCalledWith('https://api.test/items/1');
	});

	it('delete() DELETEs baseUrl when no id is provided', async () => {
		const client = makeClient({ delete: vi.fn().mockResolvedValue({ result: {}, isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.delete();
		expect(client.delete).toHaveBeenCalledWith('https://api.test/items');
	});

	it('duplicate() POSTs to {baseUrl}/{id}/duplication with empty body', async () => {
		const client = makeClient({ post: vi.fn().mockResolvedValue({ result: 'id-2', isSuccess: true }) });
		const repo = new TestRepo({ baseUrl: 'https://api.test/items', httpClient: client });
		await repo.duplicate('1');
		expect(client.post).toHaveBeenCalledWith('https://api.test/items/1/duplication', { body: {} });
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `http-repository.ts`**

```ts
import { HttpSelectRepository } from './http-select.repository';
import { Repository } from './repository';
import type { IResponse } from '../types/response';

export class HttpRepository<T> extends HttpSelectRepository<T> implements Repository<T> {
	public create(dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.post<IResponse<unknown>>(this.baseUrl, { body: dto });
	}

	public update(id: string, dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.put<IResponse<unknown>>(`${this.baseUrl}/${id}`, { body: dto });
	}

	public delete(id?: string): Promise<IResponse<unknown>> {
		const url = id !== undefined ? `${this.baseUrl}/${id}` : this.baseUrl;
		return this.httpClient.delete<IResponse<unknown>>(url);
	}

	public duplicate(id: string): Promise<IResponse<string>> {
		return this.httpClient.post<IResponse<string>>(`${this.baseUrl}/${id}/duplication`, { body: {} });
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 5 tests green.

- [ ] **Step 6: Re-export and commit**

Add to `packages/core/src/index.ts`:
```ts
export * from './repositories/repository';
export * from './repositories/http-repository';
```

```bash
git add packages/core/src
git commit -m "feat(core): add Repository (full CRUD) and HttpRepository"
```

---

## Task 13: `mapTableParams` — pure function with configurable keys and strategies

This is the core of the "configurable" promise. Pulled out of `NpTableService.mapTableParams` so it's pure and unit-testable.

**Files:**
- Create: `packages/core/src/store/map-table-params.ts`
- Create: `packages/core/src/store/map-table-params.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { ESortOrder } from '../types/sort';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';
import { mapTableParams } from './map-table-params';

describe('mapTableParams', () => {
	it('emits page/pageSize using default keys', () => {
		const params = mapTableParams({
			pagination: { page: 2, pageSize: 25 },
			sortMap: {},
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({ page: 2, pageSize: 25 });
	});

	it('emits page/pageSize using custom keys', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sortMap: {},
			queryKeys: { ...DEFAULT_QUERY_KEYS, page: 'pageNumber', pageSize: 'limit' },
		});
		expect(params).toStrictEqual({ pageNumber: 1, limit: 10 });
	});

	it('translates a known sort field through sortMap', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'createdAt-DESC', field: 'createdAt', order: ESortOrder.DESC },
			sortMap: { createdAt: 'ByCreationDate' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			orderBy: 'ByCreationDate',
			orderByDescending: true,
		});
	});

	it('omits sort entirely when the sort field is not in sortMap', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'unknown-ASC', field: 'unknown', order: ESortOrder.ASC },
			sortMap: { createdAt: 'ByCreationDate' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({ page: 1, pageSize: 10 });
	});

	it('groups multiple filter values for the same key into an array', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			filters: [
				{ key: 'status', value: 'active' },
				{ key: 'status', value: 'paused' },
				{ key: 'origin', value: 'web' },
			],
			sortMap: {},
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			status: ['active', 'paused'],
			origin: ['web'],
		});
	});

	it('translates filter keys via filterMap when provided', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			filters: [{ key: 'status', value: 'active' }],
			sortMap: {},
			filterMap: { status: 'FilterStatus' },
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			FilterStatus: ['active'],
		});
	});

	it('emits the search term under the configured search key when present', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			search: 'alpha',
			sortMap: {},
			queryKeys: { ...DEFAULT_QUERY_KEYS, search: 'q' },
		});
		expect(params).toStrictEqual({ page: 1, pageSize: 10, q: 'alpha' });
	});

	it('omits the search key when search is empty', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			search: '',
			sortMap: {},
			queryKeys: DEFAULT_QUERY_KEYS,
		});
		expect(params).toStrictEqual({ page: 1, pageSize: 10 });
	});

	it('applies a custom paramFormatting.formatSortField', () => {
		const params = mapTableParams({
			pagination: { page: 1, pageSize: 10 },
			sort: { id: 'createdAt-ASC', field: 'createdAt', order: ESortOrder.ASC },
			sortMap: { createdAt: 'creation_date' },
			queryKeys: DEFAULT_QUERY_KEYS,
			paramFormatting: { formatSortField: (field) => `sort.${field}` },
		});
		expect(params).toStrictEqual({
			page: 1,
			pageSize: 10,
			orderBy: 'sort.creation_date',
			orderByDescending: false,
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `map-table-params.ts`**

```ts
import { ESortOrder, type ISortParams } from '../types/sort';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { HttpQueryParams } from '../types/http-client';
import type { IParamFormattingStrategy, IRepositoryQueryKeys } from '../types/repository-config';

export interface IMapTableParamsInput {
	readonly pagination: IPaginationParams;
	readonly sort?: ISortParams;
	readonly filters?: readonly IFilterParams[];
	readonly search?: string;
	readonly sortMap: Readonly<Record<string, string>>;
	readonly filterMap?: Readonly<Record<string, string>>;
	readonly queryKeys: IRepositoryQueryKeys;
	readonly paramFormatting?: IParamFormattingStrategy;
}

export function mapTableParams(input: IMapTableParamsInput): HttpQueryParams {
	const { pagination, sort, filters, search, sortMap, filterMap, queryKeys, paramFormatting } = input;
	const formatSortField = paramFormatting?.formatSortField ?? ((field: string) => field);
	const params: Record<string, unknown> = {};

	if (filters && filters.length > 0) {
		for (const filter of filters) {
			const key = filterMap?.[filter.key] ?? filter.key;
			const existing = params[key];
			if (Array.isArray(existing)) {
				existing.push(filter.value);
			} else {
				params[key] = [filter.value];
			}
		}
	}

	if (sort) {
		const mapped = sortMap[sort.field];
		if (mapped !== undefined) {
			params[queryKeys.orderBy] = formatSortField(mapped);
			params[queryKeys.orderByDescending] = sort.order === ESortOrder.DESC;
		}
	}

	params[queryKeys.page] = pagination.page;
	params[queryKeys.pageSize] = pagination.pageSize;

	if (search && search.length > 0) {
		params[queryKeys.search] = search;
	}

	return params as HttpQueryParams;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/store
git commit -m "feat(core): add mapTableParams pure function with configurable keys/strategies"
```

---

## Task 14: `TableStore<T>` — initial state, getters, and update methods

Build the store incrementally — Task 14 covers state + setters, Task 15 covers data fetching + auto-refresh, Task 16 covers bulk delete + reset/destroy.

**Files:**
- Create: `packages/core/src/store/table-store.ts`
- Create: `packages/core/src/store/table-store.test.ts`

- [ ] **Step 1: Write the first batch of failing tests** (state initialization and update methods)

```ts
import { describe, it, expect, vi } from 'vitest';
import { ESortOrder } from '../types/sort';
import { TableStore } from './table-store';
import type { ListRepository } from '../repositories/list.repository';
import type { IResponse, IResponseList } from '../types/response';

interface IItem { id: string; name: string; }

class StubListRepository implements ListRepository<IItem> {
	public readonly getListMock = vi.fn<(...args: unknown[]) => Promise<IResponseList<IItem[]>>>();
	public readonly bulkDeleteMock = vi.fn<(ids: readonly string[]) => Promise<IResponse<string>>>();
	public getList(params?: unknown): Promise<IResponseList<IItem[]>> {
		return this.getListMock(params);
	}
	public bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.bulkDeleteMock(ids);
	}
}

function createStore(overrides: Partial<ConstructorParameters<typeof TableStore<IItem>>[0]> = {}) {
	const repository = new StubListRepository();
	const store = new TableStore<IItem>({
		repository,
		sortMap: { createdAt: 'ByCreationDate' },
		...overrides,
	});
	return { store, repository };
}

describe('TableStore — initial state', () => {
	it('exposes the canonical default state', () => {
		const { store } = createStore();
		expect(store.data$.get()).toStrictEqual([]);
		expect(store.total$.get()).toBe(0);
		expect(store.loading$.get()).toBe(false);
		expect(store.pagination$.get()).toStrictEqual({ page: 1, pageSize: 10 });
		expect(store.sort$.get()).toBeUndefined();
		expect(store.filters$.get()).toStrictEqual([]);
		expect(store.search$.get()).toBe('');
	});

	it('respects custom initialPagination', () => {
		const { store } = createStore({ initialPagination: { page: 3, pageSize: 25 } });
		expect(store.pagination$.get()).toStrictEqual({ page: 3, pageSize: 25 });
	});
});

describe('TableStore — update methods', () => {
	it('updateData / updateTotal / updateLoading mutate the corresponding observables', () => {
		const { store } = createStore();
		store.updateData([{ id: '1', name: 'a' }]);
		store.updateTotal(42);
		store.updateLoading(true);
		expect(store.data$.get()).toStrictEqual([{ id: '1', name: 'a' }]);
		expect(store.total$.get()).toBe(42);
		expect(store.loading$.get()).toBe(true);
	});

	it('updatePagination mutates pagination$', () => {
		const { store } = createStore();
		store.updatePagination({ page: 2, pageSize: 20 });
		expect(store.pagination$.get()).toStrictEqual({ page: 2, pageSize: 20 });
	});

	it('updateSort mutates sort$', () => {
		const { store } = createStore();
		const sort = { id: 'name-ASC', field: 'name', order: ESortOrder.ASC };
		store.updateSort(sort);
		expect(store.sort$.get()).toStrictEqual(sort);
	});

	it('updateFilter mutates filters$', () => {
		const { store } = createStore();
		store.updateFilter([{ key: 'status', value: 'active' }]);
		expect(store.filters$.get()).toStrictEqual([{ key: 'status', value: 'active' }]);
	});

	it('updateSearch mutates search$', () => {
		const { store } = createStore();
		store.updateSearch('alpha');
		expect(store.search$.get()).toBe('alpha');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal `table-store.ts` to pass these tests**

```ts
import { Observable, type IReadonlyObservable } from '../state/observable';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { ISortParams } from '../types/sort';
import type { IResponse } from '../types/response';
import type { ITableStore } from '../types/table-store';
import type { ListRepository } from '../repositories/list.repository';
import type { IRepositoryQueryKeys, IParamFormattingStrategy } from '../types/repository-config';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';

export interface ITableStoreOptions<T> {
	readonly repository: ListRepository<T>;
	readonly sortMap: Readonly<Record<string, string>>;
	readonly filterMap?: Readonly<Record<string, string>>;
	readonly initialPagination?: IPaginationParams;
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	readonly paramFormatting?: IParamFormattingStrategy;
}

const DEFAULT_INITIAL_PAGINATION: IPaginationParams = { page: 1, pageSize: 10 };

export class TableStore<T> implements ITableStore<T> {
	private readonly _data = new Observable<readonly T[]>([]);
	private readonly _total = new Observable<number>(0);
	private readonly _loading = new Observable<boolean>(false);
	private readonly _pagination: Observable<IPaginationParams>;
	private readonly _sort = new Observable<ISortParams | undefined>(undefined);
	private readonly _filters = new Observable<readonly IFilterParams[]>([]);
	private readonly _search = new Observable<string>('');

	public readonly data$: IReadonlyObservable<readonly T[]> = this._data.asReadonly();
	public readonly total$: IReadonlyObservable<number> = this._total.asReadonly();
	public readonly loading$: IReadonlyObservable<boolean> = this._loading.asReadonly();
	public readonly pagination$: IReadonlyObservable<IPaginationParams>;
	public readonly sort$: IReadonlyObservable<ISortParams | undefined> = this._sort.asReadonly();
	public readonly filters$: IReadonlyObservable<readonly IFilterParams[]> = this._filters.asReadonly();
	public readonly search$: IReadonlyObservable<string> = this._search.asReadonly();

	protected readonly repository: ListRepository<T>;
	protected readonly sortMap: Readonly<Record<string, string>>;
	protected readonly filterMap: Readonly<Record<string, string>> | undefined;
	protected readonly queryKeys: IRepositoryQueryKeys;
	protected readonly paramFormatting: IParamFormattingStrategy | undefined;

	public constructor(options: ITableStoreOptions<T>) {
		this.repository = options.repository;
		this.sortMap = options.sortMap;
		this.filterMap = options.filterMap;
		this.queryKeys = { ...DEFAULT_QUERY_KEYS, ...(options.queryKeys ?? {}) };
		this.paramFormatting = options.paramFormatting;
		this._pagination = new Observable<IPaginationParams>(options.initialPagination ?? DEFAULT_INITIAL_PAGINATION);
		this.pagination$ = this._pagination.asReadonly();
	}

	public updateData(data: readonly T[]): void { this._data.set(data); }
	public updateTotal(total: number): void { this._total.set(total); }
	public updateLoading(loading: boolean): void { this._loading.set(loading); }
	public updatePagination(p: IPaginationParams): void { this._pagination.set(p); }
	public updateSort(sort: ISortParams | undefined): void { this._sort.set(sort); }
	public updateFilter(filters: readonly IFilterParams[]): void { this._filters.set(filters); }
	public updateSearch(search: string): void { this._search.set(search); }

	// Methods filled in by Task 15 / 16.
	public getData(): void { throw new Error('Not yet implemented'); }
	public bulkDelete(): Promise<IResponse<string>> { throw new Error('Not yet implemented'); }
	public refresh(): void { throw new Error('Not yet implemented'); }
	public reset(): void { throw new Error('Not yet implemented'); }
	public destroy(): void { /* filled in Task 16 */ }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — initial-state and update-methods groups green.

- [ ] **Step 5: Re-export from barrel and commit**

Add to `packages/core/src/index.ts`:
```ts
export * from './store/map-table-params';
export * from './store/table-store';
```

```bash
git add packages/core/src
git commit -m "feat(core): add TableStore initial state and update methods"
```

---

## Task 15: `TableStore` — `getData`, `fetchData`, auto-refresh on query changes

**Files:**
- Modify: `packages/core/src/store/table-store.ts`
- Modify: `packages/core/src/store/table-store.test.ts`

- [ ] **Step 1: Add failing tests for getData / fetchData / auto-refresh**

Append to `table-store.test.ts`:
```ts
describe('TableStore — getData and fetchData', () => {
	it('fetchData() flips loading to true, calls repository.getList, then to false', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true });
		const loadings: boolean[] = [];
		store.loading$.subscribe((v) => loadings.push(v), { emitOnSubscribe: false });
		store.getData(store.pagination$.get());
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalledTimes(1);
		expect(store.data$.get()).toStrictEqual([{ id: '1', name: 'a' }]);
		expect(store.total$.get()).toBe(1);
		expect(loadings).toStrictEqual([true, false]);
	});

	it('getData() builds query params using mapTableParams and the configured queryKeys', async () => {
		const { store, repository } = createStore({
			queryKeys: { page: 'pageNumber', pageSize: 'limit' },
		});
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.getData({ page: 4, pageSize: 50 }, undefined, [{ key: 'status', value: 'active' }], 'alpha');
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalledWith({
			pageNumber: 4,
			limit: 50,
			status: ['active'],
			name: 'alpha',
		});
	});

	it('decrements page when an empty result is returned and we are past page 1', async () => {
		const { store, repository } = createStore();
		store.updatePagination({ page: 5, pageSize: 10 });
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.getData({ page: 5, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(store.pagination$.get()).toStrictEqual({ page: 4, pageSize: 10 });
	});

	it('does not decrement page when at page 1 even on empty result', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.getData({ page: 1, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(store.pagination$.get()).toStrictEqual({ page: 1, pageSize: 10 });
	});

	it('auto-refreshes when pagination/sort/filters/search change and coalesces sync updates', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.updatePagination({ page: 2, pageSize: 10 });
		store.updateSearch('hello');
		store.updateFilter([{ key: 'status', value: 'active' }]);
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalledTimes(1);
	});

	it('does not fetch on construction (subscriptions skip the initial value)', async () => {
		const { repository } = createStore();
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — `Not yet implemented` thrown by `getData`.

- [ ] **Step 3: Implement `getData`, `fetchData`, and the auto-refresh wiring**

Replace the placeholder methods in `table-store.ts` and add private fields. Full updated file:

```ts
import { Observable, type IReadonlyObservable, type Unsubscribe } from '../state/observable';
import { watch } from '../state/watch';
import { mapTableParams } from './map-table-params';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { ISortParams } from '../types/sort';
import type { IResponse, IResponseList } from '../types/response';
import type { ITableStore } from '../types/table-store';
import type { ListRepository } from '../repositories/list.repository';
import type { IRepositoryQueryKeys, IParamFormattingStrategy } from '../types/repository-config';
import { DEFAULT_QUERY_KEYS } from '../types/repository-config';

export interface ITableStoreOptions<T> {
	readonly repository: ListRepository<T>;
	readonly sortMap: Readonly<Record<string, string>>;
	readonly filterMap?: Readonly<Record<string, string>>;
	readonly initialPagination?: IPaginationParams;
	readonly queryKeys?: Partial<IRepositoryQueryKeys>;
	readonly paramFormatting?: IParamFormattingStrategy;
}

const DEFAULT_INITIAL_PAGINATION: IPaginationParams = { page: 1, pageSize: 10 };

export class TableStore<T> implements ITableStore<T> {
	private readonly _data = new Observable<readonly T[]>([]);
	private readonly _total = new Observable<number>(0);
	private readonly _loading = new Observable<boolean>(false);
	private readonly _pagination: Observable<IPaginationParams>;
	private readonly _sort = new Observable<ISortParams | undefined>(undefined);
	private readonly _filters = new Observable<readonly IFilterParams[]>([]);
	private readonly _search = new Observable<string>('');

	public readonly data$: IReadonlyObservable<readonly T[]> = this._data.asReadonly();
	public readonly total$: IReadonlyObservable<number> = this._total.asReadonly();
	public readonly loading$: IReadonlyObservable<boolean> = this._loading.asReadonly();
	public readonly pagination$: IReadonlyObservable<IPaginationParams>;
	public readonly sort$: IReadonlyObservable<ISortParams | undefined> = this._sort.asReadonly();
	public readonly filters$: IReadonlyObservable<readonly IFilterParams[]> = this._filters.asReadonly();
	public readonly search$: IReadonlyObservable<string> = this._search.asReadonly();

	protected readonly repository: ListRepository<T>;
	protected readonly sortMap: Readonly<Record<string, string>>;
	protected readonly filterMap: Readonly<Record<string, string>> | undefined;
	protected readonly queryKeys: IRepositoryQueryKeys;
	protected readonly paramFormatting: IParamFormattingStrategy | undefined;
	private querySubscription: Unsubscribe = () => {};

	public constructor(options: ITableStoreOptions<T>) {
		this.repository = options.repository;
		this.sortMap = options.sortMap;
		this.filterMap = options.filterMap;
		this.queryKeys = { ...DEFAULT_QUERY_KEYS, ...(options.queryKeys ?? {}) };
		this.paramFormatting = options.paramFormatting;
		this._pagination = new Observable<IPaginationParams>(options.initialPagination ?? DEFAULT_INITIAL_PAGINATION);
		this.pagination$ = this._pagination.asReadonly();
		this.subscribeToTableQueryChanges();
	}

	public updateData(data: readonly T[]): void { this._data.set(data); }
	public updateTotal(total: number): void { this._total.set(total); }
	public updateLoading(loading: boolean): void { this._loading.set(loading); }
	public updatePagination(p: IPaginationParams): void { this._pagination.set(p); }
	public updateSort(sort: ISortParams | undefined): void { this._sort.set(sort); }
	public updateFilter(filters: readonly IFilterParams[]): void { this._filters.set(filters); }
	public updateSearch(search: string): void { this._search.set(search); }

	public getData(
		pagination: IPaginationParams,
		sort?: ISortParams,
		filters?: readonly IFilterParams[],
		search?: string,
	): void {
		const params = mapTableParams({
			pagination,
			sort,
			filters,
			search,
			sortMap: this.sortMap,
			filterMap: this.filterMap,
			queryKeys: this.queryKeys,
			paramFormatting: this.paramFormatting,
		});
		this.fetchData(this.repository.getList(params));
	}

	protected fetchData(promise: Promise<IResponseList<T[]>>): void {
		this.updateLoading(true);
		promise
			.then((response) => {
				this.updateData(response.result);
				this.updateTotal(response.totalCount);
				this.checkIfNeedToGoPrevious(response.result.length, this._pagination.get());
			})
			.finally(() => this.updateLoading(false));
	}

	public bulkDelete(): Promise<IResponse<string>> { throw new Error('Not yet implemented'); }

	public refresh(): void {
		this.getData(this._pagination.get(), this._sort.get(), this._filters.get(), this._search.get());
	}

	public reset(): void { throw new Error('Not yet implemented'); }

	public destroy(): void {
		this.querySubscription();
	}

	private subscribeToTableQueryChanges(): void {
		this.querySubscription = watch(
			[this.pagination$, this.sort$, this.filters$, this.search$],
			() => this.refresh(),
		);
	}

	private checkIfNeedToGoPrevious(dataLength: number, pagination: IPaginationParams): void {
		if (dataLength === 0 && pagination.page > 1) {
			this.updatePagination({ ...pagination, page: pagination.page - 1 });
		}
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — getData/fetchData/auto-refresh tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/store
git commit -m "feat(core): wire TableStore getData, fetchData, auto-refresh, refresh"
```

---

## Task 16: `TableStore` — `bulkDelete`, `reset`

**Files:**
- Modify: `packages/core/src/store/table-store.ts`
- Modify: `packages/core/src/store/table-store.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `table-store.test.ts`:
```ts
describe('TableStore — bulkDelete', () => {
	it('delegates to repository.bulkDelete and refreshes after completion', async () => {
		const { store, repository } = createStore();
		repository.bulkDeleteMock.mockResolvedValue({ result: 'ok', isSuccess: true });
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		await store.bulkDelete(['1', '2']);
		expect(repository.bulkDeleteMock).toHaveBeenCalledWith(['1', '2']);
		// Refresh fires asynchronously through the auto-refresh path.
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).toHaveBeenCalled();
	});
});

describe('TableStore — reset', () => {
	it('clears all observables to defaults and detaches the existing subscription', () => {
		const { store, repository } = createStore();
		store.updateData([{ id: '1', name: 'a' }]);
		store.updateTotal(99);
		store.updateFilter([{ key: 'status', value: 'active' }]);
		store.updateSearch('alpha');
		store.updatePagination({ page: 7, pageSize: 25 });
		store.updateSort({ id: 'name-ASC', field: 'name', order: 'ASC' as never });
		repository.getListMock.mockClear();

		store.reset();

		expect(store.data$.get()).toStrictEqual([]);
		expect(store.total$.get()).toBe(0);
		expect(store.filters$.get()).toStrictEqual([]);
		expect(store.search$.get()).toBe('');
		expect(store.pagination$.get()).toStrictEqual({ page: 1, pageSize: 10 });
		expect(store.sort$.get()).toBeUndefined();
	});
});

describe('TableStore — destroy', () => {
	it('detaches the subscription so subsequent updates do not refresh', async () => {
		const { store, repository } = createStore();
		repository.getListMock.mockResolvedValue({ result: [], totalCount: 0, isSuccess: true });
		store.destroy();
		store.updatePagination({ page: 2, pageSize: 10 });
		await Promise.resolve();
		await Promise.resolve();
		expect(repository.getListMock).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run core:test
```

Expected: FAIL — `bulkDelete` and `reset` throw.

- [ ] **Step 3: Implement `bulkDelete`, `reset`**

Replace the placeholder methods in `table-store.ts`:

```ts
public async bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
	const result = await this.repository.bulkDelete(ids);
	this.refresh();
	return result;
}

public reset(): void {
	this.querySubscription();
	this._data.set([]);
	this._total.set(0);
	this._filters.set([]);
	this._search.set('');
	this._pagination.set(DEFAULT_INITIAL_PAGINATION);
	this._sort.set(undefined);
	this.subscribeToTableQueryChanges();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run core:test
```

Expected: PASS — all bulkDelete/reset/destroy tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/store
git commit -m "feat(core): add TableStore bulkDelete, reset, and destroy"
```

---

## Task 17: Build the package and verify the produced artifact

**Files:** none modified — verification only.

- [ ] **Step 1: Build**

```bash
npx nx run core:build
```

Expected: `packages/core/dist/` contains `index.js`, `index.cjs`, `index.d.ts` and source maps.

- [ ] **Step 2: Sanity-check the public API surface**

```bash
node -e "import('./packages/core/dist/index.js').then(m => console.log(Object.keys(m).sort().join('\n')))"
```

Expected output should include:
```
DEFAULT_QUERY_KEYS
ESortOrder
FetchHttpClient
HttpListRepository
HttpRepository
HttpSelectRepository
ListRepository
Observable
Repository
SelectRepository
TableStore
arrayToMap
deepEqual
mapTableParams
watch
```

If any are missing, re-check `packages/core/src/index.ts` and re-build.

- [ ] **Step 3: Run the full test suite once more**

```bash
npx nx run core:test
```

Expected: All tests pass — confirm no regressions.

- [ ] **Step 4: Commit (if anything changed during verification)**

```bash
git status
# If clean, skip. Otherwise:
git add .
git commit -m "chore(core): build verification fixes"
```

---

## Task 18: Write `@bridgebyte/sst-core` README usage examples

**Files:**
- Modify: `packages/core/README.md`

- [ ] **Step 1: Replace the placeholder README with usage examples**

```markdown
# @bridgebyte/sst-core

Framework-agnostic core for **So Simple Table**. Zero runtime dependencies.

## Installation

```bash
npm install @bridgebyte/sst-core
```

## Quick start

```ts
import { HttpRepository, TableStore, type IBaseItem } from '@bridgebyte/sst-core';

interface IStrategy extends IBaseItem {
	createdAt: string;
	status: 'active' | 'paused';
}

class StrategyRepository extends HttpRepository<IStrategy> {}

const repository = new StrategyRepository({ baseUrl: 'https://api.example.com/strategies' });

const store = new TableStore<IStrategy>({
	repository,
	sortMap: { createdAt: 'ByCreationDate' },
	filterMap: { status: 'FilterStatus' },
});

store.data$.subscribe((rows) => {
	console.log('rows', rows);
});
```

## Configurable query keys

```ts
new HttpRepository({
	baseUrl: 'https://api.example.com/strategies',
	queryKeys: {
		page: 'pageNumber',
		pageSize: 'limit',
		orderBy: 'sortBy',
		orderByDescending: 'sortDesc',
		search: 'q',
	},
});
```

## Custom response shape

```ts
new HttpRepository<IStrategy>({
	baseUrl: 'https://api.example.com/strategies',
	responseListMapper: (raw) => {
		const r = raw as { items: IStrategy[]; total: number };
		return { result: r.items, totalCount: r.total, isSuccess: true };
	},
});
```

## Plugging your own HTTP client

```ts
import type { IHttpClient } from '@bridgebyte/sst-core';

const myClient: IHttpClient = {
	get: (url, opts) => fetch(url, { ...opts }).then((r) => r.json()),
	post: (...) => /* ... */,
	put:  (...) => /* ... */,
	delete: (...) => /* ... */,
};

new HttpRepository({ baseUrl: '...', httpClient: myClient });
```

## Public API

| Export | Purpose |
| --- | --- |
| `Observable<T>` | Tiny reactive primitive with `get()`, `set()`, `subscribe()`. |
| `watch(observables, cb)` | Coalesce multi-observable changes into one microtask callback. |
| `TableStore<T>` | Reactive table state + auto-refresh on query changes. |
| `ListRepository<T>` / `SelectRepository<T>` / `Repository<T>` | Abstract bases. |
| `HttpListRepository<T>` / `HttpSelectRepository<T>` / `HttpRepository<T>` | HTTP variants. |
| `FetchHttpClient` | Default `IHttpClient` over the `fetch` API. |
| `mapTableParams(input)` | Pure function that builds query params for the wire. |
| `IRealtimeAdapter<T>` | Contract for future real-time adapters. |

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/README.md
git commit -m "docs(core): add @bridgebyte/sst-core README with usage examples"
```

---

## Self-Review Checklist

After completing all tasks, run through these:

1. **Spec coverage**
	- ✅ Pure JS/TS core with event-emitter Observable — Task 4.
	- ✅ `IHttpClient` adapter + default `FetchHttpClient` — Tasks 7, 8.
	- ✅ Repository chain `ListRepository → SelectRepository → Repository` — Tasks 9, 11, 12.
	- ✅ Configurable query keys + response mapper + param formatting — Tasks 7, 13.
	- ✅ `baseUrl` mandatory (throws if empty) — Task 10, Step 3.
	- ✅ `IRealtimeAdapter<T>` defined — Task 7.
	- ✅ No translation layer — confirmed; nothing imports a translator.
	- ✅ Standalone monorepo with npm + Nx — Task 1.

2. **Placeholder scan** — none. Every step contains executable code or commands.

3. **Type consistency**
	- `ITableStore<T>` matches `TableStore<T>` implementation (data$/total$/loading$/...).
	- `IRepositoryConfig.responseListMapper` signature matches usage in `HttpListRepository.getList`.
	- `mapTableParams` `queryKeys` parameter type is `IRepositoryQueryKeys`, used identically in `TableStore`.
	- `Unsubscribe` reused everywhere a teardown is returned.

4. **Build verification** — Task 17 runs `nx run core:build` and inspects exports.

---

**Plan 1 complete.** Continue to `02-angular.md`.
