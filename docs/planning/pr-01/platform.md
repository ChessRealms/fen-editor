# Target platform, browsers and release gates

## Version decision

Use a fresh Angular 22.2 standalone/zoneless scaffold in the same Git repository. The initial version set below is a historical planning snapshot, verified against npm registry metadata. The implemented selection and any changes are documented in [PR-02](../pr-02/README.md); the current lockfile pins the installed versions. Host npm metadata is in [baseline-summary.json](evidence/baseline-summary.json).

| Tool/package | Selected version | Compatibility evidence / role |
| --- | --- | --- |
| Node.js | `24.21.0` | Within Angular's `^24.15.0` engine range; use consistently locally and in CI |
| npm | `11.19.1` | Installed host manifest requires Node `^20.17.0 || >=22.9.0`; compatible with selected Node and CLI |
| Angular framework packages | `22.2.0` | Core/compiler/compiler-cli must be aligned; framework packages in scaffold use the same patch |
| Angular CLI / build / schematics | `22.2.0` | Engine is `^22.22.3 || ^24.15.0 || >=26.0.0` |
| TypeScript | `6.0.3` | Compiler-cli and build require `>=6.0 <6.1` |
| RxJS | `7.8.2` | Core requires `^6.5.3 || ^7.4.0`; retained as a framework peer, not for local state |
| tslib | `2.8.1` | Satisfies build peer `^2.3.0` |
| Vitest / coverage-v8 | `4.1.11` / `4.1.11` | Build accepts Vitest `^4.0.8 || ^5.0.0`; coverage must match Vitest exactly |
| jsdom | `30.1.1` | Engine `^22.22.2 || ^24.15.0 || >=26.0.0`; Vitest accepts jsdom as an optional peer |
| angular-eslint | `22.5.0` | Peers: ESLint 9/10 and typescript-eslint 8 |
| ESLint | `9.39.5` | Within angular-eslint and typescript-eslint peer ranges |
| typescript-eslint | `8.70.1` | TypeScript peer `>=4.8.4 <6.1.0` includes 6.0.3 |
| @playwright/test | `1.63.0` | Requires Node `>=20`; browser versions are pinned by this package's installation |
| @axe-core/playwright | `4.13.0` | Accepts playwright-core `>=1.0.0`; introduced with accessibility checks |

Registry queries returned the latest matching stable version when a major/range was used. No prerelease is selected. Do not interpret matching peer ranges as a successful integration test. If the generated scaffold differs, PR-02 must reconcile its supported defaults with this matrix, document the change and run installation/build/tests without `--force` or `--legacy-peer-deps`.

Prefer a newer stable 22.2 patch when needed to address a finding, with the updated matrix and lockfile in the same implementation PR. Do not silently switch to another Angular minor/major. Pin the Node/npm setup and commit the generated lockfile in PR-02; use `npm ci` in CI.

The public [Angular compatibility table](https://angular.dev/reference/versions) listed 22.0.x when inspected, so the 22.2.0 package engine/peer metadata is the source for the minor-specific decision. Its browser support section uses Baseline 2026-05-07 for Angular 22.

## Scaffold and dependency policy

- Standalone application with strict TypeScript/templates, zoneless bootstrap and no router or SSR.
- Use signals/computed for editor state; typed signal inputs and outputs for component boundaries.
- Use modern control flow with stable square keys. Keep OnPush-compatible components.
- Use Angular's `@angular/build:unit-test` integration for Vitest; no separate application Vite configuration unless a demonstrated need appears.
- Remove Zone.js, its test polyfills, Karma/Jasmine, unused animations, platform-browser-dynamic and router after porting the existing editor.
- Core marks Zone.js as an optional peer. RxJS is a required peer and remains even when application subscriptions disappear.
- Retain `@angular/forms` only if the chosen form implementation uses it; simple signal-backed native controls do not require it.
- Copy SVG assets and use an explicit piece-to-asset map. Avoid adopting a component library solely for this small form/board.
- Replace template-generated title tests with behavior tests. Do not hide scheduling defects by forcing change detection after every event.

Angular documents [zoneless as the default](https://angular.dev/guide/zoneless) and [Vitest as the default testing setup](https://angular.dev/guide/testing). The new shell should follow these supported paths.

## Browser and device policy

Product support follows Angular 22's documented browser Baseline. The verification matrix samples current engines rather than claiming exhaustive tests of every supported browser version.

| Verification layer | Required coverage |
| --- | --- |
| PR-02 smoke | Playwright Chromium: application renders, initial board and palette are present |
| MVP PR checks | Chromium, Firefox and WebKit: import/error preservation, board edit, metadata, reset/clear/flip and keyboard workflows |
| Clipboard | Chromium real clipboard write/read with scoped test permissions; deterministic success/failure adapter tests; manual fallback verification in Firefox/WebKit |
| Mobile emulation | Chromium Android-like and WebKit iPhone-like projects; touch enabled, placement/movement/removal and page scrolling |
| Layout | 320px, 375px, 768px and desktop widths; no page-level horizontal overflow; verify 200% browser zoom manually |
| Release smoke | Real Android Chrome and iOS Safari: tap, drag/cancel, scroll, rotate and Copy/fallback; record device/OS/browser versions at execution time |
| Accessibility | Axe on default/error/warning states; keyboard-only flow; NVDA with Chrome and VoiceOver with Safari smoke |

Mobile emulation tests touch and viewport behavior but do not prove real iOS/Android behavior. Playwright WebKit is not a complete substitute for shipping Safari. [Playwright emulation documentation](https://playwright.dev/docs/emulation).

Mouse, touch and pen share the Pointer Events implementation. Test pointer state transitions independently; do not describe synthetic pointer events as a real-device pen test. Record an unavailable device check as pending, not passed.

## CI and dependency audit policy

PR-02 introduces clean install, lint, production build, Vitest and browser smoke jobs. Subsequent PRs add their scenarios; PR-08 requires the full matrix. E2E must serve the production output, use deterministic readiness checks and upload traces/screenshots on failure. Coverage is diagnostic, not a substitute for testing every FEN field/error and state transition.

Audit the full lockfile, including development dependencies, with `npm audit --audit-level=high`. The MVP release gate is zero high and zero critical findings. Low/moderate findings remain visible and triaged. Registry/network failures fail the verification rather than implying zero findings. Do not use `--omit=dev`, audit suppression, or `audit fix --force` to manufacture a passing result.

Keep the compact baseline Angular 17 audit summary as historical evidence. PR-02 establishes the new scaffold audit; dependencies with remaining high/critical findings must be replaced or updated before release. Raw reports belong in local/CI artifacts. Security checks remain visible during modernization; a failing check is not evidence that a newly introduced pipeline is broken.

Use minimal GitHub Actions permissions, pinned action revisions, and dependency update automation. Upload test artifacts with bounded retention. No production deployment, branch protection change, remote PR creation or repository setting change is part of PR-01.

## PR-02 entry and exit checks

Entry: PR-01 behavior inventory, contracts and candidate matrix are available. No application code is ported in this PR.

Exit: on the selected Node/npm pair, the new scaffold installs cleanly, compiles in production, lints, runs a meaningful zoneless component test and Playwright smoke, serves all existing SVG assets, and preserves placement/move/erase workflows. Remove the old runtime/test pipeline and record the new dependency audit. A temporary adapter is allowed during the port; PR-04 removes it when the domain and signal state replace the legacy model.
