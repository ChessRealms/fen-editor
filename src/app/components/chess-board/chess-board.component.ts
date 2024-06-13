import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { createEmptyBoard, files, ranks } from './utils/board-defaults';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { SquareIndex } from '../../types/square-index';
import { PieceEnum } from '../../types/piece-enum';
import { FileRankIndexBySideColorPipe } from './utils/file-rank-index-by-side-color.pipe';
import { SquareIndexBySideColorPipe } from './utils/square-index-by-side-color.pipe';
import { PieceMove } from '../../types/piece-move';

@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [
    CommonModule,
    ChessPieceComponent,
    FileRankIndexBySideColorPipe,
    SquareIndexBySideColorPipe
  ],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessBoardComponent {
  @Input() squareSize: number;
  @Input() borderSize: number;
  @Input() dragEnabled: boolean;
  @Input() isBlackView: boolean;
  @Input() board$?: Observable<PieceEnum[]>;

  @Output() readonly pieceDroppedAt = new EventEmitter<SquareIndex>();
  @Output() readonly pieceMoved = new EventEmitter<PieceMove>();
  @Output() readonly clickedAtSquare = new EventEmitter<SquareIndex>();

  selectedSquare: SquareIndex;
  dragOverSquare: SquareIndex;

  constructor() {
    this.squareSize = 40;
    this.borderSize = this.squareSize / 2;
    this.isBlackView = false;
    this.dragEnabled = true;

    this.selectedSquare = SquareIndex.createEmpty();
    this.dragOverSquare = SquareIndex.createEmpty();
  }

  get ranks(): string[] {
    return ranks.split('');
  }

  get files(): string[] {
    return files.split('');
  }

  get nonePiece(): PieceEnum {
    return PieceEnum.NONE;
  }

  get emptyBoard(): PieceEnum[] {
    return createEmptyBoard();
  }

  squareClicked(index: SquareIndex): void {
    this.clickedAtSquare.emit(index);
  }

  indexFromFileRank(file: number, rank: number): SquareIndex {
    return SquareIndex.fromFileRank(file, rank);
  }

//#region Square NG Classes
  squareNgClass(index: SquareIndex): string[] {
    return [
      this.blackOrWhiteSquareNgClass(index),
      this.currentSelectionSquareNgClass(index),
      this.dragOverHightlightSquareNgClass(index)
    ];
  }

  blackOrWhiteSquareNgClass(squareIndex: SquareIndex): string {
    return 'square ' + (squareIndex.rankIndex % 2 != 0
      ? squareIndex.fileIndex % 2 != 0 ? 'black' : 'white'
      : squareIndex.fileIndex % 2 == 0 ? 'black' : 'white');
  }

  currentSelectionSquareNgClass(squareIndex: SquareIndex): string {
    if (!this.selectedSquare.isValid()) {
      return '';
    }

    return this.selectedSquare.isEquals(squareIndex) ? 'selected' : '';
  }

  dragOverHightlightSquareNgClass(squareIndex: SquareIndex): string {
    if (!this.dragOverSquare.isValid()) {
      return '';
    }

    return this.dragOverSquare.isEquals(squareIndex) ? 'drag-over' : '';
  }
//#endregion Square NG Classes

//#region Piece Drag Events
  pieceDragStart(event: DragEvent, index: SquareIndex) {
    this.selectedSquare = index;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  pieceDrop(index: SquareIndex) {
    if (this.selectedSquare.isValid()) {
      this.pieceMoved.emit({
        src: this.selectedSquare,
        dst: index
      });
    }
    else {
      this.pieceDroppedAt.emit(index);
    }

    this.pieceDragEnd();
  }

  pieceDragOver(event: DragEvent, index: SquareIndex) {
    this.dragOverSquare = index;
    event.preventDefault();
  }

  pieceDragLeave() {
    this.dragOverSquare = SquareIndex.createEmpty();
  }

  pieceDragEnd() {
    this.selectedSquare = SquareIndex.createEmpty();
    this.dragOverSquare = SquareIndex.createEmpty();
  }
//#endregion Piece Drag Events
}
