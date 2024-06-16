import { PieceMove } from "./piece-move";
import { PieceEnum } from "./piece.enum";
import { SquareIndex } from "./square-index";

const CHESS_BOARD_SIZE = 64;

export class ChessBoard implements Iterable<PieceEnum> {
  private readonly _board: PieceEnum[];

  public constructor() {
    this._board = new Array(64);
  }

  *[Symbol.iterator](): Iterator<PieceEnum, any, undefined> {
    let i = 0;
    while (i < CHESS_BOARD_SIZE)
      yield this._board[i++];
  }

  /** Get all pieces in board. _`Careful! It allocates new array.`_ */
  getPieces(): PieceEnum[] {
    return [... this._board];
  }

  getPieceAt(index: SquareIndex): PieceEnum {
    return this._board[index.value];
  }

  setPieceAt(index: SquareIndex, piece: PieceEnum): void {
    this._board[index.value] = piece;
  }

  movePiece(move: PieceMove): void {
    this._board[move.dst.value] = this._board[move.src.value];
    this._board[move.src.value] = PieceEnum.NONE;
  }

  public static createEmpty(): ChessBoard {
    const board = new ChessBoard();
    for (let i = 0; i < CHESS_BOARD_SIZE; ++i)
      board._board[i] = PieceEnum.NONE;
    return board;
  }
}
