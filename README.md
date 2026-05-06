# So Simple Table

A framework-agnostic table library with pluggable framework variants.

## Packages

- **[@sst/core](packages/core)** — pure JS/TS reactive table state and configurable repositories.
- **[@sst/ng](packages/ng)** — Angular 20+ adapter and default UI component.
- **[@sst/vue](packages/vue)** — Vue 3 adapter with composables and SFC.
- **[@sst/react](packages/react)** — React 18+ adapter with hooks and component.

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

## Workspace tooling

- **Monorepo:** npm workspaces + Nx
- **Build:** tsup (core/react), Vite (vue), ng-packagr (ng)
- **Test:** Vitest (core/vue/react), Jest + jest-preset-angular (ng)
- **Format:** Prettier
- **Lint:** ESLint + @typescript-eslint
