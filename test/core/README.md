# @sst/core — browser smoke test

Vanilla TypeScript + Vite app that imports `@sst/core` from the local Verdaccio
registry and exercises the public API in a real browser.

## Run

From the repo root:

```bash
# 1. start the local registry (separate terminal)
npm run registry

# 2. publish @sst/core (one-off, or after every change)
cd packages/core && npm run build && npm publish && cd ../..

# 3. install + run the test app
cd test/core
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173/).

## What it covers

- **Import smoke** — lists every export pulled from `@sst/core` so module
  resolution, ESM/CJS dual-format, and bundler tree-shaking are observable.
- **`Observable<T>`** — a counter exercising `get/set/subscribe` and the
  `Object.is` dedup behavior.
- **`TableStore<T>`** — a 47-row stub `ListRepository` that drives the full
  pipeline: pagination, sort, filters, search, auto-refresh on change,
  loading state, page-decrement on empty result, and the call log.

## Why it lives outside `packages/*`

`packages/*` are workspace members and would resolve `@sst/core` via a symlink.
`test/core/` is **not** a workspace, so its `npm install` goes through the
real registry (Verdaccio in dev) — which is the only way to actually verify the
published artifact.
