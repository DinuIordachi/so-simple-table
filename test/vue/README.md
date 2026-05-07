# @sst/vue — browser smoke test

Vue 3 + Vite app that imports `@sst/core` and `@sst/vue` from the local Verdaccio registry and renders a real table backed by [dogapi.dog](https://dogapi.dog/api/v2/breeds).

## Run

From the repo root:

```bash
# 1. start the local registry (separate terminal)
npm run registry

# 2. publish (one-off, after each library change)
npx nx run-many -t build -p core,vue
cd packages/core && npm publish && cd ../..
cd packages/vue && npm publish && cd ../..

# 3. install + run
cd test/vue
npm install
npm run dev
```

Open http://localhost:5173/.

## What it covers

- **Import smoke** — `@sst/core` + `@sst/vue` resolve from Verdaccio.
- **`<SstTable>`** — renders 283 breeds with default pagination.
- **`useTableStore`** — reactive `Ref` exposure of the headless store.
- **Custom queryKeys** — JSON:API `page[number]` / `page[size]`.
- **`responseListMapper`** — flattens `data[].attributes` and reads `totalCount` from `meta.pagination.records`.
- **JsonApiHttpClient** — works around `FetchHttpClient`'s `application/json`-only content-type sniff.
