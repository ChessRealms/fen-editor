# FEN Editor

A chess position editor built with Angular 22.2, standalone components and zoneless change detection.

The current shell supports choosing pieces, placing and erasing them, mouse painting, dragging pieces on the board and dragging from the palette. The readonly output contains **piece placement only**, the first field of FEN. Full FEN import, metadata controls and the complete touch/keyboard workflows are planned in later PRs.

## Requirements

- Node.js 24.21.0 (`.node-version` / `.nvmrc`).
- npm 11.19.1 (`packageManager` in package.json).

## Local development

```sh
npm ci
npm start
```

Open http://localhost:4200. The dev server rebuilds when source files change.

## Checks

```sh
npm run lint
npm test
npm run test:ci
npm run build
npx playwright install chromium
npm run e2e
npm run audit:ci
```

- `npm test` uses Angular CLI's Vitest integration; use `-- --watch` to explicitly enable watch mode or `-- --no-watch` for one run.
- `test:ci` runs component tests once with coverage under `coverage/`.
- `build` writes the production application to `dist/fen-editor/browser/`.
- `e2e` builds and starts a local production preview automatically. When `CI=true`, it expects `npm run build` to have run first. The preview binds only to `127.0.0.1:4173` and stops with the test run.
- `npx playwright install --with-deps chromium` also installs browser system dependencies on Linux.
- Playwright writes its HTML report to `playwright-report/` and failure traces/screenshots to `test-results/`.
- The audit includes development dependencies and fails at high/critical severity.

## Continuous integration

GitHub Actions runs lint, component tests, production build and Chromium E2E on pull requests and pushes to main. A separate job audits the full lockfile. Actions are pinned to commits; reports are retained for seven days. Dependabot checks npm dependencies and Actions weekly.

## Implementation boundaries

The shell uses signals/computed and signal inputs/outputs. The existing placement parser and board types remain a temporary adapter for PR-03/04. No router, Zone.js, Karma or Jasmine is installed. SVGs live in `public/assets/`.

- [PR-01: contracts, baseline and target platform](docs/planning/pr-01/README.md)
- [PR-02: implementation and validation](docs/planning/pr-02/README.md)

Undo/redo, shareable URLs, persistence and chess variants are outside the MVP.
