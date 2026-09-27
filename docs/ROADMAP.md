# FEN Editor roadmap

The Angular 22 shell, independent FEN domain core and full FEN draft/apply workflow are delivered. Dedicated metadata controls and editor commands are next. Stage IDs preserve the original plan; each stage includes its own tests and should leave the application usable. Exact installed versions and commands live in configuration and [README.md](../README.md), not here.

## Delivery plan

| Stage | Depends on | Scope and acceptance |
| --- | --- | --- |
| PR-01/02 — complete | — | Baseline/contracts established; standalone zoneless shell, signals, SVG port, lint, Vitest, Chromium smoke and CI delivered. |
| PR-03 — complete | PR-02 | Pure TypeScript core in `src/app/domain/fen/`, covered by [parse/serialize](../src/app/domain/fen/fen.spec.ts), [immutable operations](../src/app/domain/fen/position.spec.ts) and [warnings](../src/app/domain/fen/warnings.spec.ts) tests. |
| PR-04 — complete | PR-03 | One applied domain position, FEN draft/atomic Apply, inline errors and non-blocking warnings; legacy model/parser removed. Draft retention, metadata preservation and gesture cancellation on Apply are covered by [component](../src/app/app.component.spec.ts) and [browser](../e2e/editor.spec.ts) tests. |
| PR-05 — next | PR-04 | Controls for all metadata, Copy/Clear/Starting position/Flip. Board, controls and canonical FEN stay synchronized; command semantics below are verified. |
| PR-06 | PR-04/05 | Pointer Events, capture/cancellation, tap alternative to drag and responsive layout. Cancelled gestures do not change state; touch interactions preserve page scrolling outside the board. |
| PR-07 | PR-05/06 | Roving keyboard focus, semantic controls, labels, errors and announcements. Full editing without a mouse; automated accessibility checks plus manual keyboard/screen-reader smoke. |
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

## Pending editor contract

One applied position owns all six fields; FEN draft/apply behavior is covered by the PR-04 tests above. New metadata controls must use that same position and the existing domain operations. Orientation, focus, selection and numeric drafts are separate UI concerns. Syntax errors block Apply; plausibility warnings remain non-blocking.

| Action | Required behavior |
| --- | --- |
| Apply valid FEN with metadata controls | Also reset numeric drafts/errors and any square selection when replacing the position. |
| Metadata edit | Update canonical FEN with the same clean/dirty draft behavior as board edits. A later Apply still replaces the complete position. |
| Numeric input | Commit valid complete integers immediately. Empty/invalid drafts stay local with an error; unrelated edits preserve them. Blur/Enter canonicalizes valid digits; Escape restores that applied field. |
| Starting position / Reset | Set `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`; Reset does not mean restore last import. |
| Clear | Set `8/8/8/8/8/8/8/8 w - - 0 1`. |
| Flip | Change display only; preserve position/drafts/logical selection and cancel an in-progress gesture. |
| Copy applied FEN | Copy canonical applied FEN, not the draft. Announce success only after the write resolves; expose selectable text on failure. No clipboard-read permission is needed to copy. |

Initial state is the starting position, white orientation and move tool. Reset/Clear discard all drafts, syntax errors and selection, cancel gestures and restore the move tool while preserving orientation. Warnings recompute from the resulting position.

## Interaction and verification

- Pointer drag previews a move and commits on valid drop. Outside drop, Escape, lost capture and `pointercancel` cancel without committing. Stage a multi-square painting stroke as one operation; suppress the synthetic click after a completed drag/stroke.
- Provide all 12 palette pieces plus move/erase tools. Tap/click placement and source-then-destination movement are alternatives to drag; an empty source selection is a no-op.
- Board keyboard entry uses one Tab stop with roving focus. Arrows follow visual directions after Flip; Enter/Space activates, Delete/Backspace erases only with board focus, Escape cancels. Do not intercept text-field shortcuts.
- Verify grid/row/gridcell semantics, named square buttons, pressed tools, labels, error descriptions and polite announcements together. Decorative images must not duplicate names; color alone must not convey selection/errors.
- Check 320/375/768px and desktop layouts, 200% zoom, contrast and focus. Board cells must remain at least 24 CSS px; toolbar/palette controls target 44px where practical. Scope gesture `touch-action` locally and preserve browser zoom/page scrolling elsewhere.
- Extend component tests for metadata controls, commands and clipboard outcomes, retaining the existing draft/apply regressions. Extend production-build browser tests for pointer/keyboard interaction and copying.
- Expand Chromium smoke to Firefox/WebKit core workflows and touch-enabled Android/iPhone emulation. Use real clipboard checks in Chromium plus deterministic adapter tests and manual fallback checks in other engines.
- Before MVP release, record real Android Chrome/iOS Safari touch/scroll/rotate/copy smoke and NVDA/Chrome plus VoiceOver/Safari checks. Emulation is not real-device verification; record unavailable checks as pending.

The main delivery risks are draft/metadata loss, pointer cancellation/scroll behavior and dependency compatibility. Build and test incrementally; keep audit failures visible. Historical migration reports are in Git history rather than maintained as documentation.
