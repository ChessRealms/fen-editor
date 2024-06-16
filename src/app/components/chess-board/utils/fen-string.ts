import { ChessBoard } from "../../../types/chess-board";
import { PieceEnum } from "../../../types/piece.enum";
import { Position } from "../../../types/position";
import { SquareIndex } from "../../../types/square-index";
import { parsePieceValue, pieceValueToString } from "./board-defaults";

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

export function createFenString(board: ChessBoard): string {
  let fen = '';
  for (let rank = 0; rank < 8; ++rank) {
    let rankStr = '';
    let emptySquares = 0;
    for (let file = 0; file < 8; ++file) {
      const square = SquareIndex.fromFileRank(file, rank);
      const piece = board.getPieceAt(square);
      if (piece != PieceEnum.NONE) {
        if (emptySquares > 0) {
          rankStr += emptySquares.toString();
          emptySquares = 0;
        }

        rankStr += pieceValueToString(piece);
      }
      else {
        ++emptySquares;
      }
    }

    if (emptySquares > 0) {
      rankStr += emptySquares.toString();
    }

    fen += rankStr
    if (rank < 7) {
      fen += '/';
    }
  }
  return fen;
}
