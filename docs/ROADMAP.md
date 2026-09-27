# FEN Editor roadmap

The Angular 22 shell, independent FEN domain core, full FEN draft/apply workflow, metadata controls, editor commands, responsive pointer interactions and keyboard editing are delivered. PR-07 still needs manual accessibility verification before acceptance; release checks follow in PR-08. Stage IDs preserve the original plan; each stage includes its own tests and should leave the application usable. Exact installed versions and commands live in configuration and [README.md](../README.md), not here.

## Delivery plan

| Stage | Depends on | Scope and acceptance |
| --- | --- | --- |
| PR-01/02 — complete | — | Baseline/contracts established; standalone zoneless shell, signals, SVG port, lint, Vitest, Chromium smoke and CI delivered. |
| PR-03 — complete | PR-02 | Pure TypeScript core in `src/app/domain/fen/`, covered by [parse/serialize](../src/app/domain/fen/fen.spec.ts), [immutable operations](../src/app/domain/fen/position.spec.ts) and [warnings](../src/app/domain/fen/warnings.spec.ts) tests. |
| PR-04 — complete | PR-03 | One applied domain position, FEN draft/atomic Apply, inline errors and non-blocking warnings; legacy model/parser removed. Draft retention, metadata preservation and gesture cancellation on Apply are covered by [component](../src/app/app.component.spec.ts) and [browser](../e2e/editor.spec.ts) tests. |
| PR-05 — complete | PR-04 | Metadata controls with local numeric drafts; Copy/Clear/Starting position/Flip. Synchronization, draft retention and commands are covered by [component](../src/app/app.component.spec.ts), [clipboard adapter](../src/app/clipboard.service.spec.ts) and [Chromium](../e2e/editor.spec.ts) tests, including real clipboard writes and failure fallback. |
| PR-06 — complete | PR-04/05 | Pointer capture/cancellation, staged drag/paint, tap movement and responsive controls; [component](../src/app/app.component.spec.ts) and [browser](../e2e/pointer.spec.ts) regressions cover mouse, pen, Chromium Android touch/scroll, narrow layouts and 200% CSS zoom. |
| PR-07 — next (manual verification pending) | PR-05/06 | Roving focus, grid semantics, keyboard editing, labels, errors and polite announcements implemented; [component](../src/app/app.component.spec.ts) and [keyboard/axe](../e2e/accessibility.spec.ts) regressions pass. Manual keyboard/screen-reader smoke remains required before marking complete. |
| PR-08 | PR-03–07 | Full regression and release checks. CI build/lint/unit/E2E pass; full dependency audit has zero high/critical findings; device checks and limitations recorded. |

After a stage meets acceptance and passes its required checks, mark it `complete` and move `next` to the following unfinished stage. Updating status does not authorize work on that stage.

## MVP acceptance

- Import/export all six FEN values without semantic loss within the supported limits.
- Reject malformed FEN with a precise field/location error and no applied-state change.
- Keep board, metadata and canonical FEN synchronized; clearly distinguish unapplied text.
- Support Copy, Clear, Starting position/Reset and Flip, with mouse, touch and keyboard editing.
- Pass the required CI checks and full dependency audit, including development packages.

Post-MVP: undo/redo (one completed command/gesture per history entry), shareable URLs through the same parser, local persistence, file/PGN workflows, themes and additional localization. Chess variants and full legality analysis require separate scope decisions. No backend, routing or chess engine is needed for the current MVP.

## FEN domain boundary

The [domain entry point](../src/app/domain/fen/index.ts) is independent of Angular and browser APIs. Standard reference: [FEN, section 16.1](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1).

- Import/export covers standard six-field FEN with safe-integer counters and canonical output; original whitespace/number formatting is not retained. Placement-only input, EPD, Chess960/X-FEN/Shredder-FEN and arbitrary-size counters are outside this importer. Syntax, normalization, error precedence and UTF-16 spans are covered by [parser tests](../src/app/domain/fen/fen.spec.ts).
- Plausibility warnings never block import/export or repair data. Empty boards are accepted; local checks are not proof of legal reachability. Castling paths need not be clear/safe and en passant needs no capturing pawn. The checks are covered by [warning tests](../src/app/domain/fen/warnings.spec.ts).
- Board composition changes pieces only, preserving all metadata; it does not execute chess rules or advance turns/counters. Boundary validation, immutable snapshots and metadata updates are covered by [position tests](../src/app/domain/fen/position.spec.ts).

## Editor boundaries

One applied position owns all six fields; board and metadata edits use the same domain operations. Orientation, focus, square selection, gesture previews and numeric drafts are separate UI concerns. Syntax errors block Apply; plausibility warnings remain non-blocking. Editor behavior is covered by the tests above; user instructions live in [README](../README.md#edit-a-position).

Initial state is the starting position, white orientation and Move tool. Reset means the standard starting position, not the last import; Clear resets all six fields. Flip changes display only. Copy exports the applied position and requires no clipboard-read permission. Reset/Clear preserve orientation.

Board composition commits only completed gestures. Touch uses palette selection followed by board taps/strokes, preserving scrolling outside the board. Source selection keeps its logical identity on Flip; replacement commands and tool changes clear it.

## Interaction and verification

- Keyboard controls and accessibility semantics are covered by PR-07 tests; user instructions live in [README](../README.md#edit-a-position). Retain the 320/375/768px, desktop and 200% CSS-zoom layout checks. Board cells must remain at least 24 CSS px; toolbar/palette controls target 44px where practical.
- PR-07 manual verification is pending: native Chrome keyboard/focus/zoom smoke could not run because Computer Use was not approved to control Chrome; NVDA was not found among available apps or in its standard installation paths, and VoiceOver/Safari was unavailable on this Windows host. Inspect spoken square names, selection, errors and polite announcements using the README smoke sequence. Automated keyboard/axe checks and screenshot inspection passed, but do not satisfy this manual acceptance criterion.
- Retain the existing draft/apply, metadata, command and clipboard regressions while extending production-build browser tests for pointer and keyboard interaction.
- Expand Chromium desktop/Android coverage to Firefox/WebKit core workflows and iPhone emulation. Use real clipboard checks in Chromium plus deterministic adapter tests and manual fallback checks in other engines.
- Before MVP release, record real Android Chrome/iOS Safari touch/scroll/rotate/copy smoke and NVDA/Chrome plus VoiceOver/Safari checks. Emulation is not real-device verification; record unavailable checks as pending.

The main delivery risks are draft/metadata loss, pointer cancellation/scroll behavior and dependency compatibility. Build and test incrementally; keep audit failures visible. Historical migration reports are in Git history rather than maintained as documentation.
