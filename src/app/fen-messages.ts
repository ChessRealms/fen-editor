import { FenError, FenErrorCode, FenField, FenWarning } from './domain/fen';

const FIELD_LABELS: Record<FenField, string> = {
  fen: 'FEN', board: 'Piece placement', activeColor: 'Active color', castling: 'Castling',
  enPassant: 'En passant', halfmoveClock: 'Halfmove clock', fullmoveNumber: 'Fullmove number',
};

const ERROR_MESSAGES: Record<FenErrorCode, string> = {
  FEN_FIELD_COUNT: 'Enter all six FEN fields: placement, active color, castling, en passant, halfmove clock and fullmove number.',
  BOARD_RANK_COUNT: 'Use eight ranks separated by slashes.',
  BOARD_RANK_WIDTH: 'Each rank must describe exactly eight squares.',
  BOARD_TOKEN: 'Use PNBRQK/pnbrqk for pieces or digits 1–8 for empty squares.',
  ACTIVE_COLOR: 'Use w for White or b for Black.',
  CASTLING_TOKEN: 'Use KQkq rights, or - for no castling rights.',
  CASTLING_DUPLICATE: 'Include each castling right only once.',
  CASTLING_ORDER: 'List castling rights in KQkq order.',
  EN_PASSANT_SQUARE: 'Use a square on rank 3 or 6, or - for no target.',
  COUNTER_FORMAT: 'Use a whole number written with digits 0–9.',
  COUNTER_RANGE: 'Use an integer within the supported range.',
};

export function describeFenError(error: FenError): string {
  const location = [FIELD_LABELS[error.field], error.rank ? `rank ${error.rank}` : '',
    error.file ? `file ${error.file}` : ''].filter(Boolean).join(', ');
  const span = error.span.end > error.span.start + 1
    ? `characters ${error.span.start + 1}–${error.span.end}`
    : `character ${error.span.start + 1}`;
  const message = error.code === 'COUNTER_RANGE'
    ? `Use an integer from ${error.params?.['minimum']} to ${error.params?.['maximum']}.`
    : ERROR_MESSAGES[error.code];
  return `${location}, ${span}: ${message}`;
}

export function describeFenWarning(warning: FenWarning): string {
  const squares = warning.squares?.join(', ');
  switch (warning.code) {
    case 'KING_COUNT':
      return `${warning.params?.['color'] === 'w' ? 'White' : 'Black'} has ${warning.params?.['count']} kings; expected one.`;
    case 'PAWN_BACK_RANK':
      return `A pawn is on a back rank (${squares}).`;
    case 'KINGS_ADJACENT':
      return `The kings are adjacent (${squares}).`;
    case 'CASTLING_PIECE_MISSING':
      return `A castling right has no matching king or rook on ${squares}.`;
    case 'EN_PASSANT_TURN':
      return `The en passant target on ${squares} expects ${warning.params?.['expectedColor'] === 'w' ? 'White' : 'Black'} to move.`;
    case 'EN_PASSANT_POSITION':
      return `The pieces around the en passant target are inconsistent (${squares}).`;
    case 'EN_PASSANT_CLOCK':
      return 'An en passant target expects a halfmove clock of 0.';
  }
}
