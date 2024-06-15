import { CastlingEnum } from "./castling.enum";
import { ChessBoard } from "./chess-board";
import { Color } from "./color";
import { SquareIndex } from "./square-index";

export interface Position {
  board: ChessBoard;
  color: Color;
  castling: CastlingEnum;
  enPassant: SquareIndex;
}
