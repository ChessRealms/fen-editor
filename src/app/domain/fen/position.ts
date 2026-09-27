import type { FenMetadata, FenPosition, Piece, Square } from './types';

export function isPiece(value: unknown): value is Piece {
  return typeof value === 'string' && value.length === 1 && 'PNBRQKpnbrqk'.includes(value);
}

export function squareToIndex(square: Square): number {
  if (typeof square !== 'string' || square.length !== 2 || !/^[a-h][1-8]$/.test(square)) {
    throw new RangeError('Square must be between a1 and h8.');
  }
  return (8 - Number(square[1])) * 8 + square.charCodeAt(0) - 97;
}

export function indexToSquare(index: number): Square {
  if (!Number.isInteger(index) || index < 0 || index > 63) {
    throw new RangeError('Square index must be an integer from 0 to 63.');
  }
  return `${String.fromCharCode(97 + index % 8)}${8 - Math.floor(index / 8)}` as Square;
}

/** Validates programmatic input and owns a frozen copy of every mutable value.
 * Invalid API values throw; malformed text is handled by parseFen instead.
 */
export function createFenPosition(input: FenPosition): FenPosition {
  // Array.from also exposes holes in sparse arrays as invalid undefined cells.
  if (!Array.isArray(input.board) || input.board.length !== 64 ||
      Array.from(input.board).some(piece => piece !== null && !isPiece(piece))) {
    throw new RangeError('Board must contain exactly 64 pieces or null cells.');
  }
  if (input.activeColor !== 'w' && input.activeColor !== 'b') {
    throw new RangeError('Active color must be w or b.');
  }
  const rights = input.castling;
  if (!rights || [rights.whiteKingside, rights.whiteQueenside, rights.blackKingside,
    rights.blackQueenside].some(value => typeof value !== 'boolean')) {
    throw new RangeError('Castling rights must contain four booleans.');
  }
  if (input.enPassant !== null &&
      (typeof input.enPassant !== 'string' || input.enPassant.length !== 2 || !/^[a-h][36]$/.test(input.enPassant))) {
    throw new RangeError('En passant must be null or a square on rank 3 or 6.');
  }
  if (!Number.isSafeInteger(input.halfmoveClock) || input.halfmoveClock < 0 ||
      !Number.isSafeInteger(input.fullmoveNumber) || input.fullmoveNumber < 1) {
    throw new RangeError('Counters must be safe integers: halfmove >= 0, fullmove >= 1.');
  }
  return Object.freeze({
    board: Object.freeze([...input.board]),
    activeColor: input.activeColor,
    castling: Object.freeze({
      whiteKingside: rights.whiteKingside,
      whiteQueenside: rights.whiteQueenside,
      blackKingside: rights.blackKingside,
      blackQueenside: rights.blackQueenside,
    }),
    enPassant: input.enPassant,
    halfmoveClock: input.halfmoveClock,
    fullmoveNumber: input.fullmoveNumber,
  });
}

/** Composition only: does not advance turns, counters or special-move state. */
export function placePiece(position: FenPosition, square: Square, piece: Piece): FenPosition {
  const index = squareToIndex(square);
  if (!isPiece(piece)) throw new RangeError('Invalid piece.');
  const board = [...createFenPosition(position).board];
  board[index] = piece;
  return createFenPosition({ ...position, board });
}

export function removePiece(position: FenPosition, square: Square): FenPosition {
  const index = squareToIndex(square);
  const board = [...createFenPosition(position).board];
  board[index] = null;
  return createFenPosition({ ...position, board });
}

export function movePiece(position: FenPosition, from: Square, to: Square): FenPosition {
  const source = squareToIndex(from);
  const destination = squareToIndex(to);
  const board = [...createFenPosition(position).board];
  if (source !== destination && board[source] !== null) {
    board[destination] = board[source];
    board[source] = null;
  }
  return createFenPosition({ ...position, board });
}

export function updateMetadata(position: FenPosition, patch: Partial<FenMetadata>): FenPosition {
  return createFenPosition({ ...position, ...patch, board: position.board });
}
