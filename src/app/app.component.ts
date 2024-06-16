import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { PieceEnum } from './types/piece.enum';
import { DefaultFenString, createFenString, parseFenString } from './components/chess-board/utils/fen-string';
import { SquareIndex } from './types/square-index';
import { ChessPieceComponent } from './components/chess-board/chess-piece/chess-piece.component';
import { PieceMove } from './types/piece-move';
import { ChessBoard } from './types/chess-board';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ChessBoardComponent, ChessPieceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'fen-editor';
  private _board: ChessBoard;
  board$: Subject<ChessBoard>;

  draggedPieceType: PieceEnum | null = null;
  selectedPieceType: PieceEnum | null = null;

  fen: string = "";

  private readonly destroy$ = new Subject<boolean>();
  constructor() {
    this._board = parseFenString(DefaultFenString);
    this.board$ = new BehaviorSubject(this._board);
  }

  ngOnInit(): void {
    this.board$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      this.fen = createFenString(board);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  get dragEnabled(): boolean {
    return this.selectedPieceType == null || this.draggedPieceType != null
  }

  get blackPieces(): PieceEnum[] {
    return [
      PieceEnum.BPawn,
      PieceEnum.BKnight,
      PieceEnum.BBishop,
      PieceEnum.BRook,
      PieceEnum.BQueen,
      PieceEnum.BKing
    ];
  }

  get whitePieces(): PieceEnum[] {
    return [
      PieceEnum.WPawn,
      PieceEnum.WKnight,
      PieceEnum.WBishop,
      PieceEnum.WRook,
      PieceEnum.WQueen,
      PieceEnum.WKing
    ]
  }

  get nonePiece(): PieceEnum {
    return PieceEnum.NONE;
  }

  actionBtnNgClass(value: PieceEnum | null): string {
    return this.selectedPieceType == value ? 'action-btn-selected' : ''
  }

  setSelectedPieceValue(value: PieceEnum | null): void {
    this.selectedPieceType = value;
  }

//#region Board management
  setPieceAtBoard(index: SquareIndex, piece: PieceEnum): void {
    this._board.setPieceAt(index, piece);
    this.board$.next(this._board);
  }

  movePiece(move: PieceMove): void {
    this._board.movePiece(move);
    this.board$.next(this._board);
  }
//#endregion Board management

  squareClicked(index: SquareIndex): void {
    console.log('square-click', index);
  }

  squareMouseDown(index: SquareIndex): void {
    console.log('square-mouse-down', index);
  }

  squareMousePressured(index: SquareIndex): void {
    if (this.selectedPieceType != null) {
      this.setPieceAtBoard(index, this.selectedPieceType);
    }

    console.log('mouse-pressured', index);
  }

  pieceDropped(index: SquareIndex): void {
    if (this.draggedPieceType == null) {
      return;
    }

    this.setPieceAtBoard(index, this.draggedPieceType);
    this.selectedPieceType = null;

    console.log('piece-drop', index);
    this.pieceDragEnd();
  }

  pieceDragged(move: PieceMove): void {
    if (!move.src.isEquals(move.dst)) {
      this.movePiece(move);
    }

    console.log('piece-dragged', move);
  }

  pieceDragStart(pieceType: PieceEnum): void {
    this.draggedPieceType = pieceType;
  }

  pieceDragEnd(): void {
    this.draggedPieceType = null;
  }
}
