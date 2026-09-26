# FEN and editor contracts

Status: selected implementation contract for PR-03 through PR-07. These behaviors are not implemented by PR-01.

## Domain boundary

The domain is pure TypeScript with no Angular, DOM, clipboard or storage dependencies. A component-scoped editor state owns the applied position. Components receive signal inputs and emit typed commands through outputs; they never mutate the position. `computed` derives canonical FEN and diagnostics. Do not use reciprocal effects to synchronize copies of position state.

`model()` is optional for independent UI values, not for the shared position or a child-owned writable board. No NgRx, router, backend or chess engine is needed for MVP.

| FenPosition field | Representation and invariant |
| --- | --- |
| `board` | Readonly array of exactly 64 `Piece | null` values, created by a validating factory; `0 = a8`, `63 = h1` |
| `activeColor` | `w` or `b` |
| `castling` | Readonly booleans `whiteKingside`, `whiteQueenside`, `blackKingside`, `blackQueenside` |
| `enPassant` | `null` or a typed square on rank 3 or 6 |
| `halfmoveClock` | Safe integer from 0 through `Number.MAX_SAFE_INTEGER` |
| `fullmoveNumber` | Safe integer from 1 through `Number.MAX_SAFE_INTEGER` |

Square factories validate integer indices and file/rank bounds. Board factories copy input arrays; no mutable array reference escapes. TypeScript readonly alone is not a length or runtime validation guarantee.

Orientation, focus, tool selection, draft text and pointer state are not FEN fields. A board edit is a composition operation, not execution of a legal chess move.

## Parsing and serialization

`parseFen(text)` returns a discriminated success containing a complete position or a failure containing syntax errors. Malformed user input does not throw and never returns a partial position. `serializeFen(position)` accepts a valid domain position and emits a canonical six-field FEN. `validatePosition(position)` separately returns plausibility warnings.

The lexical importer accepts leading/trailing ASCII whitespace and repeated ASCII whitespace between fields (space, tab, CR, LF, form feed, vertical tab). It does not silently remove zero-width characters, Unicode spaces or text inside fields. It expects exactly six tokens; placement-only strings and EPD are not accepted. Tokenization retains offsets into the original input.

| Field | Blocking syntax validation | Canonical output |
| --- | --- | --- |
| Board | Exactly eight slash-separated ranks; each expands to eight cells; only `PNBRQKpnbrqk` and `1`-`8`; no empty ranks | Ranks 8 to 1, files a to h, each empty run compressed into one digit |
| Active color | Exactly `w` or `b` | Same value |
| Castling | Exactly `-` or a nonempty ordered subsequence of `KQkq`; no duplicates, mixed hyphen or other letters | Ordered `KQkq` subset or `-` |
| En passant | Exactly `-` or `[a-h][36]` | Coordinate or `-` |
| Halfmove | ASCII decimal digits only; value in the supported range | Decimal integer without leading zeros |
| Fullmove | ASCII decimal digits only; value in the supported range and at least 1 | Decimal integer without leading zeros |

Importer tolerance: adjacent board digits are accepted if the rank total is eight (`44` becomes `8`); numeric leading zeros are accepted and normalized. Castling order is strict. Decimal signs, fractions, exponent notation and unsafe integers are rejected, never rounded. These are explicit application policies, not claims that every FEN consumer accepts the same extensions.

For each accepted position, `parseFen(serializeFen(position))` must equal all six original field values. For each accepted text, serializing the parsed result yields canonical FEN; repeated parse/serialize is stable. Byte-for-byte preservation of whitespace or leading zeros is not required. Chess960/X-FEN/Shredder-FEN and arbitrary-size counters are outside MVP.

## Error contract

Every syntax error has a stable `code`, `field`, and optional `params`. Text errors include a zero-based, end-exclusive `span: { start, end }` in UTF-16 code units, compatible with input selection APIs. Missing content uses a zero-width span at the expected location. Board errors can also contain chess `rank` (1-8) and `file` (a-h). The UI maps codes and parameters to messages.

| Code | Field / meaning |
| --- | --- |
| `FEN_FIELD_COUNT` | `fen`: expected six fields; include actual count |
| `BOARD_RANK_COUNT` | `board`: expected eight ranks |
| `BOARD_RANK_WIDTH` | `board`: expanded rank has fewer/more than eight cells |
| `BOARD_TOKEN` | `board`: invalid piece or empty-square token |
| `ACTIVE_COLOR` | `activeColor`: not `w` or `b` |
| `CASTLING_TOKEN` | `castling`: invalid character or mixed hyphen |
| `CASTLING_DUPLICATE` | `castling`: repeated right |
| `CASTLING_ORDER` | `castling`: rights out of canonical order |
| `EN_PASSANT_SQUARE` | `enPassant`: not `-` or a rank 3/6 square |
| `COUNTER_FORMAT` | Either counter: not ASCII digits |
| `COUNTER_RANGE` | Either counter: below its minimum or outside safe integers |

If field count is wrong, return that error without guessing shifted field meanings. Otherwise inspect fields in FEN order. Within board, report rank count first; with eight ranks, scan ranks in source order and report invalid tokens before width for the affected rank, avoiding a derived width error from an unknown token. Within castling, use token, duplicate, then order precedence. UI displays the first error prominently and can list the remainder.

No syntax error mutates applied state. A counter control uses the same domain constraints as the FEN importer.

## Plausibility warnings

These diagnostics never block import, export, copy or composition:

- `KING_COUNT`: a color does not have exactly one king.
- `PAWN_BACK_RANK`: a pawn is on rank 1 or 8.
- `KINGS_ADJACENT`: the kings occupy adjacent squares, when each color has exactly one king.
- `CASTLING_PIECE_MISSING`: an asserted standard-chess castling right lacks the matching king/rook on its home square.
- `EN_PASSANT_TURN`: target rank disagrees with active color (`w` expects rank 6, `b` rank 3).
- `EN_PASSANT_POSITION`: target is occupied, the expected just-moved pawn is absent, or its double-push origin is occupied.
- `EN_PASSANT_CLOCK`: an en passant target is present while the halfmove clock is nonzero.

Warnings carry affected fields/squares and do not alter data. They describe local contradictions, not proof of reachability or complete move legality. Do not flag blocked/attacked castling paths as absent castling rights. Do not require a capturing pawn next to the en passant target. Missing kings on Clear are expected warnings.

The reference describes six fields and en passant after a double pawn advance even without a possible capture: [FEN specification, section 16.1](https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c16.1). Import tolerances, safe-integer limits and warning severity are editor decisions.

## Immutable commands

Commands include `applyFen`, `setPiece`, `removePiece`, `movePiece`, `updateMetadata`, `clear`, `reset` and `flip`. Each successful position-changing command commits one complete position. Old snapshots and nested values stay unchanged; unchanged nested values may be shared. Invalid indices/values produce a failure without a commit. Empty-source moves and self-moves are no-ops.

Moving to an occupied square replaces its piece. Board commands preserve active color, all castling rights, en passant and both counters exactly. They do not perform promotion, castling moves or en passant captures. Warnings are recomputed instead of silently repairing metadata.

Drag ends outside the board, `pointercancel`, lost capture and Escape cancel without committing. A pointer drag previews movement and commits on a valid drop. Painting across multiple squares can be retained as a stroke; stage the stroke and commit it once on successful completion, so cancellation and future undo remain well-defined. Suppress the synthetic click following an executed drag/stroke.

## Draft and form synchronization

Keep one applied `position`, its computed canonical FEN, a FEN draft with dirty/error state, and temporary numeric drafts. Track whether a draft was edited by the user; an unrelated board update must not create or discard a user draft.

| Event | Applied position | Draft and feedback |
| --- | --- | --- |
| Type into FEN input | Unchanged | Update draft; mark unapplied; clear stale syntax errors until next Apply |
| Apply valid FEN / Enter in FEN input | Replace all six fields atomically | Canonicalize draft, mark clean, clear errors/selection and cancel any active gesture |
| Apply invalid FEN | Unchanged | Keep exact input and show errors; expose the first error span |
| Board/metadata edit with clean FEN draft | Commit valid change | Refresh draft from canonical FEN |
| Board/metadata edit with dirty FEN draft | Commit valid change | Preserve draft and its errors; keep the unapplied indicator; offer “Use current position” |
| Use current position | Unchanged | Explicitly discard FEN draft, replace with canonical FEN and clear syntax errors |
| Select active color/castling/en passant | Update only that field | Never normalize another field silently |
| Edit numeric field | Commit once that field is a valid complete integer | Invalid/empty draft stays local with inline error; valid values immediately update applied FEN |
| Blur/Enter on valid numeric field | Same value | Canonicalize its displayed digits |
| Escape in numeric field | Unchanged | Restore that field from applied position |

Successful FEN Apply, Reset and Clear replace all numeric drafts. Board edits and changes to a different metadata control preserve an invalid numeric draft. No global shortcut intercepts ordinary text editing. A dirty FEN draft remains applicable as a complete replacement even if the board has changed since typing began.

## Toolbar and defaults

Starting position: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`.

Empty position: `8/8/8/8/8/8/8/8 w - - 0 1`.

| Action | Defined result |
| --- | --- |
| Starting position / Reset | Replace all six fields with the starting position; Reset is an alias, not “restore last import” |
| Clear | Replace all six fields with the empty position |
| Flip | Change display orientation only; preserve position, drafts and selected logical square |
| Copy applied FEN | Copy computed canonical FEN, never an invalid/unapplied draft; label makes the source explicit |

Reset/Clear discard unapplied drafts, clear syntax errors, cancel gestures, clear selection and restore the move tool. They preserve orientation. Initial load uses the starting position, white orientation and move tool. Flip cancels an in-progress gesture without committing, and subsequent navigation uses the new visual orientation.

Clipboard writes must follow a user action. Announce success only after the promise resolves. On failure, retain state and expose the canonical text for manual selection/copy. Do not request clipboard-read permission to copy or claim success after a rejected write.

## Interaction and accessibility acceptance

- Piece palette offers all 12 pieces plus move and erase tools using semantic controls.
- Tap/click selection and placement are alternatives to dragging. With move selected, choose an occupied source then a destination; an empty square with no source is a no-op.
- The board has one Tab entry with roving focus. Arrow keys follow visible directions after Flip. Enter/Space activates; Delete/Backspace erases only while board focus is active; Escape cancels selection/gesture. Palette and toolbar remain reachable by Tab.
- Grid/row/gridcell semantics, focusable square buttons, square/piece accessible names, pressed tool state, form labels, error descriptions and polite status announcements must be verified together.
- Decorative piece images have no duplicate accessible name. Selection and errors are not conveyed by color alone.
- A square board fits a 320px-wide viewport; surrounding controls reflow and there is no page-level horizontal overflow. Check 200% zoom, visible focus and text contrast. Compact board cells must remain at least 24 CSS px; toolbar/palette controls target 44px where practical.
- Restrict gesture-related `touch-action` to the board/palette as necessary; preserve page scrolling elsewhere. Do not suppress browser zoom globally.
- Keyboard-only and real-device touch smoke checks complement automated accessibility scans.

## Acceptance examples for implementation tests

| ID | Input/action | Expected outcome |
| --- | --- | --- |
| F01 | Starting FEN | All six values retained; stable round-trip |
| F02 | `8/8/8/8/8/8/8/8 w - - 0 1` | Parse success; king-count warnings |
| F03 | `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1` | Preserve `e3` despite no available capturing pawn |
| F04 | `r3k2r/8/8/8/8/8/8/R3K2R b Kq - 17 42`, then move a1 to a2 | Only board changes; all five metadata values retained; castling warning as appropriate |
| F05 | Leading/trailing tabs/newlines, repeated separators, counters `000` / `001` | Accept and canonicalize whitespace/counters |
| F06 | `44/8/8/8/8/8/8/8 w - - 0 1` | Canonicalize first rank to `8` |
| F07 | Placement-only FEN or seven fields | `FEN_FIELD_COUNT`; no commit |
| F08 | Seven/nine ranks | `BOARD_RANK_COUNT` |
| F09 | Rank `7`, `88`, or `9` | Width error for first two; token error for `9` |
| F10 | Unknown board piece `X` | `BOARD_TOKEN` at the original character |
| F11 | Active color `W` | `ACTIVE_COLOR` |
| F12 | Castling `K-`, `KK`, `qK` | Token, duplicate and order errors respectively |
| F13 | En passant `e4` or `E3` | `EN_PASSANT_SQUARE` |
| F14 | En passant `e3` with white to move | Parse success with turn warning; value retained |
| F15 | Counter `-1`, `1.5`, `1e2`, `+1` | `COUNTER_FORMAT` |
| F16 | Fullmove `0`, or either counter `9007199254740992` | `COUNTER_RANGE` |
| F17 | Halfmove `0`, fullmove `9007199254740991` | Accepted boundaries; exact round-trip |
| U01 | Invalid Apply after editing board/metadata | Deep equality of applied position before/after; input preserved |
| U02 | Dirty FEN draft, then board edit | Board and canonical FEN update; draft stays untouched and visibly unapplied |
| U03 | Copy while draft is invalid | Applied six-field FEN copied; draft remains visible |
| U04 | Clear/Reset after invalid FEN or numeric draft | Exact default position; drafts/errors/selection cleared; orientation retained |
| U05 | Flip twice | Same FEN throughout; original orientation restored |
| U06 | Self-drop, empty-source move, cancelled/outside drop | Position unchanged |
| U07 | Invalid numeric draft, then edit another control | Invalid draft retained; applied counter unchanged; other field updates |
| U08 | Each board operation on a frozen snapshot | Previous position and board unchanged |

Also enumerate both active colors, all 16 castling combinations, all 16 en passant coordinates plus `-`, and both board orientations. Domain tests need no Angular TestBed. Component tests must exercise actual events and zoneless scheduling; pointer geometry and clipboard need browser tests.
