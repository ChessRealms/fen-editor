# FEN Editor

A chess position editor built with Angular 22, standalone components and zoneless change detection. Place, erase, paint and drag pieces; the current readonly output is **piece placement only**, the first FEN field.

[Roadmap and MVP decisions](docs/ROADMAP.md) · [Agent instructions](AGENTS.md)

## Run locally

Use the Node version in [.node-version](.node-version) (also mirrored in `.nvmrc`) and the npm version in [package.json](package.json).

```sh
npm ci
npm start
```

Open [localhost:4200](http://localhost:4200).

## Checks

| Command | Purpose |
| --- | --- |
| `npm run lint` | TypeScript and template lint |
| `npm test -- --watch` | Vitest during development |
| `npm run test:ci` | Component tests once, with coverage |
| `npm run build` | Production output in `dist/fen-editor/browser/` |
| `npm run e2e` | Chromium tests against an automatically built/served production app |
| `npm run audit:ci` | Full dependency audit; high/critical findings fail |

Before the first E2E run, use `npx playwright install chromium` (`--with-deps` on Linux). With `CI=true`, run the build before E2E; the test preview uses `127.0.0.1:4173`. Tests stop the preview automatically.

[CI](.github/workflows/ci.yml) runs checks on PRs and main; [Dependabot](.github/dependabot.yml) checks updates weekly. Generated reports stay in ignored output folders or CI artifacts. Keep `package-lock.json` in Git for reproducible installs.

Current behavior lives in the implementation/tests; the roadmap tracks unfinished work and decisions. Do not maintain per-PR reports or duplicate code documentation.
