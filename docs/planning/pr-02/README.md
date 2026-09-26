# PR-02: Angular 22 editor shell

Implemented on `feature/fen-editor-modernization`, together with the PR-01 planning package. No commit, push or remote PR was created by the implementation task.

## Scope delivered

- Fresh Angular CLI 22.2 scaffold configuration, strict TypeScript/templates, standalone components and default zoneless bootstrap.
- Signals/computed for local state and signal inputs/outputs for component interaction. Board writes copy the legacy board before publishing a new signal value.
- Existing placement, erase, mouse painting, board drag/drop and palette drag/drop preserved. Mouse release outside the board ends painting.
- Modern template control flow, an explicit SVG asset map and assets relocated unchanged to `public/`.
- Correct a8 square color, equal board rows, labeled buttons and basic responsive styling. Layout checks cover desktop, 375px and 320px widths.
- Router, Zone.js, Karma/Jasmine, unused animations/platform-browser-dynamic/forms and old orientation pipes removed.
- ESLint, native Angular/Vitest component tests, Playwright production-build smoke tests, GitHub Actions and Dependabot configured.
- README and VS Code test launch updated for the new tooling.

The placement parser and domain types remain a temporary adapter. Full six-field FEN import/validation, metadata controls, Copy/Clear/Reset/Flip, Pointer Events, roving keyboard focus and full accessibility verification remain PR-03 through PR-07 work. The UI does not claim to export a complete FEN.

## Toolchain decisions

Node is pinned to 24.21.0 and npm to 11.19.1. Angular framework/CLI/build use 22.2.0, TypeScript 6.0.3 and jsdom 30.1.1. The generated scaffold offered Vitest 5; this implementation retains the planned Vitest/coverage-v8 4.1.11 pair, explicitly supported by Angular build 22.2.0 and verified through its native unit-test builder.

ESLint was updated from the planned, now unsupported 9.39.5 to 10.11.0 with `@eslint/js` 10.0.1. angular-eslint 22.5.0 and typescript-eslint 8.70.1 declare compatible peers. The existing Angular 17 tree was backed up locally before generating a clean lockfile; no `--force`, `--legacy-peer-deps`, audit suppression or forced audit fix was used.

## Verification on 2026-09-27

Checks ran locally on Windows with Node 24.21.0 and npm 11.19.1, except the registry audit which used the host npm 11.19.1. GitHub Actions has not run remotely because nothing has been pushed.

| Check | Result |
| --- | --- |
| Fresh installation and subsequent `npm ci` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; final initial JS/CSS approximately 134.45 kB versus 242.24 kB at baseline |
| `npm run test:ci` | 6 component tests passed; 88.64% line coverage on the tested files |
| `npm run e2e` | 6 Chromium scenarios passed against production output |
| Full lockfile audit | 0 vulnerabilities, including development dependencies; baseline was 86 |
| Desktop/narrow visual inspection | Completed; equal square geometry and no horizontal overflow at the tested widths |

Component tests exercise zoneless rendering, placement/erase, snapshot preservation, moves/self-drops, cancellation, painting release and orientation mapping. Browser tests exercise startup/assets, placement/erase, square geometry, board drag, palette drag and painting release. CSS changes from visual inspection were verified by rebuilding and rerunning all browser scenarios.

The audit is a time-specific registry result, not a permanent security guarantee. Real mobile devices, other browser engines and screen readers have not been certified by this shell PR.

## CI and review notes

CI runs the quality checks and a separate full-lockfile security gate on pull requests and main. E2E serves production output from a local-only Node server; failures upload Playwright traces/screenshots. Coverage, browser reports and audit output are CI artifacts with seven-day retention, not committed generated files. Actions use verified commit pins and read-only repository permissions.

The large lockfile replacement is intentional: the Angular 17/Karma/Webpack toolchain was replaced by Angular 22/Vitest. Keep the lockfile for reproducible installs. SVGs/favicon are moves, not new artwork; their contents are unchanged. The old raw audit report, registry snapshots and command logs were archived under ignored `tmp/pr01-raw-evidence/`; only the compact historical summary and useful planning documents remain in the combined delivery.

Local `tmp/`, `node_modules/`, `.angular/`, `dist/`, `coverage/`, `playwright-report/` and `test-results/` are excluded from Git. The old baseline dependency tree is retained only under `tmp/` for local recovery.
