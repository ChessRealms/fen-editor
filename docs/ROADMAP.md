# FEN Editor roadmap

The Angular 22 shell is delivered. Full FEN editing is the next milestone. Stage IDs preserve the original plan; each stage includes its own tests and should leave the application usable. Exact installed versions and commands live in configuration and [README.md](../README.md), not here.

## Delivery plan

| Stage | Depends on | Scope and acceptance |
| --- | --- | --- |
| PR-01/02 — complete | — | Baseline/contracts established; standalone zoneless shell, signals, SVG port, lint, Vitest, Chromium smoke and CI delivered. Current output is placement only. |
| PR-03 — next | PR-02 | Pure TypeScript `FenPosition`, full parse/serialize, structured errors, separate plausibility warnings and immutable updates. All six fields round-trip; malformed inputs fail without partial results. |
| PR-04 | PR-03 | One editor state, editable FEN draft, atomic Apply and inline errors. Invalid Apply leaves the applied position unchanged; board edits preserve an unapplied draft. Remove the legacy model/parser adapter. |
| PR-05 | PR-04 | Controls for all metadata, Copy/Clear/Starting position/Flip. Board, controls and canonical FEN stay synchronized; command semantics below are verified. |
| PR-06 | PR-04/05 | Pointer Events, capture/cancellation, tap alternative to drag and responsive layout. Cancelled gestures do not change state; touch interactions preserve page scrolling outside the board. |
| PR-07 | PR-05/06 | Roving keyboard focus, semantic controls, labels, errors and announcements. Full editing without a mouse; automated accessibility checks plus manual keyboard/screen-reader smoke. |
| PR-08 | PR-03–07 | Full regression and release checks. CI build/lint/unit/E2E pass; full dependency audit has zero high/critical findings; device checks and limitations recorded. |

## MVP acceptance

- Import/export all six FEN values without semantic loss within the supported limits.
- Reject malformed FEN with a precise field/location error and no applied-state change.
- Keep board, metadata and canonical FEN synchronized; clearly distinguish unapplied text.
- Support Copy, Clear, Starting position/Reset and Flip, with mouse, touch and keyboard editing.
- Pass the required CI checks and full dependency audit, including development packages.

Post-MVP: undo/redo (one completed command/gesture per history entry), shareable URLs through the same parser, local persistence, file/PGN workflows, themes and additional localization. Chess variants and full legality analysis require separate scope decisions. No backend, routing or chess engine is needed for the current MVP.

## Pending FEN contract

These decisions are **planned**, not current parser behavior. Keep this section until domain/state tests cover it; then replace implementation details with links to those tests. Standard reference: [FEN, section 16.1](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1).

| Field | Representation / accepted values |
| --- | --- |
| `board` | Readonly 64-cell array of `Piece \| null`; validated/copied at boundaries; `0 = a8`, `63 = h1` |
| `activeColor` | `w` or `b` |
| `castling` | Four booleans: white/black kingside/queenside. Input is `-` or a nonempty ordered subsequence of `KQkq`, without duplicates. |
| `enPassant` | `null` or a typed square on rank 3/6; FEN uses `-` or `[a-h][36]` |
| `halfmoveClock` | Safe integer from 0 through `Number.MAX_SAFE_INTEGER` |
| `fullmoveNumber` | Safe integer from 1 through `Number.MAX_SAFE_INTEGER` |

- Parse exactly six fields. Accept surrounding/repeated ASCII whitespace (space, tab, CR/LF, form feed, vertical tab); do not silently strip Unicode spaces, zero-width characters or text inside tokens.
- Placement has eight slash-separated ranks, each expanding to eight cells, using only `PNBRQKpnbrqk` and `1–8`. Accept adjacent empty-run digits if their total fits (`44` normalizes to `8`).
- Counters accept ASCII digits with leading zeros, normalized on output. Reject signs, fractions, exponent notation and unsafe values rather than rounding. Placement-only FEN, EPD, Chess960/X-FEN/Shredder-FEN and arbitrary-size counters are outside this importer.
- `parse(serialize(position))` preserves all six values. Serialization is canonical and stable: compressed empty runs, ordered rights, single spaces and decimal counters without leading zeros. Original text formatting need not survive.
- Parse returns a complete position or structured errors, without throwing for malformed input or exposing partial state. Errors have stable `code`, `field`, optional `params` and zero-based, end-exclusive UTF-16 text spans; missing content uses a zero-width span. Board errors may include chess rank/file.
- Error codes: `FEN_FIELD_COUNT`, `BOARD_RANK_COUNT`, `BOARD_RANK_WIDTH`, `BOARD_TOKEN`, `ACTIVE_COLOR`, `CASTLING_TOKEN`, `CASTLING_DUPLICATE`, `CASTLING_ORDER`, `EN_PASSANT_SQUARE`, `COUNTER_FORMAT`, `COUNTER_RANGE`.
- Wrong field count stops field parsing; otherwise report fields/ranks in source order. Board rank count precedes token/width checks; an invalid token suppresses derived width errors for that rank. Castling precedence is token, duplicate, order. The UI emphasizes the first error and can list the rest.
- Plausibility warnings do not block editing, import or export, and never repair data: `KING_COUNT`, `PAWN_BACK_RANK`, `KINGS_ADJACENT` (only with one king per color), `CASTLING_PIECE_MISSING`, `EN_PASSANT_TURN`, `EN_PASSANT_POSITION`, `EN_PASSANT_CLOCK`.
- En passant rank 6 expects white to move; rank 3 expects black. Check target vacancy, the just-moved pawn, its empty origin and a zero halfmove clock as warnings. A capturing pawn is **not** required. Blocked/attacked castling paths do not remove rights. Empty boards are accepted with warnings; local plausibility is not proof of legal reachability.

## Pending editor contract

One applied position owns all six fields. Orientation, focus, selection, FEN draft and numeric drafts are separate UI state. Components emit commands; pure domain operations return immutable updates and validate coordinate/value boundaries. Older snapshots remain unchanged.

| Action | Required behavior |
| --- | --- |
| Place/remove/move | Change board only; preserve all five metadata values. Occupied destinations are replaced; self/empty-source moves are no-ops. No automatic promotion, castling move, en passant capture, turn or counter updates. |
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
- Domain tests cover valid/invalid fixtures, round-trip, boundaries, immutable snapshots, both colors, all castling subsets and en passant values. Include metadata-rich positions, adjacent empty digits, numeric limits and a valid en passant target without a capturing pawn.
- Component tests cover actual events, draft retention, atomic Apply, metadata synchronization, commands and clipboard outcomes. Browser tests cover geometry, pointer/keyboard interaction and copying; use the production build.
- Expand Chromium smoke to Firefox/WebKit core workflows and touch-enabled Android/iPhone emulation. Use real clipboard checks in Chromium plus deterministic adapter tests and manual fallback checks in other engines.
- Before MVP release, record real Android Chrome/iOS Safari touch/scroll/rotate/copy smoke and NVDA/Chrome plus VoiceOver/Safari checks. Emulation is not real-device verification; record unavailable checks as pending.

The main delivery risks are draft/metadata loss, pointer cancellation/scroll behavior and dependency compatibility. Build and test incrementally; keep audit failures visible. Historical migration reports are in Git history rather than maintained as documentation.
