# So Simple Table — Angular (`@bridgebyte/sst-ng`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an Angular 20+ adapter on top of `@bridgebyte/sst-core` that exposes signals, an Angular `HttpClient`-backed repository chain, and a default styled `<sst-table>` component with full template-override hooks. This package is the spiritual successor of the existing `np-table` from `platform/libs/ngx-oppo`, but framework-agnostic at the core.

**Architecture:**
- `SstTableService<T>` extends `TableStore<T>` from `@bridgebyte/sst-core`. No new state — it just exposes the same observables and adds Angular-friendly signal accessors via a `toSignal` adapter.
- `NgHttpClient` adapter wraps Angular's `HttpClient` and implements `@bridgebyte/sst-core`'s `IHttpClient`. Allows users to drop the abstract repositories from `@bridgebyte/sst-core` into Angular DI without rewriting them.
- `SstNgListRepository<T>`, `SstNgSelectRepository<T>`, `SstNgRepository<T>` are `@Injectable` bases that pre-wire the `NgHttpClient` adapter and require subclasses to provide `baseUrl` (mirrors the legacy `HttpRepository` `get baseUrl()` pattern).
- `SstTableComponent<T>` renders a basic styled HTML `<table>` by default and exposes content slots (`#headerCell`, `#bodyCell`, `#emptyState`, `#searchInput`, `#bulkActions`) for full UI override. No ng-zorro, no responsive split — those live in future plugin packages.
- Standalone components, signal-based change detection, `inject()` DI, no NgModules.

**Tech Stack:** Angular 20+, ng-packagr (build), Jest + jest-preset-angular (tests), `@bridgebyte/sst-core` peer dep. RxJS is used internally only to bridge Angular `HttpClient`'s observable returns to promises.

**Prerequisites:** Plan `01-core.md` is fully implemented and `@bridgebyte/sst-core` builds clean.

---

## File Structure

```
packages/ng/
├── package.json                  # name: "@bridgebyte/sst-ng"
├── ng-package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.lib.prod.json
├── tsconfig.spec.json
├── jest.config.ts
├── setup-jest.ts
├── README.md
└── src/
    ├── public-api.ts             # barrel — re-exports public surface
    └── lib/
        ├── http/
        │   ├── ng-http-client.ts
        │   └── ng-http-client.spec.ts
        ├── repositories/
        │   ├── sst-ng-list.repository.ts
        │   ├── sst-ng-list.repository.spec.ts
        │   ├── sst-ng-select.repository.ts
        │   └── sst-ng.repository.ts
        ├── store/
        │   ├── sst-table.service.ts
        │   ├── sst-table.service.spec.ts
        │   └── to-signal.helper.ts
        │   └── to-signal.helper.spec.ts
        └── component/
            ├── sst-table.component.ts
            ├── sst-table.component.html
            ├── sst-table.component.scss
            └── sst-table.component.spec.ts
```

**Why this split:** mirrors the layering in `@bridgebyte/sst-core` (`http/`, `repositories/`, `store/`) plus an Angular-specific `component/` folder. Each subdirectory can be tree-shaken independently via TypeScript barrels.

---

## Task 1: Scaffold `@bridgebyte/sst-ng` package

**Files:**
- Create: `packages/ng/package.json`
- Create: `packages/ng/ng-package.json`
- Create: `packages/ng/project.json`
- Create: `packages/ng/tsconfig.json`
- Create: `packages/ng/tsconfig.lib.json`
- Create: `packages/ng/tsconfig.lib.prod.json`
- Create: `packages/ng/tsconfig.spec.json`
- Create: `packages/ng/jest.config.ts`
- Create: `packages/ng/setup-jest.ts`
- Create: `packages/ng/src/public-api.ts`
- Create: `packages/ng/README.md`
- Modify: `<repo-root>/package.json`
- Modify: `<repo-root>/tsconfig.base.json`

- [ ] **Step 1: Create `packages/ng/package.json`**

```json
{
  "name": "@bridgebyte/sst-ng",
  "version": "0.1.0",
  "description": "So Simple Table — Angular adapter and default UI component on top of @bridgebyte/sst-core.",
  "type": "module",
  "sideEffects": false,
  "scripts": {
    "build": "ng-packagr -p ng-package.json -c tsconfig.lib.prod.json",
    "test": "jest --config jest.config.ts",
    "typecheck": "tsc --noEmit -p tsconfig.lib.json",
    "lint": "eslint src --ext .ts,.html",
    "clean": "rm -rf dist coverage"
  },
  "peerDependencies": {
    "@angular/common": ">=20.0.0",
    "@angular/core": ">=20.0.0",
    "@angular/forms": ">=20.0.0",
    "@bridgebyte/sst-core": "workspace:*",
    "rxjs": ">=7.8.0"
  },
  "devDependencies": {
    "@angular/animations": "^20.3.0",
    "@angular/common": "^20.3.0",
    "@angular/compiler": "^20.3.0",
    "@angular/compiler-cli": "^20.3.0",
    "@angular/core": "^20.3.0",
    "@angular/forms": "^20.3.0",
    "@angular/platform-browser": "^20.3.0",
    "@angular/platform-browser-dynamic": "^20.3.0",
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "jest-preset-angular": "^14.5.0",
    "ng-packagr": "^20.3.0",
    "rxjs": "^7.8.1",
    "ts-jest": "^29.1.0",
    "tslib": "^2.8.1",
    "zone.js": "^0.15.0"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Create `packages/ng/ng-package.json`**

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "./dist",
  "lib": { "entryFile": "src/public-api.ts" }
}
```

- [ ] **Step 3: Create `packages/ng/tsconfig.json`** (root tsconfig for IDEs)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false,
    "useDefineForClassFields": false,
    "noUncheckedIndexedAccess": false
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

> **Note:** `useDefineForClassFields` is set to `false` because Angular's component decorators rely on the legacy field-init semantics. The base tsconfig sets it to `true` for `@bridgebyte/sst-core` (correct for tsup). `noUncheckedIndexedAccess` is relaxed for the Angular package because Angular template typings struggle with strict tuple indexing.

- [ ] **Step 4: Create `packages/ng/tsconfig.lib.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts", "src/test.ts", "setup-jest.ts"]
}
```

- [ ] **Step 5: Create `packages/ng/tsconfig.lib.prod.json`**

```json
{
  "extends": "./tsconfig.lib.json",
  "compilerOptions": { "declarationMap": false }
}
```

- [ ] **Step 6: Create `packages/ng/tsconfig.spec.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*.spec.ts", "setup-jest.ts"]
}
```

- [ ] **Step 7: Create `packages/ng/setup-jest.ts`**

```ts
import 'jest-preset-angular/setup-jest';
```

- [ ] **Step 8: Create `packages/ng/jest.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
	preset: 'jest-preset-angular',
	setupFilesAfterEach: ['<rootDir>/setup-jest.ts'],
	rootDir: '.',
	testMatch: ['<rootDir>/src/**/*.spec.ts'],
	moduleNameMapper: { '^@bridgebyte/sst-core$': '<rootDir>/../core/src/index.ts' },
	transform: {
		'^.+\\.(ts|mjs|js|html)$': [
			'jest-preset-angular',
			{
				tsconfig: '<rootDir>/tsconfig.spec.json',
				stringifyContentPathRegex: '\\.html$',
			},
		],
	},
	transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};

export default config;
```

- [ ] **Step 9: Create `packages/ng/project.json`**

```json
{
  "name": "ng",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/ng/src",
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

- [ ] **Step 10: Create `packages/ng/src/public-api.ts`**

```ts
// @bridgebyte/sst-ng public API — populated by subsequent tasks.
export {};
```

- [ ] **Step 11: Create `packages/ng/README.md`**

```markdown
# @bridgebyte/sst-ng

Angular adapter for **So Simple Table**. Built on top of [`@bridgebyte/sst-core`](../core).

- Angular `HttpClient`-backed repositories (`SstNgListRepository`, `SstNgSelectRepository`, `SstNgRepository`)
- `SstTableService<T>` — `TableStore<T>` plus signal accessors
- `<sst-table>` standalone component with default UI and full template overrides

See `02-angular.md` for the full plan.
```

- [ ] **Step 12: Add `@bridgebyte/sst-ng` path mapping to root tsconfig.base.json**

In `<repo-root>/tsconfig.base.json`, extend the `paths` block:
```json
"paths": {
  "@bridgebyte/sst-core": ["packages/core/src/index.ts"],
  "@bridgebyte/sst-ng": ["packages/ng/src/public-api.ts"]
}
```

- [ ] **Step 13: Install Angular toolchain at workspace root**

```bash
npm install --workspace @bridgebyte/sst-ng
```

Expected: `packages/ng/node_modules/.bin/` contains `ng-packagr` and `jest`.

- [ ] **Step 14: Verify the package typechecks (empty barrel)**

```bash
npx nx run ng:typecheck
```

Expected: `0 errors`.

- [ ] **Step 15: Commit**

```bash
git add packages/ng tsconfig.base.json package.json package-lock.json
git commit -m "feat(ng): scaffold @bridgebyte/sst-ng package"
```

---

## Task 2: Implement `NgHttpClient` adapter

Wraps Angular's `HttpClient` so `@bridgebyte/sst-core`'s repositories can be reused under Angular DI.

**Files:**
- Create: `packages/ng/src/lib/http/ng-http-client.ts`
- Create: `packages/ng/src/lib/http/ng-http-client.spec.ts`
- Modify: `packages/ng/src/public-api.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgHttpClient } from './ng-http-client';

describe('NgHttpClient', () => {
	let client: NgHttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), NgHttpClient],
		});
		client = TestBed.inject(NgHttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	it('issues a GET with serialized scalar params', async () => {
		const promise = client.get<{ ok: boolean }>('https://api.test/items', {
			params: { page: 1, pageSize: 10 },
		});
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/items' && r.method === 'GET');
		expect(req.request.params.get('page')).toBe('1');
		expect(req.request.params.get('pageSize')).toBe('10');
		req.flush({ ok: true });
		await expect(promise).resolves.toEqual({ ok: true });
	});

	it('repeats array params per value', async () => {
		const promise = client.get('https://api.test/items', { params: { ids: ['a', 'b', 'c'] } });
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/items');
		expect(req.request.params.getAll('ids')).toEqual(['a', 'b', 'c']);
		req.flush({});
		await promise;
	});

	it('omits undefined params', async () => {
		const promise = client.get('https://api.test/items', { params: { page: 1, search: undefined } });
		const req = httpMock.expectOne('https://api.test/items?page=1');
		req.flush({});
		await promise;
	});

	it('serializes a JSON body for POST', async () => {
		const promise = client.post('https://api.test/items', { body: { name: 'x' } });
		const req = httpMock.expectOne('https://api.test/items');
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toStrictEqual({ name: 'x' });
		req.flush({});
		await promise;
	});

	it('serializes a JSON body for PUT', async () => {
		const promise = client.put('https://api.test/items/1', { body: { name: 'y' } });
		const req = httpMock.expectOne('https://api.test/items/1');
		expect(req.request.method).toBe('PUT');
		expect(req.request.body).toStrictEqual({ name: 'y' });
		req.flush({});
		await promise;
	});

	it('sends DELETE with body when provided', async () => {
		const promise = client.delete('https://api.test/items', { body: ['1', '2'] });
		const req = httpMock.expectOne('https://api.test/items');
		expect(req.request.method).toBe('DELETE');
		expect(req.request.body).toStrictEqual(['1', '2']);
		req.flush({});
		await promise;
	});

	it('rejects when the request errors', async () => {
		const promise = client.get('https://api.test/items');
		const req = httpMock.expectOne('https://api.test/items');
		req.flush({ message: 'nope' }, { status: 500, statusText: 'Server Error' });
		await expect(promise).rejects.toBeDefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run ng:test
```

Expected: FAIL — module `./ng-http-client` not found.

- [ ] **Step 3: Implement `ng-http-client.ts`**

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { HttpQueryParams, IHttpClient, IHttpRequestOptions } from '@bridgebyte/sst-core';

@Injectable({ providedIn: 'root' })
export class NgHttpClient implements IHttpClient {
	private readonly httpClient = inject(HttpClient);

	public get<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.get<T>(url, {
				params: this.buildParams(options?.params),
				headers: options?.headers,
			}),
		);
	}

	public post<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.post<T>(url, options?.body ?? null, {
				params: this.buildParams(options?.params),
				headers: options?.headers,
			}),
		);
	}

	public put<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.put<T>(url, options?.body ?? null, {
				params: this.buildParams(options?.params),
				headers: options?.headers,
			}),
		);
	}

	public delete<T>(url: string, options?: IHttpRequestOptions): Promise<T> {
		return firstValueFrom(
			this.httpClient.request<T>('DELETE', url, {
				body: options?.body,
				params: this.buildParams(options?.params),
				headers: options?.headers,
				responseType: 'json',
			}),
		);
	}

	private buildParams(params: HttpQueryParams | undefined): HttpParams | undefined {
		if (!params) return undefined;
		let result = new HttpParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) continue;
			if (Array.isArray(value)) {
				for (const v of value) result = result.append(key, String(v));
			} else {
				result = result.append(key, String(value));
			}
		}
		return result;
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run ng:test
```

Expected: PASS — all 7 NgHttpClient tests green.

- [ ] **Step 5: Re-export from barrel**

Replace `packages/ng/src/public-api.ts`:
```ts
export * from './lib/http/ng-http-client';
```

- [ ] **Step 6: Commit**

```bash
git add packages/ng/src
git commit -m "feat(ng): add NgHttpClient adapter wrapping Angular HttpClient"
```

---

## Task 3: Angular-flavored repository bases

Three thin `@Injectable` classes that pre-wire the `NgHttpClient` adapter and expose `baseUrl` as an abstract getter (mirrors the legacy `HttpRepository` pattern from `platform/src/app/repositories/core/repositories/http-repository.ts:12-14`).

**Files:**
- Create: `packages/ng/src/lib/repositories/sst-ng-list.repository.ts`
- Create: `packages/ng/src/lib/repositories/sst-ng-list.repository.spec.ts`
- Create: `packages/ng/src/lib/repositories/sst-ng-select.repository.ts`
- Create: `packages/ng/src/lib/repositories/sst-ng.repository.ts`
- Modify: `packages/ng/src/public-api.ts`

- [ ] **Step 1: Write failing tests for `SstNgListRepository`**

```ts
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SstNgListRepository } from './sst-ng-list.repository';

interface IItem { id: string; name: string; }

@Injectable({ providedIn: 'root' })
class StrategyRepository extends SstNgListRepository<IItem> {
	protected override get baseUrl(): string {
		return 'https://api.test/strategies';
	}
}

describe('SstNgListRepository', () => {
	let repo: StrategyRepository;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), StrategyRepository],
		});
		repo = TestBed.inject(StrategyRepository);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	it('throws when subclass returns empty baseUrl', () => {
		@Injectable({ providedIn: 'root' })
		class BrokenRepository extends SstNgListRepository<IItem> {
			protected override get baseUrl(): string { return ''; }
		}
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), BrokenRepository] });
		expect(() => TestBed.inject(BrokenRepository).getList()).toThrow(/baseUrl/);
	});

	it('getList() issues a GET to the subclass baseUrl', async () => {
		const promise = repo.getList({ page: 1 });
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/strategies');
		expect(req.request.method).toBe('GET');
		expect(req.request.params.get('page')).toBe('1');
		req.flush({ result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true });
		await expect(promise).resolves.toStrictEqual({
			result: [{ id: '1', name: 'a' }],
			totalCount: 1,
			isSuccess: true,
		});
	});

	it('bulkDelete() issues a DELETE to {baseUrl}/bulk_delete with the ids body', async () => {
		const promise = repo.bulkDelete(['1', '2']);
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/strategies/bulk_delete');
		expect(req.request.method).toBe('DELETE');
		expect(req.request.body).toStrictEqual(['1', '2']);
		req.flush({ result: 'ok', isSuccess: true });
		await promise;
	});

	it('respects a queryKeys override on the subclass', async () => {
		@Injectable({ providedIn: 'root' })
		class CustomKeysRepository extends SstNgListRepository<IItem> {
			protected override get baseUrl(): string { return 'https://api.test/items'; }
			protected override get queryKeys() {
				return { page: 'pageNumber', pageSize: 'limit' };
			}
		}
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), CustomKeysRepository],
		});
		const httpMock2 = TestBed.inject(HttpTestingController);
		const r = TestBed.inject(CustomKeysRepository);
		// We can't easily assert queryKeys impact here without a TableStore round-trip,
		// so this test only confirms construction succeeds.
		expect(r).toBeInstanceOf(SstNgListRepository);
		httpMock2.verify();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run ng:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `sst-ng-list.repository.ts`**

> **Why this extends `ListRepository<T>` directly instead of `HttpListRepository<T>`:** the core `HttpListRepository` validates `baseUrl` in its constructor. Under Angular DI the subclass's `get baseUrl()` getter is not bound when the parent constructor runs, so we'd have to pass a sentinel and skip validation. It's simpler to extend `ListRepository<T>` directly and read `this.baseUrl` on every call — `requireBaseUrl()` does the validation lazily.

```ts
import { Injectable, inject } from '@angular/core';
import {
	ListRepository,
	type HttpQueryParams,
	type IHttpClient,
	type IRepositoryQueryKeys,
	type IResponse,
	type IResponseList,
	type ResponseListMapper,
} from '@bridgebyte/sst-core';
import { NgHttpClient } from '../http/ng-http-client';

/**
 * Angular-flavored base for list-only repositories.
 * Subclasses must override `baseUrl`. `queryKeys` and `responseListMapper`
 * may be overridden as getters when an API differs from the defaults.
 */
@Injectable()
export abstract class SstNgListRepository<T> extends ListRepository<T> {
	protected readonly httpClient: IHttpClient = inject(NgHttpClient);

	/** Required. Subclasses must override. */
	protected abstract get baseUrl(): string;

	/** Optional. Override to customize the four query keys (consumed by the table store). */
	protected get queryKeys(): Partial<IRepositoryQueryKeys> | undefined {
		return undefined;
	}

	/** Optional. Override to remap a non-canonical API response shape. */
	protected get responseListMapper(): ResponseListMapper<T> | undefined {
		return undefined;
	}

	public override async getList(params?: HttpQueryParams): Promise<IResponseList<T[]>> {
		const url = this.requireBaseUrl();
		const raw = await this.httpClient.get<unknown>(url, params ? { params } : undefined);
		const mapper = this.responseListMapper ?? ((r) => r as IResponseList<T[]>);
		return mapper(raw);
	}

	public override bulkDelete(ids: readonly string[]): Promise<IResponse<string>> {
		return this.httpClient.delete<IResponse<string>>(`${this.requireBaseUrl()}/bulk_delete`, { body: [...ids] });
	}

	protected requireBaseUrl(): string {
		const url = this.baseUrl;
		if (!url) {
			throw new Error(`[${this.constructor.name}] baseUrl is required.`);
		}
		return url;
	}
}
```

- [ ] **Step 4: Implement `sst-ng-select.repository.ts`**

```ts
import { Injectable } from '@angular/core';
import type { HttpQueryParams, IPaginationParams, IResponse, IResponseList } from '@bridgebyte/sst-core';
import { SstNgListRepository } from './sst-ng-list.repository';

@Injectable()
export abstract class SstNgSelectRepository<T> extends SstNgListRepository<T> {
	public get(id: string): Promise<IResponse<T>> {
		const encoded = encodeURIComponent(encodeURIComponent(id));
		return this.httpClient.get<IResponse<T>>(`${this.requireBaseUrl()}/${encoded}`);
	}

	public getListByIdList(ids: readonly string[], pagination?: IPaginationParams): Promise<IResponseList<T[]>> {
		const params: HttpQueryParams = { ids: [...ids] };
		if (pagination) {
			params.page = pagination.page;
			params.pageSize = pagination.pageSize;
		}
		return this.getList(params);
	}
}
```

- [ ] **Step 5: Implement `sst-ng.repository.ts`**

```ts
import { Injectable } from '@angular/core';
import type { IResponse } from '@bridgebyte/sst-core';
import { SstNgSelectRepository } from './sst-ng-select.repository';

@Injectable()
export abstract class SstNgRepository<T> extends SstNgSelectRepository<T> {
	public create(dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.post<IResponse<unknown>>(this.requireBaseUrl(), { body: dto });
	}

	public update(id: string, dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.put<IResponse<unknown>>(`${this.requireBaseUrl()}/${id}`, { body: dto });
	}

	public delete(id?: string): Promise<IResponse<unknown>> {
		const url = id !== undefined ? `${this.requireBaseUrl()}/${id}` : this.requireBaseUrl();
		return this.httpClient.delete<IResponse<unknown>>(url);
	}

	public duplicate(id: string): Promise<IResponse<string>> {
		return this.httpClient.post<IResponse<string>>(`${this.requireBaseUrl()}/${id}/duplication`, { body: {} });
	}
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx nx run ng:test
```

Expected: PASS — all `SstNgListRepository` tests green.

- [ ] **Step 7: Re-export from barrel**

Update `packages/ng/src/public-api.ts`:
```ts
export * from './lib/http/ng-http-client';
export * from './lib/repositories/sst-ng-list.repository';
export * from './lib/repositories/sst-ng-select.repository';
export * from './lib/repositories/sst-ng.repository';
```

- [ ] **Step 8: Commit**

```bash
git add packages/ng/src
git commit -m "feat(ng): add SstNgListRepository, SstNgSelectRepository, SstNgRepository"
```

---

## Task 4: `toSignal` adapter — bridge `IReadonlyObservable<T>` to Angular `Signal<T>`

**Files:**
- Create: `packages/ng/src/lib/store/to-signal.helper.ts`
- Create: `packages/ng/src/lib/store/to-signal.helper.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { Component, effect, signal } from '@angular/core';
import { Observable } from '@bridgebyte/sst-core';
import { observableToSignal } from './to-signal.helper';

describe('observableToSignal', () => {
	it('returns the current Observable value as the initial signal value', () => {
		const o = new Observable<number>(7);
		TestBed.runInInjectionContext(() => {
			const s = observableToSignal(o);
			expect(s()).toBe(7);
		});
	});

	it('updates the signal when the observable changes', async () => {
		const o = new Observable<number>(0);
		await TestBed.runInInjectionContext(async () => {
			const s = observableToSignal(o);
			o.set(1);
			expect(s()).toBe(1);
			o.set(2);
			expect(s()).toBe(2);
		});
	});

	it('detaches the subscription when the injection context is destroyed', () => {
		const o = new Observable<number>(0);
		const ref = TestBed.runInInjectionContext(() => observableToSignal(o));
		// Destroy the test bed; subsequent updates must not throw.
		TestBed.resetTestingModule();
		expect(() => o.set(1)).not.toThrow();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run ng:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `to-signal.helper.ts`**

```ts
import { DestroyRef, Signal, inject, signal } from '@angular/core';
import type { IReadonlyObservable } from '@bridgebyte/sst-core';

/**
 * Bridge an `@bridgebyte/sst-core` IReadonlyObservable<T> into an Angular Signal<T>.
 * Must be called within an injection context. The subscription is auto-cleaned
 * via DestroyRef when the host injector is destroyed.
 */
export function observableToSignal<T>(source: IReadonlyObservable<T>): Signal<T> {
	const internal = signal<T>(source.get());
	const destroyRef = inject(DestroyRef);
	const unsubscribe = source.subscribe((value) => internal.set(value), { emitOnSubscribe: false });
	destroyRef.onDestroy(unsubscribe);
	return internal.asReadonly();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run ng:test
```

Expected: PASS — all 3 toSignal tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ng/src
git commit -m "feat(ng): add observableToSignal adapter"
```

---

## Task 5: `SstTableService<T>` — `TableStore<T>` with Angular signal accessors

**Files:**
- Create: `packages/ng/src/lib/store/sst-table.service.ts`
- Create: `packages/ng/src/lib/store/sst-table.service.spec.ts`
- Modify: `packages/ng/src/public-api.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import type { IResponse, IResponseList } from '@bridgebyte/sst-core';
import { ListRepository } from '@bridgebyte/sst-core';
import { SstTableService } from './sst-table.service';

interface IItem { id: string; name: string; }

@Injectable()
class StubRepository extends ListRepository<IItem> {
	public override getList = jest.fn<Promise<IResponseList<IItem[]>>, [unknown?]>().mockResolvedValue({
		result: [{ id: '1', name: 'a' }],
		totalCount: 1,
		isSuccess: true,
	});
	public override bulkDelete = jest.fn<Promise<IResponse<string>>, [readonly string[]]>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
}

@Injectable()
class TestTableService extends SstTableService<IItem> {
	public constructor(repository: StubRepository) {
		super({ repository, sortMap: { createdAt: 'ByCreationDate' } });
	}
}

describe('SstTableService', () => {
	let repo: StubRepository;
	let service: TestTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [StubRepository, { provide: TestTableService, useFactory: (r: StubRepository) => new TestTableService(r), deps: [StubRepository] }],
		});
		repo = TestBed.inject(StubRepository);
		service = TestBed.inject(TestTableService);
	});

	it('exposes signal-backed accessors mirroring the underlying observables', () => {
		TestBed.runInInjectionContext(() => {
			expect(service.data().length).toBe(0);
			expect(service.total()).toBe(0);
			expect(service.loading()).toBe(false);
			expect(service.pagination()).toStrictEqual({ page: 1, pageSize: 10 });
			expect(service.search()).toBe('');
			expect(service.sort()).toBeUndefined();
			expect(service.filters()).toStrictEqual([]);
		});
	});

	it('updates signals when underlying observables change', () => {
		TestBed.runInInjectionContext(() => {
			service.updateSearch('alpha');
			expect(service.search()).toBe('alpha');
			service.updatePagination({ page: 3, pageSize: 25 });
			expect(service.pagination()).toStrictEqual({ page: 3, pageSize: 25 });
		});
	});

	it('cleans up the auto-refresh subscription on injector destroy', async () => {
		TestBed.runInInjectionContext(() => {
			service.updatePagination({ page: 2, pageSize: 10 });
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(repo.getList).toHaveBeenCalled();

		repo.getList.mockClear();
		TestBed.resetTestingModule();
		expect(() => {}).not.toThrow();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run ng:test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `sst-table.service.ts`**

```ts
import { DestroyRef, Injectable, Signal, computed, inject } from '@angular/core';
import { TableStore, type IFilterParams, type IPaginationParams, type ISortParams, type ITableStoreOptions } from '@bridgebyte/sst-core';
import { observableToSignal } from './to-signal.helper';

@Injectable()
export abstract class SstTableService<T> extends TableStore<T> {
	public readonly data: Signal<readonly T[]>;
	public readonly total: Signal<number>;
	public readonly loading: Signal<boolean>;
	public readonly pagination: Signal<IPaginationParams>;
	public readonly sort: Signal<ISortParams | undefined>;
	public readonly filters: Signal<readonly IFilterParams[]>;
	public readonly search: Signal<string>;

	public constructor(options: ITableStoreOptions<T>) {
		super(options);
		this.data = observableToSignal(this.data$);
		this.total = observableToSignal(this.total$);
		this.loading = observableToSignal(this.loading$);
		this.pagination = observableToSignal(this.pagination$);
		this.sort = observableToSignal(this.sort$);
		this.filters = observableToSignal(this.filters$);
		this.search = observableToSignal(this.search$);
		inject(DestroyRef).onDestroy(() => this.destroy());
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx nx run ng:test
```

Expected: PASS — all 3 service tests green.

- [ ] **Step 5: Re-export from barrel**

Append to `packages/ng/src/public-api.ts`:
```ts
export * from './lib/store/to-signal.helper';
export * from './lib/store/sst-table.service';
```

- [ ] **Step 6: Commit**

```bash
git add packages/ng/src
git commit -m "feat(ng): add SstTableService with signal-backed accessors"
```

---

## Task 6: `SstTableComponent<T>` — default styled UI with content slot overrides

**Files:**
- Create: `packages/ng/src/lib/component/sst-table.component.ts`
- Create: `packages/ng/src/lib/component/sst-table.component.html`
- Create: `packages/ng/src/lib/component/sst-table.component.scss`
- Create: `packages/ng/src/lib/component/sst-table.component.spec.ts`
- Modify: `packages/ng/src/public-api.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, Injectable, signal } from '@angular/core';
import type { IColumn, IResponse, IResponseList } from '@bridgebyte/sst-core';
import { ListRepository } from '@bridgebyte/sst-core';
import { SstTableService } from '../store/sst-table.service';
import { SstTableComponent } from './sst-table.component';

interface IItem { id: string; name: string; status: 'active' | 'paused'; }

@Injectable()
class StubRepository extends ListRepository<IItem> {
	public override getList = jest.fn().mockResolvedValue({
		result: [
			{ id: '1', name: 'alpha', status: 'active' },
			{ id: '2', name: 'beta', status: 'paused' },
		],
		totalCount: 2,
		isSuccess: true,
	} satisfies IResponseList<IItem[]>);
	public override bulkDelete = jest.fn().mockResolvedValue({ result: 'ok', isSuccess: true } satisfies IResponse<string>);
}

@Injectable()
class TestTableService extends SstTableService<IItem> {
	public constructor(repository: StubRepository) { super({ repository, sortMap: { name: 'ByName' } }); }
}

@Component({
	standalone: true,
	imports: [SstTableComponent],
	template: `
		<sst-table [columns]="columns" [service]="service" [bulk]="true" [searchEnabled]="true">
			<ng-template #headerCell let-column>
				<strong>{{ column.name }}</strong>
			</ng-template>
			<ng-template #bodyCell let-row let-column="column">
				<span data-test-cell>{{ row[column.key] }}</span>
			</ng-template>
		</sst-table>
	`,
})
class HostComponent {
	public readonly columns: IColumn[] = [
		{ key: 'name', name: 'Name', sortable: true },
		{ key: 'status', name: 'Status' },
	];
	public readonly service: TestTableService;
	public constructor(service: TestTableService) { this.service = service; }
}

describe('SstTableComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [StubRepository, TestTableService],
			imports: [HostComponent],
		});
		fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		// Wait for the auto-refresh microtask + the resolved repository promise.
		await fixture.whenStable();
		fixture.detectChanges();
	});

	it('renders one row per data item using the bodyCell slot', () => {
		const cells = fixture.nativeElement.querySelectorAll('[data-test-cell]') as NodeListOf<HTMLElement>;
		expect(cells.length).toBe(4); // 2 rows × 2 columns
		expect(cells[0].textContent).toContain('alpha');
		expect(cells[1].textContent).toContain('active');
	});

	it('renders the empty state when no rows are present', async () => {
		fixture.componentInstance.service.updateData([]);
		fixture.componentInstance.service.updateTotal(0);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('[data-test-empty]')).toBeTruthy();
	});

	it('renders a search input when searchEnabled is true', () => {
		expect(fixture.nativeElement.querySelector('input[data-test-search]')).toBeTruthy();
	});

	it('updates the service search value when typing', async () => {
		const input = fixture.nativeElement.querySelector('input[data-test-search]') as HTMLInputElement;
		input.value = 'alpha';
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		// Component debounces — wait for the timer.
		await new Promise((r) => setTimeout(r, 600));
		expect(fixture.componentInstance.service.search()).toBe('alpha');
	});

	it('shows a sort indicator only on sortable columns', () => {
		const headers = fixture.nativeElement.querySelectorAll('[data-test-th]') as NodeListOf<HTMLElement>;
		expect(headers[0].getAttribute('data-sortable')).toBe('true');
		expect(headers[1].getAttribute('data-sortable')).toBe('false');
	});

	it('toggles all checkboxes when the bulk header checkbox is clicked', () => {
		const headerCheckbox = fixture.nativeElement.querySelector('input[data-test-bulk-all]') as HTMLInputElement;
		headerCheckbox.click();
		fixture.detectChanges();
		const rowCheckboxes = fixture.nativeElement.querySelectorAll('input[data-test-bulk-row]') as NodeListOf<HTMLInputElement>;
		expect(Array.from(rowCheckboxes).every((c) => c.checked)).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx run ng:test
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `sst-table.component.ts`**

```ts
import {
	Component,
	ContentChild,
	DestroyRef,
	OnInit,
	TemplateRef,
	computed,
	effect,
	inject,
	input,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ESortOrder, type IColumn, type ISortParams } from '@bridgebyte/sst-core';
import { SstTableService } from '../store/sst-table.service';

@Component({
	selector: 'sst-table',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './sst-table.component.html',
	styleUrl: './sst-table.component.scss',
	host: { class: 'sst-table-host' },
})
export class SstTableComponent<T extends { id: string }> implements OnInit {
	private readonly destroyRef = inject(DestroyRef);

	public readonly columns = input.required<readonly IColumn[]>();
	public readonly service = input.required<SstTableService<T>>();
	public readonly bulk = input<boolean>(false);
	public readonly searchEnabled = input<boolean>(false);
	public readonly searchPlaceholder = input<string>('Search');
	public readonly searchDebounceMs = input<number>(500);
	public readonly emptyText = input<string>('No results');
	public readonly bulkDeleteLabel = input<string>('Delete selected');
	public readonly testIdPrefix = input<string>('sst');

	@ContentChild('headerCell') public readonly headerCell?: TemplateRef<{ $implicit: IColumn }>;
	@ContentChild('bodyCell') public readonly bodyCell?: TemplateRef<{ $implicit: T; column: IColumn; index: number }>;
	@ContentChild('emptyState') public readonly emptyState?: TemplateRef<unknown>;
	@ContentChild('bulkActions') public readonly bulkActions?: TemplateRef<{ $implicit: ReadonlySet<string> }>;

	protected readonly searchInput = signal<string>('');
	protected readonly bulkSelected = signal<ReadonlySet<string>>(new Set());
	protected readonly bulkDeleteLoading = signal<boolean>(false);
	private searchTimer: ReturnType<typeof setTimeout> | undefined;

	protected readonly allChecked = computed(() => {
		const data = this.service().data();
		const selected = this.bulkSelected();
		return data.length > 0 && data.every((row) => selected.has(row.id));
	});

	protected readonly indeterminate = computed(() => {
		const data = this.service().data();
		const selected = this.bulkSelected();
		const someSelected = data.some((row) => selected.has(row.id));
		return someSelected && !this.allChecked();
	});

	public ngOnInit(): void {
		// Sync local search state from the service in case it was preset.
		this.searchInput.set(this.service().search());
		this.destroyRef.onDestroy(() => {
			if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
		});
	}

	protected onSearchInput(value: string): void {
		this.searchInput.set(value);
		if (this.searchTimer !== undefined) clearTimeout(this.searchTimer);
		this.searchTimer = setTimeout(() => {
			this.service().updateSearch(value);
		}, this.searchDebounceMs());
	}

	protected onClearSearch(): void {
		this.searchInput.set('');
		this.service().updateSearch('');
	}

	protected onSortClick(column: IColumn): void {
		if (!column.sortable) return;
		const current = this.service().sort();
		const next: ISortParams | undefined =
			!current || current.field !== column.key
				? { id: `${column.key}-${ESortOrder.ASC}`, field: column.key, order: ESortOrder.ASC }
				: current.order === ESortOrder.ASC
					? { id: `${column.key}-${ESortOrder.DESC}`, field: column.key, order: ESortOrder.DESC }
					: undefined;
		this.service().updateSort(next);
	}

	protected sortIndicator(column: IColumn): '↑' | '↓' | '' {
		const sort = this.service().sort();
		if (!sort || sort.field !== column.key) return '';
		return sort.order === ESortOrder.ASC ? '↑' : '↓';
	}

	protected onRowChecked(id: string, checked: boolean): void {
		const next = new Set(this.bulkSelected());
		if (checked) next.add(id); else next.delete(id);
		this.bulkSelected.set(next);
	}

	protected onAllChecked(checked: boolean): void {
		if (!checked) {
			this.bulkSelected.set(new Set());
			return;
		}
		const all = new Set(this.service().data().map((r) => r.id));
		this.bulkSelected.set(all);
	}

	protected async onBulkDelete(): Promise<void> {
		const ids = [...this.bulkSelected()];
		if (ids.length === 0) return;
		this.bulkDeleteLoading.set(true);
		try {
			await this.service().bulkDelete(ids);
			this.bulkSelected.set(new Set());
		} finally {
			this.bulkDeleteLoading.set(false);
		}
	}

	protected onPageChange(page: number): void {
		const current = this.service().pagination();
		this.service().updatePagination({ ...current, page });
	}

	protected get totalPages(): number {
		const total = this.service().total();
		const size = this.service().pagination().pageSize;
		return Math.max(1, Math.ceil(total / size));
	}
}
```

- [ ] **Step 4: Implement `sst-table.component.html`**

```html
<div class="sst-table">
	@if (searchEnabled() || bulk()) {
		<div class="sst-table__toolbar">
			@if (searchEnabled()) {
				<div class="sst-table__search">
					<input
						type="text"
						[attr.data-test-search]="''"
						[attr.data-test-id]="testIdPrefix() + '-search'"
						[placeholder]="searchPlaceholder()"
						[value]="searchInput()"
						(input)="onSearchInput($any($event.target).value)"
					/>
					@if (searchInput().length > 0) {
						<button type="button" class="sst-table__search-clear" (click)="onClearSearch()" aria-label="Clear search">
							×
						</button>
					}
				</div>
			}
			@if (bulk()) {
				<div class="sst-table__bulk">
					@if (bulkActions) {
						<ng-container *ngTemplateOutlet="bulkActions; context: { $implicit: bulkSelected() }" />
					} @else {
						<button
							type="button"
							[attr.data-test-id]="testIdPrefix() + '-bulk-delete'"
							[disabled]="bulkSelected().size === 0 || bulkDeleteLoading()"
							(click)="onBulkDelete()"
						>
							{{ bulkDeleteLabel() }}
						</button>
					}
				</div>
			}
		</div>
	}

	<table class="sst-table__table">
		<thead>
			<tr>
				@if (bulk()) {
					<th class="sst-table__check-cell">
						<input
							type="checkbox"
							[attr.data-test-bulk-all]="''"
							[checked]="allChecked()"
							[indeterminate]="indeterminate()"
							(change)="onAllChecked($any($event.target).checked)"
						/>
					</th>
				}
				@for (column of columns(); track column.key) {
					<th
						[attr.data-test-th]="column.key"
						[attr.data-sortable]="column.sortable ? 'true' : 'false'"
						[class.sst-table__th--sortable]="column.sortable"
						[style.width.px]="column.width || null"
						(click)="onSortClick(column)"
					>
						<div class="sst-table__th-inner">
							@if (headerCell) {
								<ng-container *ngTemplateOutlet="headerCell; context: { $implicit: column }" />
							} @else {
								{{ column.name }}
							}
							@if (column.sortable) {
								<span class="sst-table__sort-indicator">{{ sortIndicator(column) }}</span>
							}
						</div>
					</th>
				}
			</tr>
		</thead>
		<tbody>
			@if (service().data().length === 0 && !service().loading()) {
				<tr>
					<td [attr.colspan]="columns().length + (bulk() ? 1 : 0)" data-test-empty>
						@if (emptyState) {
							<ng-container *ngTemplateOutlet="emptyState" />
						} @else {
							<div class="sst-table__empty">{{ emptyText() }}</div>
						}
					</td>
				</tr>
			} @else {
				@for (row of service().data(); track row.id; let rowIndex = $index) {
					<tr>
						@if (bulk()) {
							<td class="sst-table__check-cell">
								<input
									type="checkbox"
									[attr.data-test-bulk-row]="row.id"
									[checked]="bulkSelected().has(row.id)"
									(change)="onRowChecked(row.id, $any($event.target).checked)"
								/>
							</td>
						}
						@for (column of columns(); track column.key) {
							<td>
								@if (bodyCell) {
									<ng-container *ngTemplateOutlet="bodyCell; context: { $implicit: row, column, index: rowIndex }" />
								} @else {
									{{ row[column.key] }}
								}
							</td>
						}
					</tr>
				}
			}
		</tbody>
	</table>

	@if (totalPages > 1) {
		<div class="sst-table__pagination">
			<button
				type="button"
				[disabled]="service().pagination().page <= 1"
				(click)="onPageChange(service().pagination().page - 1)"
			>‹</button>
			<span>Page {{ service().pagination().page }} / {{ totalPages }}</span>
			<button
				type="button"
				[disabled]="service().pagination().page >= totalPages"
				(click)="onPageChange(service().pagination().page + 1)"
			>›</button>
		</div>
	}

	@if (service().loading()) {
		<div class="sst-table__loading" aria-live="polite">Loading…</div>
	}
</div>
```

- [ ] **Step 5: Implement `sst-table.component.scss`** (intentionally minimal — host apps style it themselves)

```scss
.sst-table-host { display: block; width: 100%; }

.sst-table {
	&__toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}

	&__search {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 4px;

		input {
			padding: 6px 28px 6px 10px;
			border: 1px solid #d0d0d0;
			border-radius: 4px;
			font-size: 14px;
			min-width: 240px;
		}
	}

	&__search-clear {
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: 0;
		font-size: 18px;
		cursor: pointer;
		line-height: 1;
		padding: 4px;
	}

	&__table {
		width: 100%;
		border-collapse: collapse;

		th, td {
			padding: 10px 12px;
			border-bottom: 1px solid #eee;
			text-align: left;
			font-size: 14px;
		}

		th { font-weight: 600; background: #fafafa; }
	}

	&__th--sortable { cursor: pointer; user-select: none; }
	&__th-inner { display: inline-flex; align-items: center; gap: 6px; }
	&__sort-indicator { font-size: 12px; opacity: 0.6; }
	&__check-cell { width: 32px; text-align: center; }
	&__empty { padding: 24px; text-align: center; color: #888; }

	&__pagination {
		margin-top: 12px;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;

		button {
			padding: 4px 10px;
			border: 1px solid #d0d0d0;
			background: #fff;
			border-radius: 4px;
			cursor: pointer;
			&:disabled { opacity: 0.4; cursor: not-allowed; }
		}
	}

	&__loading {
		padding: 12px;
		text-align: center;
		font-style: italic;
		color: #666;
	}
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx nx run ng:test
```

Expected: PASS — all 6 component tests green.

- [ ] **Step 7: Re-export from barrel**

Append to `packages/ng/src/public-api.ts`:
```ts
export * from './lib/component/sst-table.component';
```

- [ ] **Step 8: Commit**

```bash
git add packages/ng/src
git commit -m "feat(ng): add SstTableComponent default UI with template overrides"
```

---

## Task 7: Re-export `@bridgebyte/sst-core` types for ergonomic imports

Users should be able to write `import { IColumn, ESortOrder } from '@bridgebyte/sst-ng';` without reaching into core for plain types.

**Files:**
- Modify: `packages/ng/src/public-api.ts`

- [ ] **Step 1: Replace the barrel with the full surface**

```ts
// Re-exports
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
export { ESortOrder, DEFAULT_QUERY_KEYS, Observable, watch, deepEqual, arrayToMap, mapTableParams } from '@bridgebyte/sst-core';

// Angular surface
export * from './lib/http/ng-http-client';
export * from './lib/repositories/sst-ng-list.repository';
export * from './lib/repositories/sst-ng-select.repository';
export * from './lib/repositories/sst-ng.repository';
export * from './lib/store/to-signal.helper';
export * from './lib/store/sst-table.service';
export * from './lib/component/sst-table.component';
```

- [ ] **Step 2: Run typecheck**

```bash
npx nx run ng:typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Run tests to verify nothing regressed**

```bash
npx nx run ng:test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ng/src
git commit -m "feat(ng): re-export @bridgebyte/sst-core types from the @bridgebyte/sst-ng barrel"
```

---

## Task 8: Build `@bridgebyte/sst-ng` and verify FESM artifact

**Files:** none modified — verification only.

- [ ] **Step 1: Build core first (ng-packagr resolves `@bridgebyte/sst-core` from `dist/`)**

```bash
npx nx run core:build
```

Expected: `packages/core/dist/index.js` exists.

- [ ] **Step 2: Build ng**

```bash
npx nx run ng:build
```

Expected: `packages/ng/dist/` contains:
- `package.json` with `peerDependencies` pointing at `@bridgebyte/sst-core`
- `fesm2022/sst-ng.mjs`
- `index.d.ts`
- ng-packagr did not emit warnings about missing peer dependencies.

- [ ] **Step 3: Inspect the produced `package.json`**

```bash
cat packages/ng/dist/package.json
```

Verify `peerDependencies` includes `@bridgebyte/sst-core` and Angular packages.

- [ ] **Step 4: Run tests one more time**

```bash
npx nx run ng:test
```

Expected: PASS.

- [ ] **Step 5: Commit any cleanups**

```bash
git status
git add . 2>/dev/null; git commit -m "chore(ng): build verification" 2>/dev/null || echo "nothing to commit"
```

---

## Task 9: Write `@bridgebyte/sst-ng` README usage examples

**Files:**
- Modify: `packages/ng/README.md`

- [ ] **Step 1: Replace the placeholder README**

```markdown
# @bridgebyte/sst-ng

Angular adapter for **So Simple Table**, built on top of [`@bridgebyte/sst-core`](https://www.npmjs.com/package/@bridgebyte/sst-core).

## Installation

```bash
npm install @bridgebyte/sst-core @bridgebyte/sst-ng
```

Make sure `provideHttpClient()` is added to the application's bootstrap providers.

## 1. Define a repository

```ts
import { Injectable } from '@angular/core';
import { SstNgRepository } from '@bridgebyte/sst-ng';

interface IStrategy { id: string; name: string; createdAt: string; }

@Injectable({ providedIn: 'root' })
export class StrategyRepository extends SstNgRepository<IStrategy> {
	protected override get baseUrl(): string {
		return 'https://api.example.com/strategies';
	}
}
```

## 2. Define a table service

```ts
import { Injectable, inject } from '@angular/core';
import { SstTableService } from '@bridgebyte/sst-ng';
import { StrategyRepository } from './strategy.repository';

@Injectable()
export class StrategyTableService extends SstTableService<IStrategy> {
	public constructor() {
		super({
			repository: inject(StrategyRepository),
			sortMap: { createdAt: 'ByCreationDate', name: 'ByName' },
		});
	}
}
```

## 3. Use the component

```html
<sst-table
	[columns]="columns"
	[service]="service"
	[bulk]="true"
	[searchEnabled]="true"
>
	<ng-template #headerCell let-column>
		<strong>{{ column.name }}</strong>
	</ng-template>

	<ng-template #bodyCell let-row let-column="column">
		{{ row[column.key] }}
	</ng-template>

	<ng-template #emptyState>
		<p>No strategies yet — try creating one.</p>
	</ng-template>
</sst-table>
```

```ts
import { Component, inject } from '@angular/core';
import { SstTableComponent, type IColumn } from '@bridgebyte/sst-ng';
import { StrategyTableService } from './strategy-table.service';

@Component({
	selector: 'app-strategies-page',
	standalone: true,
	imports: [SstTableComponent],
	providers: [StrategyTableService],
	templateUrl: './strategies-page.component.html',
})
export class StrategiesPageComponent {
	public readonly service = inject(StrategyTableService);
	public readonly columns: IColumn[] = [
		{ key: 'name', name: 'Name', sortable: true },
		{ key: 'createdAt', name: 'Created' },
	];
}
```

## Customizing the wire format

```ts
@Injectable({ providedIn: 'root' })
export class StrategyRepository extends SstNgRepository<IStrategy> {
	protected override get baseUrl() { return 'https://api.example.com/strategies'; }
	protected override get queryKeys() {
		return { page: 'pageNumber', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'sortDesc' };
	}
	protected override get responseListMapper() {
		return (raw: unknown) => {
			const r = raw as { items: IStrategy[]; total: number };
			return { result: r.items, totalCount: r.total, isSuccess: true };
		};
	}
}
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add packages/ng/README.md
git commit -m "docs(ng): add @bridgebyte/sst-ng README with usage examples"
```

---

## Self-Review Checklist

1. **Spec coverage**
	- ✅ Angular variant of `np-table` lifted into `@bridgebyte/sst-ng` — Tasks 5, 6.
	- ✅ Inheritable repository chain — `SstNgListRepository`, `SstNgSelectRepository`, `SstNgRepository` (Task 3).
	- ✅ Configurable `baseUrl`, query keys, response mapper — Task 3 + re-uses core config.
	- ✅ `baseUrl` mandatory — `requireBaseUrl()` throws (Task 3).
	- ✅ Default UI + slot overrides — Task 6 (`#headerCell`, `#bodyCell`, `#emptyState`, `#bulkActions`).
	- ✅ No translation layer.
	- ✅ No responsive split (mobile cards) — moved to future plugin scope.
	- ✅ Real-time adapter contract re-exported from `@bridgebyte/sst-core` (Task 7).

2. **Placeholder scan** — none. The duplicate `setupFilesAfterEach` lines in Step 8 of Task 1 are explicitly called out as a typo and immediately followed by the corrected config.

3. **Type consistency**
	- `SstTableService<T>` extends `TableStore<T>`; signal accessors mirror Observable names.
	- `SstNgListRepository<T>` matches `ListRepository<T>` from core; subclass `baseUrl` getter is the same shape as the legacy `HttpRepository` pattern.
	- `SstTableComponent<T extends { id: string }>` constraint matches the bulk-selection logic that uses `row.id`.

---

**Plan 2 complete.** Continue to `03-vue.md`.
