import { describe, expect, it } from 'vitest';
import { serializeFen } from './fen';
import { EMPTY_FEN, positionFromFen, STARTING_FEN } from './fen.fixtures';
import { placePiece, removePiece, updateMetadata } from './position';
import type { CastlingRights, Piece, Square } from './types';
import { getFenWarnings } from './warnings';

describe('Non-blocking plausibility warnings', () => {
  it('accepts an empty board, reports both missing kings and never repairs it', () => {
    const position = positionFromFen(EMPTY_FEN);
    expect(getFenWarnings(position)).toEqual([
      { code: 'KING_COUNT', field: 'board', squares: [], params: { color: 'w', count: 0 } },
      { code: 'KING_COUNT', field: 'board', squares: [], params: { color: 'b', count: 0 } },
    ]);
    expect(serializeFen(position)).toBe(EMPTY_FEN);
  });

  it.each([
    ['K', 'w'], ['k', 'b'],
  ] as const)('reports excess %s kings without adjacency checks', (piece, color) => {
    const base = positionFromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const position = placePiece(placePiece(base, 'd4', piece), 'd5', piece === 'K' ? 'k' : 'K');
    const warnings = getFenWarnings(position);
    expect(warnings).toContainEqual(expect.objectContaining({ code: 'KING_COUNT', params: { color, count: 2 } }));
    expect(warnings.some(warning => warning.code === 'KINGS_ADJACENT')).toBe(false);
  });

  it.each(['c3', 'd3', 'e3', 'c4', 'e4', 'c5', 'd5', 'e5'] as Square[])(
    'detects adjacent kings at d4 and %s', square => {
      const base = positionFromFen(EMPTY_FEN);
      const position = placePiece(placePiece(base, 'd4', 'K'), square, 'k');
      expect(getFenWarnings(position)).toEqual([{
        code: 'KINGS_ADJACENT', field: 'board', squares: ['d4', square],
      }]);
    });

  it.each([['h4', 'a5'], ['d4', 'f4'], ['a1', 'h8']] as [Square, Square][])(
    'does not treat distant kings at %s/%s as adjacent', (white, black) => {
      const position = placePiece(placePiece(positionFromFen(EMPTY_FEN), white, 'K'), black, 'k');
      expect(getFenWarnings(position)).toEqual([]);
    });

  it.each(['P', 'p'] as Piece[])('warns about %s on both back ranks only', piece => {
    const base = positionFromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const position = ['a8', 'h8', 'a1', 'h1', 'c2', 'c7'].reduce(
      (current, square) => placePiece(current, square as Square, piece), base);
    const warnings = getFenWarnings(position);
    expect(warnings.map(warning => warning.squares)).toEqual([['a8'], ['h8'], ['a1'], ['h1']]);
    expect(warnings.every(warning => warning.code === 'PAWN_BACK_RANK')).toBe(true);
  });

  const rights: [keyof CastlingRights, Square, Square, Piece][] = [
    ['whiteKingside', 'e1', 'h1', 'r'], ['whiteQueenside', 'e1', 'a1', 'r'],
    ['blackKingside', 'e8', 'h8', 'R'], ['blackQueenside', 'e8', 'a8', 'R'],
  ];
  it.each(rights)('checks the correct home king and rook for %s', (right, king, rook, wrongColorRook) => {
    const starting = positionFromFen(STARTING_FEN);
    const position = updateMetadata(starting, { castling: {
      whiteKingside: false, whiteQueenside: false, blackKingside: false, blackQueenside: false, [right]: true,
    } });
    expect(getFenWarnings(position)).toEqual([]);
    for (const changed of [removePiece(position, rook), removePiece(position, king),
      placePiece(position, rook, wrongColorRook), placePiece(position, king, 'Q')]) {
      expect(getFenWarnings(changed)).toContainEqual({
        code: 'CASTLING_PIECE_MISSING', field: 'castling', squares: [king, rook], params: { right },
      });
      expect(changed.castling[right]).toBe(true);
    }
    expect(getFenWarnings(updateMetadata(removePiece(position, rook), {
      castling: { ...position.castling, [right]: false },
    }))).toEqual([]);
  });

  it('keeps castling rights when paths are blocked or attacked', () => {
    const starting = positionFromFen(STARTING_FEN);
    expect(getFenWarnings(starting)).toEqual([]);
    const attacked = positionFromFen('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1');
    expect(getFenWarnings(attacked)).toEqual([]);
    expect(serializeFen(attacked)).toBe('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1');
  });

  const enPassantCases = [
    { fen: '4k3/8/8/3p4/8/8/8/4K3 w - d6 0 2', target: 'd6', pawn: 'd5', origin: 'd7', wrongPawn: 'P', wrongTurn: 'b' },
    { fen: '4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1', target: 'e3', pawn: 'e4', origin: 'e2', wrongPawn: 'p', wrongTurn: 'w' },
  ] as const;
  it.each(enPassantCases)('accepts en passant without a capturing pawn: $fen', ({ fen }) => {
    const position = positionFromFen(fen);
    expect(getFenWarnings(position)).toEqual([]);
    expect(serializeFen(position)).toBe(fen);
  });

  it.each(enPassantCases)('checks en passant turn, target, pawn, origin and clock: $target', entry => {
    const position = positionFromFen(entry.fen);
    expect(getFenWarnings(updateMetadata(position, { activeColor: entry.wrongTurn })))
      .toEqual([{ code: 'EN_PASSANT_TURN', field: 'enPassant', squares: [entry.target],
        params: { expectedColor: position.activeColor } }]);
    for (const changed of [placePiece(position, entry.target, 'N'), removePiece(position, entry.pawn),
      placePiece(position, entry.pawn, entry.wrongPawn), placePiece(position, entry.pawn, 'N'),
      placePiece(position, entry.origin, 'b')]) {
      expect(getFenWarnings(changed)).toEqual([{
        code: 'EN_PASSANT_POSITION', field: 'enPassant', squares: [entry.target, entry.pawn, entry.origin],
      }]);
    }
    expect(getFenWarnings(updateMetadata(position, { halfmoveClock: 1 })))
      .toEqual([{ code: 'EN_PASSANT_CLOCK', field: 'halfmoveClock', params: { expected: 0 } }]);
    expect(getFenWarnings(updateMetadata(position, { enPassant: null, halfmoveClock: 50 }))).toEqual([]);
    expect(serializeFen(position)).toBe(entry.fen);
  });

  it('checks the a/h-file en passant boundaries on both target ranks', () => {
    for (const [target, pawn, piece, activeColor] of [
      ['a3', 'a4', 'P', 'b'], ['h3', 'h4', 'P', 'b'],
      ['a6', 'a5', 'p', 'w'], ['h6', 'h5', 'p', 'w'],
    ] as const) {
      const base = positionFromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      const position = updateMetadata(placePiece(base, pawn, piece), { enPassant: target, activeColor });
      expect(getFenWarnings(position)).toEqual([]);
    }
  });

  it('returns multiple warnings in stable order without blocking import or canonical export', () => {
    const fen = 'P7/8/8/8/8/8/8/7p b KQkq a6 2 3';
    const position = positionFromFen(fen);
    const warnings = getFenWarnings(position);
    expect(warnings.map(warning => warning.code)).toEqual([
      'KING_COUNT', 'KING_COUNT', 'PAWN_BACK_RANK', 'PAWN_BACK_RANK',
      'CASTLING_PIECE_MISSING', 'CASTLING_PIECE_MISSING', 'CASTLING_PIECE_MISSING', 'CASTLING_PIECE_MISSING',
      'EN_PASSANT_TURN', 'EN_PASSANT_POSITION', 'EN_PASSANT_CLOCK',
    ]);
    expect(getFenWarnings(position)).toEqual(warnings);
    expect(serializeFen(position)).toBe(fen);
  });
});
