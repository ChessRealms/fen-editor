import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { createEmptyBoard, files, ranks } from './utils/board-defaults';
import { Observable } from 'rxjs';
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
  @Input({ required: true }) board$!: Observable<PieceEnum[]>;

  @Output() readonly pieceDropped = new EventEmitter<SquareIndex>();
  @Output() readonly pieceDragged = new EventEmitter<PieceMove>();
  @Output() readonly squareClick = new EventEmitter<SquareIndex>();

  /** Emits `mouse-down` events. If `mouse-down` not realesed then emits `mouse-enter` event too. */
  @Output() readonly squareMousePressured = new EventEmitter<SquareIndex>();
  isMouseDown = false;

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

  indexFromFileRank(file: number, rank: number): SquareIndex {
    return SquareIndex.fromFileRank(file, rank);
  }

  squareMouseDown(index: SquareIndex): void {
    this.isMouseDown = true;
    this.squareMousePressured.emit(index);
  }

  squareMouseUp(): void {
    this.isMouseDown = false;
  }

  squareMouseEnter(index: SquareIndex): void {
    if (this.isMouseDown) {
      this.squareMousePressured.emit(index);
    }
  }

//#region Square NG Classes
  blackOrWhiteSquareNgClass(squareIndex: SquareIndex): string {
    return 'square ' + (squareIndex.rankIndex % 2 != 0
      ? squareIndex.fileIndex % 2 != 0 ? 'black' : 'white'
      : squareIndex.fileIndex % 2 == 0 ? 'black' : 'white');
  }

  squareNgClass(index: SquareIndex): string[] {
    return [
      this.blackOrWhiteSquareNgClass(index),
      this.dragOverHightlightSquareNgClass(index)
    ];
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
      this.pieceDragged.emit({
        src: this.selectedSquare,
        dst: index
      });
    }
    else {
      this.pieceDropped.emit(index);
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
    this.isMouseDown = false;
  }
//#endregion Piece Drag Events
}
