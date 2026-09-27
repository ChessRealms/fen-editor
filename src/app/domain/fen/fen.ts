import { createFenPosition, isPiece } from './position';
import type {
  CastlingRights, EnPassantSquare, FenError, FenErrorCode, FenField, FenParseResult,
  FenPosition, File, Piece, Rank, TextSpan,
} from './types';

interface Token extends TextSpan {
  readonly text: string;
}

function error(code: FenErrorCode, field: FenField, span: TextSpan,
  params?: FenError['params']): FenError {
  return { code, field, span: { start: span.start, end: span.end }, ...(params ? { params } : {}) };
}

function parseBoard(token: Token, errors: FenError[]): (Piece | null)[] {
  const ranks = token.text.split('/');
  if (ranks.length !== 8) {
    errors.push(error('BOARD_RANK_COUNT', 'board', token, { expected: 8, actual: ranks.length }));
    return [];
  }
  const board: (Piece | null)[] = [];
  let start = token.start;
  ranks.forEach((text, row) => {
    const rank = (8 - row) as Rank;
    let width = 0;
    let offset = start;
    let invalid = false;
    for (const char of text) {
      if (isPiece(char)) {
        if (width < 8) board.push(char);
        width++;
      } else if (/^[1-8]$/.test(char)) {
        const count = Number(char);
        // A bad rank must not create unbounded board storage.
        for (let cell = 0; cell < count && width + cell < 8; cell++) board.push(null);
        width += count;
      } else {
        errors.push({
          ...error('BOARD_TOKEN', 'board', { start: offset, end: offset + char.length }, { token: char }),
          rank,
          ...(!invalid && width < 8 ? { file: String.fromCharCode(97 + width) as File } : {}),
        });
        invalid = true;
      }
      offset += char.length;
    }
    if (!invalid && width !== 8) {
      errors.push({
        ...error('BOARD_RANK_WIDTH', 'board', { start, end: start + text.length },
          { expected: 8, actual: width }),
        rank,
      });
    }
    start += text.length + 1;
  });
  return board;
}

function parseCastling(token: Token, errors: FenError[]): CastlingRights {
  const rights = token.text;
  const bad = /[^KQkq]/u.exec(rights);
  if (rights !== '-' && bad) {
    errors.push(error('CASTLING_TOKEN', 'castling', {
      start: token.start + bad.index, end: token.start + bad.index + bad[0].length,
    }, { token: bad[0] }));
  } else if (rights !== '-') {
    const duplicate = [...rights].findIndex((right, index) => rights.indexOf(right) !== index);
    const unordered = [...rights].findIndex((right, index) =>
      index > 0 && 'KQkq'.indexOf(right) < 'KQkq'.indexOf(rights[index - 1]));
    const index = duplicate >= 0 ? duplicate : unordered;
    if (index >= 0) {
      errors.push(error(duplicate >= 0 ? 'CASTLING_DUPLICATE' : 'CASTLING_ORDER', 'castling', {
        start: token.start + index, end: token.start + index + 1,
      }, { token: rights[index] }));
    }
  }
  return {
    whiteKingside: rights.includes('K'), whiteQueenside: rights.includes('Q'),
    blackKingside: rights.includes('k'), blackQueenside: rights.includes('q'),
  };
}

function parseCounter(token: Token, field: 'halfmoveClock' | 'fullmoveNumber',
  errors: FenError[]): number {
  const value = Number(token.text);
  const minimum = field === 'halfmoveClock' ? 0 : 1;
  if (token.text.length === 0 || /[^0-9]/.test(token.text)) {
    errors.push(error('COUNTER_FORMAT', field, token));
  } else if (!Number.isSafeInteger(value) || value < minimum) {
    errors.push(error('COUNTER_RANGE', field, token, { minimum, maximum: Number.MAX_SAFE_INTEGER }));
  }
  return value;
}

/** Never returns partial positions. Only the six ASCII whitespace characters separate fields. */
export function parseFen(text: string): FenParseResult {
  const tokens: Token[] = Array.from(text.matchAll(/[^ \t\r\n\f\v]+/g), match => ({
    text: match[0], start: match.index, end: match.index + match[0].length,
  }));
  if (tokens.length !== 6) {
    const span = tokens.length > 6
      ? { start: tokens[6].start, end: tokens[tokens.length - 1].end }
      : { start: text.length, end: text.length };
    return { ok: false, errors: [error('FEN_FIELD_COUNT', 'fen', span, { expected: 6, actual: tokens.length })] };
  }
  const errors: FenError[] = [];
  const board = parseBoard(tokens[0], errors);
  const activeColor = tokens[1].text;
  if (activeColor !== 'w' && activeColor !== 'b') {
    errors.push(error('ACTIVE_COLOR', 'activeColor', tokens[1]));
  }
  const castling = parseCastling(tokens[2], errors);
  const enPassant = tokens[3].text;
  if (enPassant !== '-' && (enPassant.length !== 2 || !/^[a-h][36]$/.test(enPassant))) {
    errors.push(error('EN_PASSANT_SQUARE', 'enPassant', tokens[3]));
  }
  const halfmoveClock = parseCounter(tokens[4], 'halfmoveClock', errors);
  const fullmoveNumber = parseCounter(tokens[5], 'fullmoveNumber', errors);
  if (errors.length > 0 || (activeColor !== 'w' && activeColor !== 'b')) return { ok: false, errors };
  return {
    ok: true,
    position: createFenPosition({
      board, activeColor, castling,
      enPassant: enPassant === '-' ? null : enPassant as EnPassantSquare,
      halfmoveClock, fullmoveNumber,
    }),
  };
}

export function serializeFen(input: FenPosition): string {
  const position = createFenPosition(input);
  const ranks: string[] = [];
  for (let row = 0; row < 8; row++) {
    let text = '';
    let empty = 0;
    for (const piece of position.board.slice(row * 8, row * 8 + 8)) {
      if (piece === null) {
        empty++;
      } else {
        if (empty > 0) text += empty;
        empty = 0;
        text += piece;
      }
    }
    if (empty > 0) text += empty;
    ranks.push(text);
  }
  const rights = position.castling;
  const castling = (rights.whiteKingside ? 'K' : '') + (rights.whiteQueenside ? 'Q' : '') +
    (rights.blackKingside ? 'k' : '') + (rights.blackQueenside ? 'q' : '');
  return [ranks.join('/'), position.activeColor, castling || '-', position.enPassant ?? '-',
    position.halfmoveClock, position.fullmoveNumber].join(' ');
}
