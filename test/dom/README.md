# @sst/dom — browser smoke test

Vanilla TypeScript + Vite app that imports `@sst/core` AND `@sst/dom` from the
local Verdaccio registry and renders a real table backed by a public API
([dogapi.dog](https://dogapi.dog/api/v2/breeds)) in the browser.

## Run

From the repo root:

```bash
# 1. start the local registry (separate terminal)
npm run registry

# 2. publish (one-off, or after every change)
cd packages/core && npm run build && npm publish
cd ../dom && npm run build && npm publish
cd ../..

# 3. install + run the test app
cd test/dom
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173/).

## What it covers

- **Import smoke** — lists every export pulled from `@sst/core`. Confirms
  module resolution, ESM/CJS dual-format, and bundler tree-shaking work
  end-to-end (Verdaccio → npm install → Vite → browser bundle).
- **`mountTable` from `@sst/dom`** — drops a working table into `#my-table`.
  Header sort cycles ASC → DESC → off (disabled here because dogapi doesn't
  support sort), pagination buttons walk through ~283 breeds, the
  `hypoallergenic` column uses the per-column `render` escape hatch to emit
  a colored badge.
- **Configurable `HttpListRepository`** — exercises `queryKeys` (JSON:API
  style `page[number]` / `page[size]`) and `responseListMapper` (flattens
  `data[].attributes` and pulls `totalCount` from `meta.pagination.records`).
- **Custom `IHttpClient`** — the test app wraps `FetchHttpClient` so the call
  log can show every outgoing request.

## Why it lives outside `packages/*`

`packages/*` are workspace members and would resolve `@sst/core` /
`@sst/dom` via symlinks. `test/dom/` is **not** a workspace, so its
`npm install` goes through Verdaccio — which is the only way to verify
the published artifacts.
