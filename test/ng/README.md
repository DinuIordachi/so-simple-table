# @sst/ng — browser smoke test

Standalone Angular 20 app that imports `@sst/core` and `@sst/ng` from the local Verdaccio registry and renders a real table backed by [dogapi.dog](https://dogapi.dog/api/v2/breeds).

## Run

From the repo root:

```bash
# 1. start the local registry (separate terminal)
npm run registry

# 2. publish (one-off, after each library change)
npx nx run-many -t build -p core,ng
cd packages/core && npm publish && cd ../..
cd packages/ng && npm publish ./dist --registry http://localhost:4873/ && cd ../..

# 3. install + run
cd test/ng
npm install
npm start
```

Open http://localhost:5173/.

## What it covers

- **Import smoke** — `@sst/core` + `@sst/ng` resolve from Verdaccio.
- **`<sst-table>`** — renders 283 breeds with pagination.
- **Custom queryKeys** — JSON:API `page[number]` / `page[size]`.
- **`responseListMapper`** — flattens `data[].attributes` and reads `totalCount` from `meta.pagination.records`.
- **Content slots** — per-cell template via `#bodyCell` for description truncation and a hypoallergenic badge.
