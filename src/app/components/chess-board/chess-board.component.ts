import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { pieceLabel } from './chess-piece/piece-assets';
import { FenPosition, Square, indexToSquare, squareToIndex } from '../../domain/fen';

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
  readonly board = input.required<FenPosition['board']>();
  readonly dragEnabled = input(true);
  readonly paintEnabled = input(false);
  readonly isBlackView = input(false);
  readonly squareActivated = output<Square>();
  readonly pieceMoved = output<{ from: Square; to: Square }>();
  readonly paletteDropped = output<Square>();
  readonly draggedSquare = signal<Square | null>(null);
  readonly dropTarget = signal<Square | null>(null);
  readonly pieceLabel = pieceLabel;
  readonly squares = computed(() => Array.from({ length: 64 }, (_, index) => {
    const square = this.isBlackView() ? 63 - index : index;
    return {
      index: square,
      name: indexToSquare(square),
      dark: (square % 8 + Math.floor(square / 8)) % 2 === 1,
    };
  }));
  readonly files = computed(() => (this.isBlackView() ? 'hgfedcba' : 'abcdefgh').split(''));
  readonly ranks = computed(() => (this.isBlackView() ? '12345678' : '87654321').split(''));
  private painting = false;

  beginPaint(event: MouseEvent, square: Square): void {
    if (event.button !== 0 || !this.paintEnabled()) return;
    this.painting = true;
    this.squareActivated.emit(square);
  }

  continuePaint(event: MouseEvent, square: Square): void {
    if ((event.buttons & 1) === 0) this.endPaint();
    if (this.painting && this.paintEnabled()) this.squareActivated.emit(square);
  }

  endPaint(): void { this.painting = false; }

  activate(square: Square): void {
    // Handles clicks and native button keyboard activation as well as mouse painting.
    // The parent ignores duplicate writes of the same piece.
    this.squareActivated.emit(square);
  }

  startDrag(event: DragEvent, square: Square): void {
    if (!this.dragEnabled() || this.board()[squareToIndex(square)] === null) {
      event.preventDefault();
      return;
    }
    this.endPaint();
    this.draggedSquare.set(square);
    event.dataTransfer?.setData('text/plain', square);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  dragOver(event: DragEvent, square: Square): void {
    event.preventDefault();
    this.dropTarget.set(square);
  }

  drop(event: DragEvent, square: Square): void {
    event.preventDefault();
    const source = this.draggedSquare();
    if (source) this.pieceMoved.emit({ from: source, to: square });
    else this.paletteDropped.emit(square);
    this.cancelInteraction();
  }

  cancelInteraction(): void {
    this.endPaint();
    this.draggedSquare.set(null);
    this.dropTarget.set(null);
  }
}
