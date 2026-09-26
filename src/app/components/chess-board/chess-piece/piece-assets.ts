import { PieceEnum } from '../../../types/piece.enum';

export const PIECES = [
  { value: PieceEnum.BPawn, color: 'black', label: 'black pawn', asset: 'assets/bp.svg' },
  { value: PieceEnum.BKnight, color: 'black', label: 'black knight', asset: 'assets/bn.svg' },
  { value: PieceEnum.BBishop, color: 'black', label: 'black bishop', asset: 'assets/bb.svg' },
  { value: PieceEnum.BRook, color: 'black', label: 'black rook', asset: 'assets/br.svg' },
  { value: PieceEnum.BQueen, color: 'black', label: 'black queen', asset: 'assets/bq.svg' },
  { value: PieceEnum.BKing, color: 'black', label: 'black king', asset: 'assets/bk.svg' },
  { value: PieceEnum.WPawn, color: 'white', label: 'white pawn', asset: 'assets/wp.svg' },
  { value: PieceEnum.WKnight, color: 'white', label: 'white knight', asset: 'assets/wn.svg' },
  { value: PieceEnum.WBishop, color: 'white', label: 'white bishop', asset: 'assets/wb.svg' },
  { value: PieceEnum.WRook, color: 'white', label: 'white rook', asset: 'assets/wr.svg' },
  { value: PieceEnum.WQueen, color: 'white', label: 'white queen', asset: 'assets/wq.svg' },
  { value: PieceEnum.WKing, color: 'white', label: 'white king', asset: 'assets/wk.svg' },
] as const;

export function pieceLabel(piece: PieceEnum): string {
  return PIECES.find(candidate => candidate.value === piece)?.label ?? 'empty';
}
