import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, input, output, signal, viewChild } from '@angular/core';
import { ChessPieceComponent } from './chess-piece/chess-piece.component';
import { pieceLabel } from './chess-piece/piece-assets';
import { FenPosition, Piece, Square, indexToSquare, squareToIndex } from '../../domain/fen';

export interface PaintStroke {
  readonly squares: readonly Square[];
  readonly piece: Piece | null;
}

interface Gesture {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly capture: HTMLElement;
  readonly startX: number;
  readonly startY: number;
  readonly kind: 'move' | 'paint' | 'palette';
  readonly source: Square | null;
  readonly piece: Piece | null;
  readonly squares: readonly Square[];
  readonly target: Square | null;
  readonly moved: boolean;
}

@Component({
  selector: 'app-chess-board',
  imports: [ChessPieceComponent],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointermove)': 'continuePointer($event)',
    '(document:pointerup)': 'endPointer($event)',
    '(document:pointercancel)': 'cancelPointer($event)',
    '(document:lostpointercapture)': 'cancelPointer($event)',
    '(document:keydown.escape)': 'escape($event)',
    '(window:blur)': 'cancelInteraction()',
    '(window:resize)': 'cancelInteraction()',
  },
})
export class ChessBoardComponent implements OnDestroy {
  readonly board = input.required<FenPosition['board']>();
  readonly tool = input<Piece | 'erase' | null>(null);
  readonly isBlackView = input(false);
  readonly strokeCompleted = output<PaintStroke>();
  readonly pieceMoved = output<{ from: Square; to: Square }>();
  readonly paletteDropped = output<{ square: Square; piece: Piece }>();
  readonly paletteSelected = output<Piece>();
  readonly announced = output<string>();
  readonly selectedSquare = signal<Square | null>(null);
  readonly focusedSquare = signal<Square>('a8');
  private readonly gesture = signal<Gesture | null>(null);
  private readonly boardElement = viewChild.required<ElementRef<HTMLElement>>('boardElement');
  readonly draggedSquare = computed(() => {
    const gesture = this.gesture();
    return gesture?.kind === 'move' && gesture.moved && gesture.piece ? gesture.source : null;
  });
  readonly dropTarget = computed(() => {
    const gesture = this.gesture();
    return gesture?.moved && gesture.piece && !this.isTouchPalette(gesture) ? gesture.target : null;
  });
  readonly previewBoard = computed(() => {
    const gesture = this.gesture();
    const board = [...this.board()];
    if (gesture?.kind === 'paint') {
      for (const square of gesture.squares) board[squareToIndex(square)] = gesture.piece;
    } else if (gesture?.moved && gesture.piece && gesture.target && !this.isTouchPalette(gesture)) {
      if (gesture.source) board[squareToIndex(gesture.source)] = null;
      board[squareToIndex(gesture.target)] = gesture.piece;
    }
    return board;
  });
  readonly previewSquares = computed(() => new Set(this.gesture()?.kind === 'paint' ? this.gesture()?.squares : []));
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
  readonly rows = computed(() => Array.from({ length: 8 }, (_, rank) => this.squares().slice(rank * 8, rank * 8 + 8)));

  keydown(event: KeyboardEvent, square: Square): void {
    if (event.isComposing || event.altKey || event.metaKey || event.shiftKey) return;
    if (event.ctrlKey && event.key !== 'Home' && event.key !== 'End') return;
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      return;
    }
    const index = this.squares().findIndex(candidate => candidate.name === square);
    const row = Math.floor(index / 8);
    const column = index % 8;
    let target: number;
    switch (event.key) {
      case 'ArrowLeft': target = row * 8 + Math.max(0, column - 1); break;
      case 'ArrowRight': target = row * 8 + Math.min(7, column + 1); break;
      case 'ArrowUp': target = Math.max(0, row - 1) * 8 + column; break;
      case 'ArrowDown': target = Math.min(7, row + 1) * 8 + column; break;
      case 'Home': target = event.ctrlKey ? 0 : row * 8; break;
      case 'End': target = event.ctrlKey ? 63 : row * 8 + 7; break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.cancelInteraction();
        this.selectedSquare.set(null);
        this.strokeCompleted.emit({ squares: [square], piece: null });
        return;
      default: return;
    }
    event.preventDefault();
    this.cancelInteraction();
    const name = this.squares()[target].name;
    this.boardElement().nativeElement.querySelector<HTMLButtonElement>(`[data-square="${name}"]`)?.focus();
  }

  beginPointer(event: PointerEvent, square: Square): void {
    const tool = this.tool();
    this.beginGesture(event, tool === null ? 'move' : 'paint', square,
      tool === null ? this.board()[squareToIndex(square)] : tool === 'erase' ? null : tool);
  }

  beginPalettePointer(event: PointerEvent, piece: Piece): void {
    // Touch users tap the palette, then tap/paint on the board. The palette
    // remains a native scrolling/zooming surface outside the board.
    this.beginGesture(event, 'palette', null, piece);
  }

  private isTouchPalette(gesture: Gesture): boolean {
    return gesture.kind === 'palette' && gesture.pointerType === 'touch';
  }

  activate(event: MouseEvent, square: Square): void {
    // Real pointer taps are handled on pointerup. Only keyboard/assistive
    // activation uses click, so a trailing drag/stroke click cannot edit twice.
    if (event.detail === 0 && !this.gesture()) this.activateSquare(square);
  }

  private activateSquare(square: Square): void {
    const tool = this.tool();
    if (tool !== null) {
      this.strokeCompleted.emit({ squares: [square], piece: tool === 'erase' ? null : tool });
      return;
    }
    const source = this.selectedSquare();
    if (source) {
      this.selectedSquare.set(null);
      if (source !== square) this.pieceMoved.emit({ from: source, to: square });
      else this.announced.emit('Selection canceled.');
    } else if (this.board()[squareToIndex(square)]) {
      this.selectedSquare.set(square);
      this.announced.emit(`${pieceLabel(this.board()[squareToIndex(square)])} on ${square} selected. Choose a destination, or press Escape to cancel.`);
    } else {
      this.announced.emit(`${square} is empty. Choose a square with a piece to move.`);
    }
  }

  private beginGesture(event: PointerEvent, kind: Gesture['kind'], source: Square | null, piece: Piece | null): void {
    if (!event.isPrimary || event.button !== 0 || this.gesture()) return;
    const capture = event.currentTarget as HTMLElement;
    capture.setPointerCapture(event.pointerId);
    this.gesture.set({
      pointerId: event.pointerId, pointerType: event.pointerType, capture, startX: event.clientX, startY: event.clientY,
      kind, source, piece, squares: kind === 'paint' && source ? [source] : [],
      target: source, moved: false,
    });
  }

  continuePointer(event: PointerEvent): void {
    const gesture = this.gesture();
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if ((event.buttons & 1) === 0) {
      this.cancelInteraction();
      return;
    }
    this.updatePointer(event);
  }

  private updatePointer(event: PointerEvent): void {
    const gesture = this.gesture();
    if (!gesture) return;
    const target = this.squareAt(event.clientX, event.clientY);
    const moved = gesture.moved || Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 6;
    this.gesture.set({ ...gesture, target, moved,
      squares: gesture.kind === 'paint' && target && !gesture.squares.includes(target)
        ? [...gesture.squares, target] : gesture.squares,
    });
  }

  private squareAt(x: number, y: number): Square | null {
    const board = this.boardElement().nativeElement;
    const element = board.ownerDocument.elementFromPoint(x, y)?.closest<HTMLElement>('[data-square]');
    return element && board.contains(element) ? element.dataset['square'] as Square : null;
  }

  endPointer(event: PointerEvent): void {
    if (event.pointerId !== this.gesture()?.pointerId) return;
    this.updatePointer(event);
    const gesture = this.gesture();
    if (!gesture) return;
    this.finishGesture();
    const { target, source, piece, moved, kind } = gesture;
    if (kind === 'palette') {
      if (!moved && piece && gesture.capture.contains(
        gesture.capture.ownerDocument.elementFromPoint(event.clientX, event.clientY),
      )) this.paletteSelected.emit(piece);
      else if (moved && target && piece && !this.isTouchPalette(gesture)) {
        this.selectedSquare.set(null);
        this.paletteDropped.emit({ square: target, piece });
      }
    } else if (target) {
      if (kind === 'paint') this.strokeCompleted.emit({ squares: gesture.squares, piece });
      else if (moved) {
        if (source && piece && source !== target) {
          this.selectedSquare.set(null);
          this.pieceMoved.emit({ from: source, to: target });
        }
      } else if (target === source) this.activateSquare(target);
    }
  }

  cancelPointer(event: PointerEvent): void {
    if (event.pointerId === this.gesture()?.pointerId) this.cancelInteraction();
  }

  escape(event: Event): void {
    if (event instanceof KeyboardEvent && event.isComposing) return;
    const hadGesture = this.gesture() !== null;
    const boardFocused = event.target instanceof Node && this.boardElement().nativeElement.contains(event.target);
    const hadSelection = boardFocused && this.selectedSquare() !== null;
    this.cancelInteraction();
    if (boardFocused) this.selectedSquare.set(null);
    if (hadGesture || hadSelection) this.announced.emit('Interaction canceled.');
  }

  cancelInteraction(): void {
    this.finishGesture();
  }

  private finishGesture(): void {
    const gesture = this.gesture();
    this.gesture.set(null);
    if (gesture?.capture.hasPointerCapture(gesture.pointerId)) {
      gesture.capture.releasePointerCapture(gesture.pointerId);
    }
  }

  ngOnDestroy(): void { this.cancelInteraction(); }
}
