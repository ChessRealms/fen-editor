import { Piece } from '../../../domain/fen';

export const PIECES = [
  { value: 'p', color: 'black', label: 'black pawn', asset: 'assets/bp.svg' },
  { value: 'n', color: 'black', label: 'black knight', asset: 'assets/bn.svg' },
  { value: 'b', color: 'black', label: 'black bishop', asset: 'assets/bb.svg' },
  { value: 'r', color: 'black', label: 'black rook', asset: 'assets/br.svg' },
  { value: 'q', color: 'black', label: 'black queen', asset: 'assets/bq.svg' },
  { value: 'k', color: 'black', label: 'black king', asset: 'assets/bk.svg' },
  { value: 'P', color: 'white', label: 'white pawn', asset: 'assets/wp.svg' },
  { value: 'N', color: 'white', label: 'white knight', asset: 'assets/wn.svg' },
  { value: 'B', color: 'white', label: 'white bishop', asset: 'assets/wb.svg' },
  { value: 'R', color: 'white', label: 'white rook', asset: 'assets/wr.svg' },
  { value: 'Q', color: 'white', label: 'white queen', asset: 'assets/wq.svg' },
  { value: 'K', color: 'white', label: 'white king', asset: 'assets/wk.svg' },
] as const;

export function pieceLabel(piece: Piece | null): string {
  return PIECES.find(candidate => candidate.value === piece)?.label ?? 'empty';
}
