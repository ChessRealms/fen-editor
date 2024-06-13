import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { BehaviorSubject, Subject } from 'rxjs';
import { PieceEnum } from './types/piece-enum';
import { DefaultFenString, parseFenString } from './components/chess-board/utils/fen-string';
import { SquareIndex } from './types/square-index';
import { ChessPieceComponent } from './components/chess-board/chess-piece/chess-piece.component';
import { PieceMove } from './types/piece-move';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ChessBoardComponent, ChessPieceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'fen-editor';
  private _board: PieceEnum[];
  board$: Subject<PieceEnum[]>;

  selectedPieceType: PieceEnum | null = null;

  constructor() {
    this._board = parseFenString(DefaultFenString);
    this.board$ = new BehaviorSubject(this._board);
  }

  squareClicked(index: SquareIndex): void {
    console.log('square-click', index);
  }

  pieceDropped(index: SquareIndex): void {
    if (this.selectedPieceType == null) {
      return;
    }

    this._board[index.value] = this.selectedPieceType;
    this.board$.next(this._board);

    console.log('piece-drop', index);
    this.pieceDragEnd();
  }

  pieceMoved(move: PieceMove): void {
    if (move.src.isEquals(move.dst)) {
      return;
    }

    this.movePiece(move);
    console.log('piece-move', move);
  }

  movePiece(move: PieceMove): void {
    this._board[move.dst.value] = this._board[move.src.value];
    this._board[move.src.value] = PieceEnum.NONE;
    this.board$.next(this._board);
  }

  pieceDragStart(pieceType: PieceEnum): void {
    this.selectedPieceType = pieceType;
  }

  pieceDragEnd(): void {
    this.selectedPieceType = null;
  }

  get allPieceTypes(): PieceEnum[] {
    return [
      PieceEnum.BPawn,
      PieceEnum.BKnight,
      PieceEnum.BBishop,
      PieceEnum.BRook,
      PieceEnum.BQueen,
      PieceEnum.BKing,
      PieceEnum.WPawn,
      PieceEnum.WKnight,
      PieceEnum.WBishop,
      PieceEnum.WRook,
      PieceEnum.WQueen,
      PieceEnum.WKing
    ];
  }
}
