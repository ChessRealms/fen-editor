import { parseFen } from './fen';
import type { FenPosition } from './types';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
export const RICH_FEN = 'r3k2r/1p3ppp/2n1b3/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w Kq d6 37 112';

export function positionFromFen(fen: string): FenPosition {
  const result = parseFen(fen);
  if (!result.ok) throw new Error(`Invalid test fixture: ${JSON.stringify(result.errors)}`);
  return result.position;
}
