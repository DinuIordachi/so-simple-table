# Graph Report - .  (2026-06-29)

## Corpus Check
- 181 files · ~92,465 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1198 nodes · 1680 edges · 96 communities (77 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `TableStore` - 36 edges
2. `IResponse` - 36 edges
3. `IResponseList` - 27 edges
4. `IPaginationParams` - 24 edges
5. `compilerOptions` - 22 edges
6. `ListRepository` - 20 edges
7. `ISortParams` - 19 edges
8. `IFilterParams` - 18 edges
9. `IHttpClient` - 17 edges
10. `$()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `DOM Sort Cycle (ASC/DESC/off)` --semantically_similar_to--> `SstTableComponent Angular Template`  [INFERRED] [semantically similar]
  /Users/dinuiordachi/Projects/so-simple-table/packages/dom/README.md → /Users/dinuiordachi/Projects/so-simple-table/packages/ng/src/lib/component/sst-table.component.html
- `StubRepository` --inherits--> `ListRepository`  [EXTRACTED]
  packages/ng/src/lib/component/sst-table.component.spec.ts → packages/core/src/repositories/list.repository.ts
- `IRenderHeadResult` --references--> `ISortParams`  [EXTRACTED]
  packages/dom/src/render/render-head.ts → packages/core/src/types/sort.ts
- `makeHost()` --calls--> `useTableStore()`  [EXTRACTED]
  packages/vue/src/lib/components/SstTable.test.ts → packages/vue/src/lib/composables/use-table-store.ts
- `Local Verdaccio Registry` --conceptually_related_to--> `@bridgebyte/sst-core Package`  [INFERRED]
  /Users/dinuiordachi/Projects/so-simple-table/.verdaccio/config.yaml → /Users/dinuiordachi/Projects/so-simple-table/README.md

## Import Cycles
- 1-file cycle: `packages/vue/src/index.ts -> packages/vue/src/index.ts`

## Hyperedges (group relationships)
- **Framework Observable Bridge Pattern** — vue_use_observable, ng_observable_to_signal, react_use_observable_hook [INFERRED 0.95]
- **Responsive Layout Cascade System** — plans_responsive_resolve_layout_slot, plans_responsive_use_breakpoint, plans_responsive_table_breakpoint_prop [EXTRACTED 1.00]
- **Declarative Backend Convention Options** — plans_declarative_backend_pagination_style, plans_declarative_backend_sort_style, plans_declarative_backend_search_endpoint [EXTRACTED 1.00]
- **All adapter packages (dom, ng, vue) wrap core TableStore** — dom_readme_mount_table, ng_readme_sst_table_service, vue_readme_use_table_store [EXTRACTED 1.00]
- **All test apps verify packages via Verdaccio (not workspace symlinks)** — test_dom_readme_smoke_test_app, test_ng_readme_smoke_test_app, test_vue_readme_smoke_test_app [EXTRACTED 1.00]
- **All test apps use dogapi.dog as their live backend** — test_dom_readme_smoke_test_app, test_ng_readme_smoke_test_app, test_vue_readme_smoke_test_app [EXTRACTED 1.00]

## Communities (96 total, 19 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (43): defineTable(), IDefineTableConfig, useObservable(), IUseTableStoreReturn, useTableStore(), IItem, defaultMapFilters(), extractFilterValue() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (51): FetchHttpClient, HttpListRepository<T>, IHttpClient, IRepositoryConfig, ITableStore<T>, ListRepository<T>, mapTableParams, Observable<T> (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (48): author, bugs, url, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms (+40 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (44): cache, dependsOn, inputs, outputs, cache, namedInputs, default, production (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (40): author, bugs, url, @bridgebyte/sst-core, happy-dom, tsup, vitest, exports (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (39): description, devDependencies, happy-dom, react, react-dom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (23): IRenderBodyOptions, IRenderBodyResult, renderBody(), COLUMNS, IItem, IRenderHeadOptions, IRenderHeadResult, renderHead() (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (36): paginationStyle (offset/page) Config, searchEndpoint Routing Config, sortStyle (flag/direction) Config, @bridgebyte/sst-core Package, FetchHttpClient, HttpListRepository<T>, HttpRepository<T>, IHttpClient (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (35): author, bugs, url, description, devDependencies, tsup, vitest, exports (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (34): build, serve, builder, configurations, defaultConfiguration, options, development, production (+26 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (28): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (27): dependencies, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-browser-dynamic (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (5): IItem, IRaw, FetchHttpClient, NgHttpClient, IHttpRequestOptions

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (13): columns, IItem, makeHost(), SstTableComponent, StubRepository, IItem, StubRepository, ListRepository (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (11): searchColumn(), withMatchModes(), BREAKPOINT_MIN_WIDTH, BREAKPOINT_ORDER, BreakpointToken, rank(), RESERVED_LAYOUT_SLOTS, resolveLayoutSlot() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (7): HostComponent, IItem, StubRepository, TestTableService, SstTableComponent, IColumn, IColumnFilterOption

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (21): dependsOn, executor, options, outputs, implicitDependencies, executor, options, name (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (21): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, typeCheckHostBindings, compileOnSave, importHelpers (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (21): dependsOn, executor, options, outputs, implicitDependencies, executor, options, name (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (13): BreedRepository, buildUrl(), callLog, columns, exportsList, handle, IBreed, IDogApiResponse (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (21): dependsOn, executor, options, outputs, implicitDependencies, executor, options, name (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (20): dependencies, @bridgebyte/sst-core, @bridgebyte/sst-vue, primevue, @primevue/themes, vue, description, devDependencies (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (19): executor, options, outputs, executor, options, name, script, projectType (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (19): executor, options, outputs, executor, options, name, script, projectType (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (18): description, name, type, version, author, engines, node, files (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (6): HttpRepository, IItem, TestRepo, SstNgRepository, SstNgSelectRepository, IResponse

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (18): description, devDependencies, vite, @vitejs/plugin-vue, vue-tsc, name, scripts, build (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (18): compilerOptions, jsx, include, allowImportingTsExtensions, isolatedModules, lib, module, moduleResolution (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): allowImportingTsExtensions, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch, noUnusedLocals (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.26
Nodes (5): IFetchHttpClientOptions, Method, Repository, SelectRepository, IBaseItem

### Community 30 - "Community 30"
Cohesion: 0.26
Nodes (16): args, buildAll(), die(), ensureAuth(), ensureRegistry(), installTestApps(), log(), main() (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (15): dependencies, @bridgebyte/sst-core, @bridgebyte/sst-dom, typescript, vite, private, dev, preview (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (6): BrokenRepository, CustomKeysRepository, IItem, StrategyRepository, SstNgListRepository, ResponseListMapper

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (14): devDependencies, vite, @vitejs/plugin-vue, vue-tsc, eslint, @eslint/js, eslint-plugin-vue, happy-dom (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (5): AppComponent, BreedRepository, IBreed, IDogApiResponse, BreedTableService

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (6): HttpListRepository, IItem, TestRepository, HttpQueryParams, IHttpClient, IRepositoryConfig

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (11): test/primevue index.html Entry, defaultMapFilters Export, ISstLayoutSlotProps<T> Typed Layout Slot Props, Filter Helpers (searchColumn, withMatchModes), SstDataTable Inline Editing (onSave, optimistic + rollback), @bridgebyte/sst-vue/primevue Subpath, Responsive Layout Slots (#xs..#2xl) on SstDataTable, SstDataTable Selection API (selection, clearSelection, removeSelected) (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (10): exports, ./package.json, ./primevue, ./style.css, import, import, require, types (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (8): emitDecoratorMetadata, noUncheckedIndexedAccess, useDefineForClassFields, extends, files, references, compilerOptions, experimentalDecorators

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, include, declaration, declarationMap, outDir, types, extends

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (7): declaration, declarationMap, outDir, types, extends, compilerOptions, include

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): compilerOptions, declarationMap, outDir, types, exclude, extends, include

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, outDir, rootDir, types, extends, include

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, types, extends, include

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, types, extends, files, include

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (6): angularCompilerOptions, compilationMode, compilerOptions, declarationMap, paths, extends

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (7): scripts, build, clean, lint, test, test:watch, typecheck

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (3): HttpSelectRepository, IItem, TestRepository

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): assets, dest, lib, entryFile, $schema

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, types, extends, include

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, exclude, extends

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): IBreed, IDogApiResponse, useBreedTable

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): IDummyJsonResponse, IProduct, useProductsTable

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (4): peerDependencies, @bridgebyte/sst-core, primevue, vue

### Community 56 - "Community 56"
Cohesion: 0.50
Nodes (4): repository, directory, type, url

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): peerDependenciesMeta, primevue, optional

## Knowledge Gaps
- **629 isolated node(s):** `$schema`, `default`, `production`, `cache`, `dependsOn` (+624 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IResponse` connect `Community 25` to `Community 0`, `Community 32`, `Community 35`, `Community 6`, `Community 13`, `Community 15`, `Community 49`, `Community 29`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `TableStore` connect `Community 0` to `Community 13`, `Community 6`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `SstTableComponent` connect `Community 15` to `Community 0`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `$schema`, `default`, `production` to the rest of the system?**
  _629 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05638544077424784 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05333333333333334 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._