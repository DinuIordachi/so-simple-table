# So Simple Table

A framework-agnostic table library with pluggable framework variants.

## Packages

- **[@bridgebyte/sst-core](packages/core)** — pure JS/TS reactive table state and configurable repositories.
- **[@bridgebyte/sst-dom](packages/dom)** — vanilla DOM variant; renders a `TableStore` as an HTML table via `mountTable`.
- **[@bridgebyte/sst-ng](packages/ng)** — Angular 20+ adapter and default UI component.
- **[@bridgebyte/sst-vue](packages/vue)** — Vue 3 adapter with composables, the `defineTable` factory, and SFC.
- **@bridgebyte/sst-react** — React 18+ adapter _(planned; not yet implemented)_.

## Implementation plans

Detailed task-by-task implementation plans live at the repo root:

1. [`01-core.md`](01-core.md)
2. [`02-angular.md`](02-angular.md)
3. [`03-vue.md`](03-vue.md)
4. [`04-react.md`](04-react.md)

## Getting started

```bash
npm install
npx nx run-many -t typecheck
```

That's all you need to **develop the library**. npm workspaces symlink the
`@bridgebyte/sst-*` packages into the root `node_modules`, so edits in `packages/*` are
picked up live — no registry required.

## Local end-to-end testing (Verdaccio)

The apps under [`test/`](test) are standalone consumers that install the
**published** `@bridgebyte/sst-*` packages from a local [Verdaccio](https://verdaccio.org/)
registry (`http://localhost:4873`) — exactly as a downstream user would. Use
them to verify the published artifacts, not just the source.

### One command

With the registry running (or it will start automatically):

```bash
npm run publish:local -- --with-tests
```

This builds every package, (re)publishes each `@bridgebyte/sst-*` package to the local
registry, then refreshes and installs the `test/*` apps. Drop `--with-tests` to
publish only; add `--no-build` to publish the current `dist/` as-is. Stop a
registry it started with `npm run registry:stop`.

Then run an app, e.g.:

```bash
npm --prefix test/ng start      # Angular  → http://localhost:5173
npm --prefix test/vue run dev   # Vite/Vue
npm --prefix test/dom run dev   # Vite/vanilla DOM
```

### Manual steps (what the script automates)

```bash
# 1. Start the local registry (leave running in its own terminal)
npm run registry          # = verdaccio --config .verdaccio/config.yaml

# 2. Create a user (publish requires auth per .verdaccio/config.yaml)
npm adduser --registry http://localhost:4873

# 3. Build all packages
npx nx run-many -t build

# 4. Publish each @bridgebyte/sst-* package to the local registry.
#    core/dom/react/vue publish from their package root; @bridgebyte/sst-ng is built by
#    ng-packagr and publishes from packages/ng/dist.
npm publish ./packages/core --registry http://localhost:4873
npm publish ./packages/dom --registry http://localhost:4873
npm publish ./packages/react --registry http://localhost:4873
npm publish ./packages/vue --registry http://localhost:4873
npm publish ./packages/ng/dist --registry http://localhost:4873

# 5. Now the test app install will resolve
cd test/ng && npm install
```

> **EINTEGRITY on install?** The `test/*` lockfiles pin localhost tarball hashes
> that change on every republish, so a stale lockfile makes npm reject the
> download. Delete the lockfile and `node_modules`, then reinstall:
>
> ```bash
> rm -rf test/<app>/node_modules test/<app>/package-lock.json
> npm install --prefix test/<app>
> ```
>
> These lockfiles are gitignored for that reason, and
> `publish:local --with-tests` does this refresh for you.

## Workspace tooling

- **Monorepo:** npm workspaces + Nx
- **Build:** tsup (core/react), Vite (vue), ng-packagr (ng)
- **Test:** Vitest (core/vue/react), Jest + jest-preset-angular (ng)
- **Format:** Prettier
- **Lint:** ESLint + @typescript-eslint
