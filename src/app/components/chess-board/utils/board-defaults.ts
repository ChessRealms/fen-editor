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

export function pieceValueToString(piece: PieceEnum): string {
  switch (piece) {
    case PieceEnum.BPawn: return 'p';
    case PieceEnum.BKnight: return 'n';
    case PieceEnum.BBishop: return 'b';
    case PieceEnum.BRook: return 'r';
    case PieceEnum.BQueen: return 'q';
    case PieceEnum.BKing: return 'k';
    case PieceEnum.WPawn: return 'P';
    case PieceEnum.WKnight: return 'N';
    case PieceEnum.WBishop: return 'B';
    case PieceEnum.WRook: return 'R';
    case PieceEnum.WQueen: return 'Q';
    case PieceEnum.WKing: return 'K';
    default: return '';
  }
}
