import { PieceEnum } from "../../../types/piece.enum";

export const files = "abcdefgh";
export const ranks = "87654321";

export function createEmptyBoard(): PieceEnum[] {
  const arr = new Array<PieceEnum>(64);
  for (let i = 0; i < 64; ++i) {
    arr[i] = PieceEnum.NONE;
  }
  return arr;
}

export function parsePieceValue(piece: string) {
  switch (piece) {
    case 'p': return PieceEnum.BPawn;
    case 'n': return PieceEnum.BKnight;
    case 'b': return PieceEnum.BBishop;
    case 'r': return PieceEnum.BRook;
    case 'q': return PieceEnum.BQueen;
    case 'k': return PieceEnum.BKing;
    case 'P': return PieceEnum.WPawn;
    case 'N': return PieceEnum.WKnight;
    case 'B': return PieceEnum.WBishop;
    case 'R': return PieceEnum.WRook;
    case 'Q': return PieceEnum.WQueen;
    case 'K': return PieceEnum.WKing;
    default:  return PieceEnum.NONE;
  }
}
