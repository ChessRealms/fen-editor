import { describe, expect, it } from 'vitest';
import { parseFen, serializeFen } from './fen';
import { EMPTY_FEN, positionFromFen, RICH_FEN, STARTING_FEN } from './fen.fixtures';
import { createFenPosition } from './position';
import type { FenError, FenErrorCode, FenField, Piece } from './types';

function errorsFrom(fen: string): readonly FenError[] {
  const result = parseFen(fen);
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('position');
  if (result.ok) throw new Error('Expected malformed FEN.');
  return result.errors;
}

describe('FEN import and canonical export', () => {
  it.each([
    STARTING_FEN, EMPTY_FEN, RICH_FEN,
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    '4k3/8/8/8/8/8/4P3/4K3 w - - 5 39',
    '8/8/8/8/8/8/8/8 b Qk - 9007199254740991 9007199254740991',
    'PPPPPPPP/pppppppp/KKKKKKKK/kkkkkkkk/QQQQQQQQ/qqqqqqqq/NNNNNNNN/nnnnnnnn b - a3 8 9',
  ])('round-trips all six fields: %s', fen => {
    const position = positionFromFen(fen);
    expect(serializeFen(position)).toBe(fen);
    expect(positionFromFen(serializeFen(position))).toEqual(position);
  });

  it('maps the board from a8 to h1 and retains every metadata value', () => {
    const position = positionFromFen(RICH_FEN);
    expect(position).toEqual({
      board: [
        'r', null, null, null, 'k', null, null, 'r',
        null, 'p', null, null, null, 'p', 'p', 'p',
        null, null, 'n', null, 'b', null, null, null,
        null, null, null, 'p', 'P', null, null, null,
        null, null, null, 'P', null, null, null, null,
        null, null, 'N', null, null, 'N', null, null,
        'P', 'P', 'P', null, null, 'P', 'P', 'P',
        'R', null, null, null, 'K', null, null, 'R',
      ],
      activeColor: 'w',
      castling: { whiteKingside: true, whiteQueenside: false, blackKingside: false, blackQueenside: true },
      enPassant: 'd6', halfmoveClock: 37, fullmoveNumber: 112,
    });
  });

  it('normalizes adjacent empty digits, ASCII whitespace and leading zeroes', () => {
    const input = ' \t\r\n44/11111111/26/62/35/53/71/17\tw\r\n-\f-\v00000 00001 \t';
    expect(serializeFen(positionFromFen(input))).toBe(EMPTY_FEN);
    expect(serializeFen(positionFromFen('8/8/8/8/8/8/8/8 b Kq h6 0009007199254740991 0002')))
      .toBe('8/8/8/8/8/8/8/8 b Kq h6 9007199254740991 2');
  });

  it('round-trips both colors, every castling subset and every en passant value', () => {
    for (const color of ['w', 'b']) {
      for (let mask = 0; mask < 16; mask++) {
        const rights = [...'KQkq'].filter((_, index) => mask & (1 << index)).join('') || '-';
        const enPassantValues = ['-', ...[...'abcdefgh'].flatMap(file => [file + '3', file + '6'])];
        for (const target of enPassantValues) {
          const fen = `8/8/8/8/8/8/8/8 ${color} ${rights} ${target} 17 42`;
          const position = positionFromFen(fen);
          expect(Object.values(position.castling)).toEqual([0, 1, 2, 3].map(bit => !!(mask & (1 << bit))));
          expect(position.activeColor).toBe(color);
          expect(position.enPassant).toBe(target === '-' ? null : target);
          expect(serializeFen(position)).toBe(fen);
          expect(positionFromFen(serializeFen(position))).toEqual(position);
        }
      }
    }
  });

  it('round-trips independently composed boards with every piece and empty runs at all files', () => {
    const cells: (Piece | null)[] = [null, 'P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
    const base = positionFromFen(RICH_FEN);
    for (let sample = 0; sample < 128; sample++) {
      const board = Array.from({ length: 64 }, (_, index) =>
        (index + sample) % 9 < sample % 9 ? null : cells[(index * 7 + sample) % cells.length]);
      const position = createFenPosition({ ...base, board });
      const serialized = serializeFen(position);
      expect(positionFromFen(serialized)).toEqual(position);
      expect(serializeFen(positionFromFen(serialized))).toBe(serialized);
    }
  });
});

describe('Structured syntax errors', () => {
  it.each(['', ' \t\r\n\f\v', 'invalid', '8/8/8/8/8/8/8/8', '8/8/8/8/8/8/8/8 w - -',
    '8/8/8/8/8/8/8/8 w - - 0 ', '8/8/8/8/8/8/8/8 w - - 0 1 extra',
    '8/8/8/8/8/8/8/8 w - - bm e4; id example;'])('stops at a wrong field count: %j', input => {
    const errors = errorsFrom(input);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: 'FEN_FIELD_COUNT', field: 'fen' });
  });

  it('uses zero-width missing spans and marks excess fields in the original text', () => {
    expect(errorsFrom(' \t')[0]).toEqual({ code: 'FEN_FIELD_COUNT', field: 'fen',
      span: { start: 2, end: 2 }, params: { expected: 6, actual: 0 } });
    const missing = EMPTY_FEN.slice(0, -1);
    expect(errorsFrom(missing)[0].span).toEqual({ start: missing.length, end: missing.length });
    const extra = EMPTY_FEN + '  extra\tfields \n';
    expect(errorsFrom(extra)[0].span).toEqual({ start: EMPTY_FEN.length + 2, end: extra.length - 2 });
  });

  it('reports rank count before checking rank tokens or width', () => {
    expect(errorsFrom('x/9 w - - 0 1')).toEqual([{
      code: 'BOARD_RANK_COUNT', field: 'board', span: { start: 0, end: 3 },
      params: { expected: 8, actual: 2 },
    }]);
    expect(errorsFrom('8/8/8/8/8/8/8/8/8 w - - 0 1')[0].code).toBe('BOARD_RANK_COUNT');
  });

  it('orders rank errors by source and suppresses width errors only in invalid-token ranks', () => {
    expect(errorsFrom('  7/8/9/8/88/8//8 w - - 0 1')).toEqual([
      { code: 'BOARD_RANK_WIDTH', field: 'board', span: { start: 2, end: 3 }, rank: 8,
        params: { expected: 8, actual: 7 } },
      { code: 'BOARD_TOKEN', field: 'board', span: { start: 6, end: 7 }, rank: 6, file: 'a',
        params: { token: '9' } },
      { code: 'BOARD_RANK_WIDTH', field: 'board', span: { start: 10, end: 12 }, rank: 4,
        params: { expected: 8, actual: 16 } },
      { code: 'BOARD_RANK_WIDTH', field: 'board', span: { start: 15, end: 15 }, rank: 2,
        params: { expected: 8, actual: 0 } },
    ]);
  });

  it('uses UTF-16 spans, including a supplementary character and following fields', () => {
    const input = ' \t1💥x/8/8/8/8/8/8/8 x - - 0 1';
    const errors = errorsFrom(input);
    expect(errors.map(({ code, span }) => ({ code, span }))).toEqual([
      { code: 'BOARD_TOKEN', span: { start: 3, end: 5 } },
      { code: 'BOARD_TOKEN', span: { start: 5, end: 6 } },
      { code: 'ACTIVE_COLOR', span: { start: 21, end: 22 } },
    ]);
    expect(errors[0]).toMatchObject({ rank: 8, file: 'b' });
    expect(errors[1]).not.toHaveProperty('file');
    expect(input.slice(errors[0].span.start, errors[0].span.end)).toBe('💥');
  });

  const invalidFields: [string, FenField, FenErrorCode][] = [
    ['x', 'activeColor', 'ACTIVE_COLOR'], ['W', 'activeColor', 'ACTIVE_COLOR'],
    ['K-', 'castling', 'CASTLING_TOKEN'], ['HAha', 'castling', 'CASTLING_TOKEN'],
    ['qK-', 'castling', 'CASTLING_TOKEN'], ['qKK', 'castling', 'CASTLING_DUPLICATE'],
    ['KK', 'castling', 'CASTLING_DUPLICATE'], ['QK', 'castling', 'CASTLING_ORDER'],
    ['kQ', 'castling', 'CASTLING_ORDER'], ['qk', 'castling', 'CASTLING_ORDER'],
    ['e4', 'enPassant', 'EN_PASSANT_SQUARE'], ['a2', 'enPassant', 'EN_PASSANT_SQUARE'],
    ['i3', 'enPassant', 'EN_PASSANT_SQUARE'], ['A6', 'enPassant', 'EN_PASSANT_SQUARE'],
    ['a33', 'enPassant', 'EN_PASSANT_SQUARE'],
  ];
  it.each(invalidFields)('rejects %s in %s with %s', (value, field, code) => {
    const fields = EMPTY_FEN.split(' ');
    const index = ['board', 'activeColor', 'castling', 'enPassant', 'halfmoveClock', 'fullmoveNumber'].indexOf(field);
    fields[index] = value;
    const errors = errorsFrom(fields.join(' '));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code, field });
  });

  it('points to the offending castling token, duplicate or out-of-order right', () => {
    for (const [rights, code, offset, length] of [
      ['K💥', 'CASTLING_TOKEN', 1, 2], ['qKK', 'CASTLING_DUPLICATE', 2, 1],
      ['qK', 'CASTLING_ORDER', 1, 1],
    ] as const) {
      const input = `8/8/8/8/8/8/8/8 w ${rights} - 0 1`;
      expect(errorsFrom(input)[0]).toMatchObject({ code, span: { start: 18 + offset, end: 18 + offset + length } });
    }
  });

  it.each(['-1', '+1', '1.0', '1e2', '0x10', 'Infinity', 'NaN', '١', '１', '1_000'])(
    'rejects non-ASCII-integer counter %j in both fields', value => {
      const errors = errorsFrom(`8/8/8/8/8/8/8/8 w - - ${value} ${value}`);
      expect(errors.map(({ code, field }) => [code, field])).toEqual([
        ['COUNTER_FORMAT', 'halfmoveClock'], ['COUNTER_FORMAT', 'fullmoveNumber'],
      ]);
    });

  it.each(['9007199254740992', '9007199254740993', '9'.repeat(400)])(
    'rejects unsafe counters rather than rounding: %s', value => {
      expect(errorsFrom(`8/8/8/8/8/8/8/8 w - - ${value} ${value}`).map(error => error.code))
        .toEqual(['COUNTER_RANGE', 'COUNTER_RANGE']);
    });

  it('rejects zero fullmove number and retains whole counter spans', () => {
    expect(errorsFrom('8/8/8/8/8/8/8/8 w - - 0 000')[0]).toMatchObject({
      code: 'COUNTER_RANGE', field: 'fullmoveNumber', span: { start: 24, end: 27 },
      params: { minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    });
  });

  it.each(['\u00a0', '\u2003', '\u200b', '\ufeff', '\u2028', '\u0085'])(
    'does not strip or split on Unicode separator %j', char => {
      expect(errorsFrom(char + EMPTY_FEN)[0].code).toBe('BOARD_TOKEN');
      expect(errorsFrom(EMPTY_FEN + char)[0].code).toBe('COUNTER_FORMAT');
      expect(errorsFrom(EMPTY_FEN.replace(' w ', char + 'w '))[0].code).toBe('FEN_FIELD_COUNT');
    });

  it.each(['0', '9', 'X', '.', '♔', '\u0000'])('rejects invalid board token %j', token => {
    expect(errorsFrom(`${token}/8/8/8/8/8/8/8 w - - 0 1`)[0].code).toBe('BOARD_TOKEN');
  });

  it('reports all fields in source order without exposing a partial position', () => {
    const input = '7/8/8/8/8/8/8/8 x qK a4 -1 0';
    expect(errorsFrom(input).map(({ code, field }) => [code, field])).toEqual([
      ['BOARD_RANK_WIDTH', 'board'], ['ACTIVE_COLOR', 'activeColor'], ['CASTLING_ORDER', 'castling'],
      ['EN_PASSANT_SQUARE', 'enPassant'], ['COUNTER_FORMAT', 'halfmoveClock'], ['COUNTER_RANGE', 'fullmoveNumber'],
    ]);
  });

  it('rejects EPD operations even when they happen to occupy six tokens', () => {
    expect(errorsFrom('8/8/8/8/8/8/8/8 w - - bm e4;').map(error => error.code))
      .toEqual(['COUNTER_FORMAT', 'COUNTER_FORMAT']);
  });

  it('returns bounded spans and no exceptions for deterministic malformed inputs', () => {
    let seed = 31;
    const alphabet = [...'PNBRQKpnbrqk01289/-+ wKQ💥\u00a0\u200b\t\n'];
    for (let sample = 0; sample < 250; sample++) {
      let token = '';
      for (let index = 0; index < sample % 40; index++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        token += alphabet[seed % alphabet.length];
      }
      for (const input of [token, `${token}/8/8/8/8/8/8/8 w - - 0 1`]) {
        const result = parseFen(input);
        if (!result.ok) {
          expect(result.errors.length).toBeGreaterThan(0);
          for (const error of result.errors) {
            expect(error.span.start).toBeGreaterThanOrEqual(0);
            expect(error.span.end).toBeGreaterThanOrEqual(error.span.start);
            expect(error.span.end).toBeLessThanOrEqual(input.length);
          }
        } else {
          expect(positionFromFen(serializeFen(result.position))).toEqual(result.position);
        }
      }
    }
  });
});
