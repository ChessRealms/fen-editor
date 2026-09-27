import { describe, expect, it } from 'vitest';
import {
  createFenPosition, getFenWarnings, indexToSquare, movePiece, placePiece, removePiece,
  serializeFen, squareToIndex, updateMetadata,
} from './index';
import type { FenPosition, Piece, Square } from './index';
import { EMPTY_FEN, positionFromFen, RICH_FEN, STARTING_FEN } from './fen.fixtures';

describe('Position boundaries', () => {
  it('copies and freezes the position, board and castling rights', () => {
    const source = positionFromFen(RICH_FEN);
    const board = [...source.board];
    const castling = { ...source.castling };
    const input = { ...source, board, castling };
    const position = createFenPosition(input);
    board[0] = 'Q';
    castling.whiteKingside = false;
    input.activeColor = 'b';
    expect(serializeFen(position)).toBe(RICH_FEN);
    expect(position).not.toBe(input);
    expect(position.board).not.toBe(board);
    expect(position.castling).not.toBe(castling);
    expect(Object.isFrozen(position)).toBe(true);
    expect(Object.isFrozen(position.board)).toBe(true);
    expect(Object.isFrozen(position.castling)).toBe(true);
    expect(Reflect.set(position, 'activeColor', 'b')).toBe(false);
    expect(Reflect.set(position.board, '0', 'Q')).toBe(false);
    expect(Reflect.set(position.castling, 'whiteKingside', false)).toBe(false);
    expect(serializeFen(position)).toBe(RICH_FEN);
  });

  it.each([
    { board: [] }, { board: Array(63).fill(null) }, { board: Array(65).fill(null) },
    { board: Array(64) }, { board: [...Array(63).fill(null), undefined] },
    { board: [...Array(63).fill(null), 'x'] }, { board: null },
    { activeColor: 'W' }, { enPassant: 'a4' }, { enPassant: 'A3' }, { enPassant: 'e3\n' }, { enPassant: undefined },
    { castling: null }, { castling: {} },
    { castling: { whiteKingside: 1, whiteQueenside: false, blackKingside: false, blackQueenside: false } },
    { halfmoveClock: -1 }, { halfmoveClock: 0.5 }, { halfmoveClock: NaN },
    { halfmoveClock: Infinity }, { halfmoveClock: Number.MAX_SAFE_INTEGER + 1 },
    { halfmoveClock: '0' }, { fullmoveNumber: 0 }, { fullmoveNumber: -1 },
    { fullmoveNumber: 1.5 }, { fullmoveNumber: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects invalid programmatic values: %j', patch => {
    const invalid = { ...positionFromFen(EMPTY_FEN), ...patch } as unknown as FenPosition;
    expect(() => createFenPosition(invalid)).toThrow(RangeError);
    expect(() => serializeFen(invalid)).toThrow(RangeError);
    expect(() => getFenWarnings(invalid)).toThrow(RangeError);
  });

  it('converts every square in a8-to-h1 order', () => {
    let index = 0;
    for (const rank of [8, 7, 6, 5, 4, 3, 2, 1]) {
      for (const file of 'abcdefgh') {
        const square = `${file}${rank}` as Square;
        expect(squareToIndex(square)).toBe(index);
        expect(indexToSquare(index)).toBe(square);
        index++;
      }
    }
  });

  it.each([-1, 64, 1.5, NaN, Infinity, -Infinity])('rejects invalid index %s', index => {
    expect(() => indexToSquare(index)).toThrow(RangeError);
  });

  it.each(['', 'a0', 'a9', 'i1', 'A1', 'a11', ' a1', 'a1 ', 'a1\n', '11', null, 0])(
    'rejects invalid square %j in conversions and every board operation', value => {
      const square = value as Square;
      const position = positionFromFen(EMPTY_FEN);
      expect(() => squareToIndex(square)).toThrow(RangeError);
      expect(() => placePiece(position, square, 'K')).toThrow(RangeError);
      expect(() => removePiece(position, square)).toThrow(RangeError);
      expect(() => movePiece(position, square, 'a1')).toThrow(RangeError);
      expect(() => movePiece(position, 'a1', square)).toThrow(RangeError);
      expect(serializeFen(position)).toBe(EMPTY_FEN);
    });
});

describe('Immutable composition', () => {
  it.each([...'PNBRQKpnbrqk'] as Piece[])('places and replaces piece %s without changing metadata', piece => {
    const original = positionFromFen(RICH_FEN);
    const placed = placePiece(original, 'a8', piece);
    expect(placed.board[0]).toBe(piece);
    expect(placed.board.slice(1)).toEqual(original.board.slice(1));
    expect({ ...placed, board: original.board }).toEqual(original);
    expect(serializeFen(original)).toBe(RICH_FEN);
    expect(Object.isFrozen(placed.board)).toBe(true);
  });

  it('retains earlier snapshots across place, move, remove and metadata edits', () => {
    const original = positionFromFen(RICH_FEN);
    const placed = placePiece(original, 'h1', 'q');
    const moved = movePiece(placed, 'h1', 'a8');
    const removed = removePiece(moved, 'e8');
    const edited = updateMetadata(removed, { activeColor: 'b', halfmoveClock: 99 });
    expect(serializeFen(original)).toBe(RICH_FEN);
    expect(placed.board[63]).toBe('q');
    expect(placed.board[0]).toBe('r');
    expect(moved.board[63]).toBeNull();
    expect(moved.board[0]).toBe('q');
    expect(moved.board[4]).toBe('k');
    expect(removed.board[4]).toBeNull();
    for (const position of [placed, moved, removed]) {
      expect({ ...position, board: original.board }).toEqual(original);
      expect(position.board).not.toBe(original.board);
    }
    expect(edited.activeColor).toBe('b');
    expect(edited.halfmoveClock).toBe(99);
    expect(removed.activeColor).toBe('w');
    expect(removed.halfmoveClock).toBe(37);
  });

  it('treats self moves, empty-source moves and empty removals as no-ops', () => {
    const position = positionFromFen(RICH_FEN);
    expect(movePiece(position, 'a8', 'a8')).toEqual(position);
    expect(movePiece(position, 'a6', 'a8')).toEqual(position);
    expect(movePiece(position, 'a6', 'a6')).toEqual(position);
    expect(removePiece(position, 'a6')).toEqual(position);
    expect(placePiece(position, 'a8', 'r')).toEqual(position);
  });

  it('copies even no-op results at an external mutable boundary', () => {
    const source = positionFromFen(RICH_FEN);
    const board = [...source.board];
    const castling = { ...source.castling };
    const result = movePiece({ ...source, board, castling }, 'a6', 'a8');
    board[0] = null;
    castling.blackQueenside = false;
    expect(serializeFen(result)).toBe(RICH_FEN);
  });

  it('validates the board before an edit could hide a malformed input', () => {
    const position = positionFromFen(EMPTY_FEN);
    const invalid = { ...position, board: position.board.slice(0, 63) };
    expect(() => placePiece(invalid, 'h1', 'P')).toThrow(RangeError);
    expect(() => removePiece(invalid, 'h1')).toThrow(RangeError);
    expect(() => movePiece(invalid, 'h1', 'a8')).toThrow(RangeError);
  });

  it('does not perform castling, en passant capture or promotion', () => {
    const starting = positionFromFen(STARTING_FEN);
    const kingMove = movePiece(starting, 'e1', 'g1');
    expect(kingMove.board[squareToIndex('h1')]).toBe('R');
    expect(kingMove.castling).toEqual(starting.castling);
    const rich = positionFromFen(RICH_FEN);
    const pawnMove = movePiece(rich, 'e5', 'd6');
    expect(pawnMove.board[squareToIndex('d5')]).toBe('p');
    const backRank = movePiece(rich, 'e5', 'e8');
    expect(backRank.board[squareToIndex('e8')]).toBe('P');
    expect({ ...backRank, board: rich.board }).toEqual(rich);
  });

  it.each(['x', '', 'PP', 'P\n', null, 12])('rejects an invalid piece %j', piece => {
    expect(() => placePiece(positionFromFen(EMPTY_FEN), 'a8', piece as Piece)).toThrow(RangeError);
  });

  it('updates all metadata without changing board contents or retaining mutable rights', () => {
    const original = positionFromFen(RICH_FEN);
    const castling = { whiteKingside: false, whiteQueenside: true, blackKingside: true, blackQueenside: false };
    const updated = updateMetadata(original, { activeColor: 'b', castling, enPassant: 'h3',
      halfmoveClock: Number.MAX_SAFE_INTEGER, fullmoveNumber: Number.MAX_SAFE_INTEGER });
    castling.whiteQueenside = false;
    expect(updated.board).toEqual(original.board);
    expect(serializeFen(updated)).toBe(RICH_FEN.split(' ')[0] + ' b Qk h3 9007199254740991 9007199254740991');
    expect(serializeFen(original)).toBe(RICH_FEN);
    expect(updateMetadata(updated, { enPassant: null }).enPassant).toBeNull();
    expect(() => updateMetadata(original, { halfmoveClock: -1 })).toThrow(RangeError);
    expect(() => updateMetadata(original, { fullmoveNumber: 0 })).toThrow(RangeError);
    expect(() => updateMetadata(original, { enPassant: 'a4' } as never)).toThrow(RangeError);
    expect(() => updateMetadata(original, { castling: {} } as never)).toThrow(RangeError);
  });
});
