# FEN Editor roadmap

The Angular 22 shell and independent FEN domain core are delivered. Connecting full FEN editing to the UI is next; the current UI still uses the legacy placement-only parser. Stage IDs preserve the original plan; each stage includes its own tests and should leave the application usable. Exact installed versions and commands live in configuration and [README.md](../README.md), not here.

## Delivery plan

| Stage | Depends on | Scope and acceptance |
| --- | --- | --- |
| PR-01/02 — complete | — | Baseline/contracts established; standalone zoneless shell, signals, SVG port, lint, Vitest, Chromium smoke and CI delivered. Current output is placement only. |
| PR-03 — complete | PR-02 | Pure TypeScript core in `src/app/domain/fen/`, covered by [parse/serialize](../src/app/domain/fen/fen.spec.ts), [immutable operations](../src/app/domain/fen/position.spec.ts) and [warnings](../src/app/domain/fen/warnings.spec.ts) tests. UI integration is deferred to PR-04. |
| PR-04 — next | PR-03 | Connect the domain core to one editor state, editable FEN draft, atomic Apply and inline errors. Invalid Apply leaves the applied position unchanged; board edits preserve an unapplied draft. Remove the legacy model/parser adapter. |
| PR-05 | PR-04 | Controls for all metadata, Copy/Clear/Starting position/Flip. Board, controls and canonical FEN stay synchronized; command semantics below are verified. |
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

The [domain entry point](../src/app/domain/fen/index.ts) is independent of Angular, browser APIs and the legacy UI model. Standard reference: [FEN, section 16.1](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1).

- Import/export covers standard six-field FEN with safe-integer counters and canonical output; original whitespace/number formatting is not retained. Placement-only input, EPD, Chess960/X-FEN/Shredder-FEN and arbitrary-size counters are outside this importer. Syntax, normalization, error precedence and UTF-16 spans are covered by [parser tests](../src/app/domain/fen/fen.spec.ts).
- Plausibility warnings never block import/export or repair data. Empty boards are accepted; local checks are not proof of legal reachability. Castling paths need not be clear/safe and en passant needs no capturing pawn. The checks are covered by [warning tests](../src/app/domain/fen/warnings.spec.ts).
- Board composition changes pieces only, preserving all metadata; it does not execute chess rules or advance turns/counters. Boundary validation, immutable snapshots and metadata updates are covered by [position tests](../src/app/domain/fen/position.spec.ts).

## Pending editor contract

One applied position will own all six fields. Orientation, focus, selection, FEN draft and numeric drafts remain separate UI state. Components will emit commands using the existing domain operations. Syntax errors will emphasize the first error/span and may list the rest; plausibility warnings remain non-blocking.

| Action | Required behavior |
| --- | --- |
| Type FEN | Change draft only, mark unapplied and clear stale syntax errors until next Apply. |
| Apply valid FEN / Enter | Atomically replace all six fields, canonicalize/clean the draft, reset numeric drafts/errors/selection and cancel gestures. |
| Apply invalid FEN | Preserve applied position and exact input; show errors and the first error span. |
| Board/metadata edit | Update canonical FEN. Refresh a clean draft; preserve a dirty draft and its errors with an unapplied indicator. A later Apply still replaces the complete position. |
| Use current position | Explicitly discard the FEN draft, replace it with canonical FEN and clear syntax errors. |
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
- Component tests cover actual events, draft retention, atomic Apply, metadata synchronization, commands and clipboard outcomes. Browser tests cover geometry, pointer/keyboard interaction and copying; use the production build.
- Expand Chromium smoke to Firefox/WebKit core workflows and touch-enabled Android/iPhone emulation. Use real clipboard checks in Chromium plus deterministic adapter tests and manual fallback checks in other engines.
- Before MVP release, record real Android Chrome/iOS Safari touch/scroll/rotate/copy smoke and NVDA/Chrome plus VoiceOver/Safari checks. Emulation is not real-device verification; record unavailable checks as pending.

The main delivery risks are draft/metadata loss, pointer cancellation/scroll behavior and dependency compatibility. Build and test incrementally; keep audit failures visible. Historical migration reports are in Git history rather than maintained as documentation.
