import { ChessBoard } from "../../../types/chess-board";
import { PieceEnum } from "../../../types/piece.enum";
import { SquareIndex } from "../../../types/square-index";
import { parsePieceValue } from "./board-defaults";

export const DefaultFenString = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function parseFenString(fen: string): ChessBoard {
  const fenBoardSlice = fen.indexOf(' ') > 0 ? fen.slice(0, fen.indexOf(' ')) : fen;
  const board = new ChessBoard();
  let rank = -1, file, i = 0, rowEnd;

  do {
    rowEnd = fenBoardSlice.indexOf('/', i);
    if (rowEnd == -1) {
      rowEnd = fenBoardSlice.length;
    }

    ++rank;
    file = 0;

    while (i < rowEnd) {
      if (fenBoardSlice[i].match("[1-8]")) {
        let emptyCells = Number.parseInt(fenBoardSlice[i]);
        while (emptyCells > 0) {
          const squareIndex = SquareIndex.fromFileRank(file, rank);
          board.setPieceAt(squareIndex, PieceEnum.NONE);
          --emptyCells;
          ++file;
        }
      }
      else {
        const squareIndex = SquareIndex.fromFileRank(file, rank);
        board.setPieceAt(squareIndex, parsePieceValue(fenBoardSlice[i]));
        ++file;
      }

      ++i;
    }

    ++i;
  }
  while (i < fenBoardSlice.length);
  return board;
}
