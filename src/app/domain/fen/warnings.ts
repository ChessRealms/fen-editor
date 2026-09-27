import { createFenPosition, indexToSquare, squareToIndex } from './position';
import type { CastlingRights, Color, FenPosition, FenWarning, Piece, Square } from './types';

const CASTLING_HOMES: readonly {
  right: keyof CastlingRights; king: Piece; rook: Piece; kingSquare: Square; rookSquare: Square;
}[] = [
  { right: 'whiteKingside', king: 'K', rook: 'R', kingSquare: 'e1', rookSquare: 'h1' },
  { right: 'whiteQueenside', king: 'K', rook: 'R', kingSquare: 'e1', rookSquare: 'a1' },
  { right: 'blackKingside', king: 'k', rook: 'r', kingSquare: 'e8', rookSquare: 'h8' },
  { right: 'blackQueenside', king: 'k', rook: 'r', kingSquare: 'e8', rookSquare: 'a8' },
];

/** Local plausibility only; never repairs data or proves legal reachability. */
export function getFenWarnings(input: FenPosition): readonly FenWarning[] {
  const position = createFenPosition(input);
  const warnings: FenWarning[] = [];
  const kings: Record<Color, number[]> = { w: [], b: [] };
  position.board.forEach((piece, index) => {
    if (piece === 'K') kings.w.push(index);
    if (piece === 'k') kings.b.push(index);
  });
  for (const color of ['w', 'b'] as const) {
    if (kings[color].length !== 1) {
      warnings.push({ code: 'KING_COUNT', field: 'board', params: { color, count: kings[color].length },
        squares: kings[color].map(indexToSquare) });
    }
  }
  position.board.forEach((piece, index) => {
    if ((piece === 'P' || piece === 'p') && (index < 8 || index >= 56)) {
      warnings.push({ code: 'PAWN_BACK_RANK', field: 'board', squares: [indexToSquare(index)] });
    }
  });
  if (kings.w.length === 1 && kings.b.length === 1 &&
      Math.abs(Math.floor(kings.w[0] / 8) - Math.floor(kings.b[0] / 8)) <= 1 &&
      Math.abs(kings.w[0] % 8 - kings.b[0] % 8) <= 1) {
    warnings.push({ code: 'KINGS_ADJACENT', field: 'board',
      squares: [indexToSquare(kings.w[0]), indexToSquare(kings.b[0])] });
  }
  for (const home of CASTLING_HOMES) {
    if (position.castling[home.right] &&
        (position.board[squareToIndex(home.kingSquare)] !== home.king ||
         position.board[squareToIndex(home.rookSquare)] !== home.rook)) {
      warnings.push({ code: 'CASTLING_PIECE_MISSING', field: 'castling', params: { right: home.right },
        squares: [home.kingSquare, home.rookSquare] });
    }
  }
  if (position.enPassant !== null) {
    const target = squareToIndex(position.enPassant);
    const whiteToMove = position.enPassant[1] === '6';
    const expectedColor: Color = whiteToMove ? 'w' : 'b';
    const pawn = target + (whiteToMove ? 8 : -8);
    const origin = target + (whiteToMove ? -8 : 8);
    if (position.activeColor !== expectedColor) {
      warnings.push({ code: 'EN_PASSANT_TURN', field: 'enPassant', params: { expectedColor },
        squares: [position.enPassant] });
    }
    if (position.board[target] !== null || position.board[pawn] !== (whiteToMove ? 'p' : 'P') ||
        position.board[origin] !== null) {
      warnings.push({ code: 'EN_PASSANT_POSITION', field: 'enPassant',
        squares: [position.enPassant, indexToSquare(pawn), indexToSquare(origin)] });
    }
    if (position.halfmoveClock !== 0) {
      warnings.push({ code: 'EN_PASSANT_CLOCK', field: 'halfmoveClock', params: { expected: 0 } });
    }
  }
  return warnings;
}
