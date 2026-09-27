export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Square = `${File}${Rank}`;
export type EnPassantSquare = `${File}${3 | 6}`;

export interface CastlingRights {
  readonly whiteKingside: boolean;
  readonly whiteQueenside: boolean;
  readonly blackKingside: boolean;
  readonly blackQueenside: boolean;
}

export interface FenMetadata {
  readonly activeColor: Color;
  readonly castling: CastlingRights;
  readonly enPassant: EnPassantSquare | null;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
}

export interface FenPosition extends FenMetadata {
  /** Exactly 64 cells, from a8 (0) to h1 (63). */
  readonly board: readonly (Piece | null)[];
}

export type FenField = 'fen' | keyof FenPosition;
export type FenErrorCode =
  | 'FEN_FIELD_COUNT' | 'BOARD_RANK_COUNT' | 'BOARD_RANK_WIDTH' | 'BOARD_TOKEN'
  | 'ACTIVE_COLOR' | 'CASTLING_TOKEN' | 'CASTLING_DUPLICATE' | 'CASTLING_ORDER'
  | 'EN_PASSANT_SQUARE' | 'COUNTER_FORMAT' | 'COUNTER_RANGE';

export interface TextSpan {
  /** Zero-based, end-exclusive UTF-16 offsets into the original input. */
  readonly start: number;
  readonly end: number;
}

export interface FenError {
  readonly code: FenErrorCode;
  readonly field: FenField;
  readonly span: TextSpan;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
  readonly rank?: Rank;
  readonly file?: File;
}

export type FenParseResult =
  | { readonly ok: true; readonly position: FenPosition }
  | { readonly ok: false; readonly errors: readonly FenError[] };

export type FenWarningCode =
  | 'KING_COUNT' | 'PAWN_BACK_RANK' | 'KINGS_ADJACENT' | 'CASTLING_PIECE_MISSING'
  | 'EN_PASSANT_TURN' | 'EN_PASSANT_POSITION' | 'EN_PASSANT_CLOCK';

export interface FenWarning {
  readonly code: FenWarningCode;
  readonly field: keyof FenPosition;
  readonly squares?: readonly Square[];
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}
