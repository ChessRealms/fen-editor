import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { pieceLabel } from './chess-piece/piece-assets';
import { ChessBoard } from '../../types/chess-board';
import { SquareIndex } from '../../types/square-index';
import { PieceEnum } from '../../types/piece.enum';
import { PieceMove } from '../../types/piece-move';

@Component({
  selector: 'app-chess-board',
  imports: [ChessPieceComponent],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:mouseup)': 'endPaint()',
    '(window:blur)': 'cancelInteraction()',
    '(keydown.escape)': 'cancelInteraction()',
  },
})
export class ChessBoardComponent {
  readonly board = input.required<ChessBoard>();
  readonly dragEnabled = input(true);
  readonly paintEnabled = input(false);
  readonly isBlackView = input(false);
  readonly squareActivated = output<SquareIndex>();
  readonly pieceMoved = output<PieceMove>();
  readonly paletteDropped = output<SquareIndex>();
  readonly draggedSquare = signal<SquareIndex | null>(null);
  readonly dropTarget = signal<SquareIndex | null>(null);
  readonly none = PieceEnum.NONE;
  readonly pieceLabel = pieceLabel;
  readonly squares = computed(() => Array.from({ length: 64 }, (_, index) => {
    const square = new SquareIndex(this.isBlackView() ? 63 - index : index);
    return {
      index: square,
      name: 'abcdefgh'[square.fileIndex] + (8 - square.rankIndex),
      dark: (square.fileIndex + square.rankIndex) % 2 === 1,
    };
  }));
  readonly files = computed(() => (this.isBlackView() ? 'hgfedcba' : 'abcdefgh').split(''));
  readonly ranks = computed(() => (this.isBlackView() ? '12345678' : '87654321').split(''));
  private painting = false;

  beginPaint(event: MouseEvent, square: SquareIndex): void {
    if (event.button !== 0 || !this.paintEnabled()) return;
    this.painting = true;
    this.squareActivated.emit(square);
  }

  continuePaint(event: MouseEvent, square: SquareIndex): void {
    if ((event.buttons & 1) === 0) this.endPaint();
    if (this.painting && this.paintEnabled()) this.squareActivated.emit(square);
  }

  endPaint(): void { this.painting = false; }

  activate(square: SquareIndex): void {
    // Handles clicks and native button keyboard activation as well as mouse painting.
    // The parent ignores duplicate writes of the same piece.
    this.squareActivated.emit(square);
  }

  startDrag(event: DragEvent, square: SquareIndex): void {
    if (!this.dragEnabled() || this.board().getPieceAt(square) === PieceEnum.NONE) {
      event.preventDefault();
      return;
    }
    this.endPaint();
    this.draggedSquare.set(square);
    event.dataTransfer?.setData('text/plain', String(square.value));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  dragOver(event: DragEvent, square: SquareIndex): void {
    event.preventDefault();
    this.dropTarget.set(square);
  }

  drop(event: DragEvent, square: SquareIndex): void {
    event.preventDefault();
    const source = this.draggedSquare();
    if (source) this.pieceMoved.emit({ src: source, dst: square });
    else this.paletteDropped.emit(square);
    this.cancelInteraction();
  }

  cancelInteraction(): void {
    this.endPaint();
    this.draggedSquare.set(null);
    this.dropTarget.set(null);
  }
}
