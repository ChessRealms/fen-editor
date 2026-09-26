# Current application baseline

## Provenance and scope

- Repository: https://github.com/ChessRealms/fen-editor
- Commit: `0e27c2a51350b461d39c7fe92d859d5c0901abb6`.
- The working tree was clean before PR-01; branch `feature/щось-там` was created from local `main`.
- No fetch was performed; this is the local commit baseline, not a claim that the remote branch is unchanged.
- Initial host runtime: Windows, Node `26.10.0`, npm `11.19.1`.
- Historical build/test runtime: Node `20.20.2`, npm `10.8.2`, obtained through a temporary npm-exec environment. Node 20 is used only to reproduce the old Angular 17 toolchain, not as the modernization target.
- Lockfile SHA-256 before and after verification: `E7A788969C6B2F822BC946AD1EAF3E852B9ACD9922D79B7B1588DA01B366C43E`.

During PR-01 baseline capture, no manifest, lockfile, application source or test was changed. PR-02 subsequently replaced the toolchain and shell; this document retains the original observations. Dependencies and build/cache outputs are ignored local artifacts.

## Existing behavior inventory

This inventory comes from source inspection at the baseline commit. Only the build and existing automated tests below were executed; the listed gestures were not manually certified in a browser. Source paths below identify the original files; consult the baseline commit for their historical contents.

| Area | Source evidence | Preserve or replace |
| --- | --- | --- |
| Initial board | [app component](../../../src/app/app.component.ts) parses the standard starting FEN | Preserve starting layout; retain all metadata in the new domain |
| Palette | Root template offers six white and six black pieces, hand/move and erase tools | Preserve available tools, use semantic buttons |
| Placement/erase | Selected piece is written on mouse-down and mouse-enter while pressed | Preserve editing intent; define staged/cancellable pointer strokes |
| Piece movement | Native HTML5 drag/drop; root ignores self-drops and overwrites occupied destinations | Preserve arbitrary composition and occupied-square replacement |
| Palette drag | Root keeps the dragged piece; target board emits a placement event | Preserve palette-to-board placement using Pointer Events |
| FEN display | Readonly input receives serializer output | Replace with complete six-field import/export and draft policy |
| Orientation | Board accepts black view; root hardcodes `false` | Expose Flip and verify coordinates |
| Angular design | Standalone and OnPush already present; mixed legacy control flow and `@switch` | Preserve standalone boundaries; port templates and state |
| Assets | 12 SVG pieces plus hand and trash icons | Preserve assets and verify references in production output |

## Known defects and missing functionality

| Finding | Evidence / consequence | Planned owner |
| --- | --- | --- |
| Only placement survives FEN | [fen-string.ts](../../../src/app/components/chess-board/utils/fen-string.ts) truncates at first space; serializer emits board only | PR-03/04 |
| No syntax validation | Unknown piece becomes NONE; rank count and expanded width are unchecked | PR-03 |
| Incomplete position | [position.ts](../../../src/app/types/position.ts) has four fields and no counters; not used as editor state | PR-03/04 |
| Mutable board | [chess-board.ts](../../../src/app/types/chess-board.ts) mutates an array; constructor can contain holes; root republishes the same reference | PR-03/04 |
| Weak coordinates | [square-index.ts](../../../src/app/types/square-index.ts) checks range but not integerness; fromFileRank does not validate both axes | PR-03 |
| Incorrect square color origin | `blackOrWhiteSquareNgClass` makes index 0 (a8) black; standard a8 is light | PR-02 board port, regression test by PR-06 |
| No editable metadata/import | No Apply, field controls or atomic validation path | PR-04/05 |
| No Copy/Clear/Reset/Flip controls | Existing black-view input is not exposed as a user action | PR-05 |
| Mouse-specific painting | Mouse release outside a square is not comprehensively handled; native drag is not a touch strategy | PR-06 |
| Accessibility gaps | Clickable divs/custom hosts, missing labels/keyboard flow and unlabeled images | PR-07 |
| Fixed layout | Board uses pixel square sizes; FEN input width is 450px | PR-06 |
| Unused router and debug logging | Empty routing setup/outlet; interaction console.log calls | PR-02/04 |
| Scaffold test mismatch | Test expects an h1 containing `Hello, fen-editor`; actual template has no such title | PR-02 |
| Missing quality pipeline | No lint script, E2E setup or GitHub Actions workflow | PR-02 onward |

## Executed checks

| Check | Result |
| --- | --- |
| Lockfile install | Exit 0; 927 packages added; deprecation warnings |
| Historical runtime | Node 20.20.2 / npm 10.8.2 |
| Production build | Exit 0; initial output 242.24 kB, estimated transfer 66.62 kB |
| Karma/Jasmine, Chrome Headless | Exit 1; 2 passed, 1 failed out of 3 |
| Full lockfile audit | Exit 1 because high/critical findings exist |
| Target package metadata | Registry queries succeeded; candidate selection recorded in the platform matrix |

The [compact summary](evidence/baseline-summary.json) retains versions, exit codes, capture time and lockfile identity. Raw logs and registry responses were archived locally under ignored `tmp/pr01-raw-evidence/` to keep the combined delivery reviewable.

Test failure: `AppComponent should render title`, at `src/app/app.component.spec.ts:27`, reports `Expected undefined to contain 'Hello, fen-editor'`. The browser identified itself as Chrome Headless 153.0.0.0. Do not repair this old title assertion in PR-01; replace it with actual UI behavior coverage during the scaffold port.

Lint and E2E were not run because they do not exist yet. No manual touch, keyboard or screen-reader pass is claimed. The legacy suite does not test FEN correctness or the gesture inventory.

## Dependency audit snapshot

| Severity | Vulnerable package entries |
| --- | ---: |
| Critical | 3 |
| High | 46 |
| Moderate | 28 |
| Low | 9 |
| Info | 0 |
| Total | 86 |

These are npm's vulnerable-package counts, not 86 distinct CVEs. Critical entries were `shell-quote`, `tar` and `websocket-driver`, all indirect. Direct high entries included Angular common/compiler/core, CLI and build-angular. Both runtime and development dependencies were in scope; a build-tool finding is not automatically a browser-runtime exploit.

The counts come from a successful request to the npm registry using the unchanged baseline lockfile, host Node 26/npm 11 and `--package-lock-only --ignore-scripts`. No audit fix was applied. Counts are time-dependent: a repeat can legitimately differ as advisories change.

## Reproduction

Run from the repository root on Windows. Use an isolated checkout of the baseline commit when reproducing later, so future modernization changes do not alter the comparison. `npm ci` replaces node_modules but must not change the lockfile.

```powershell
git rev-parse HEAD
Get-FileHash package-lock.json -Algorithm SHA256
npm exec --yes --package=node@20.20.2 --package=npm@10.8.2 -- npm ci --no-audit --no-fund
npm exec --offline --yes --package=node@20.20.2 --package=npm@10.8.2 -- node --version
npm exec --offline --yes --package=node@20.20.2 --package=npm@10.8.2 -- npm --version
npm exec --offline --yes --package=node@20.20.2 --package=npm@10.8.2 -- npm run build -- --configuration production --progress=false
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm exec --offline --yes --package=node@20.20.2 --package=npm@10.8.2 -- npm test -- --watch=false --browsers=ChromeHeadless --progress=false
npm audit --package-lock-only --json --audit-level=high --ignore-scripts
Get-FileHash package-lock.json -Algorithm SHA256
```

Adjust CHROME_BIN to the installed browser location. The first npm-exec call requires network access; subsequent offline calls reuse its package cache. The audit command uses the host npm and requires network access. Record exit codes separately: the expected failed title test and audit must not hide a build/install failure.

To refresh metadata, use `npm view <package>@<version> version engines peerDependencies peerDependenciesMeta --json` for the versions listed in [platform.md](platform.md). Record the capture date and any changed selection.

[baseline-summary.json](evidence/baseline-summary.json) records the commit, runtime, package versions, exit codes and unchanged baseline lockfile hash. Timings and generated bundle hashes are observations, not acceptance thresholds.
