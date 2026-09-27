import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { ChessPieceComponent } from './components/chess-board/chess-piece/chess-piece.component';
import { PIECES } from './components/chess-board/chess-piece/piece-assets';
import { MetadataControlsComponent } from './components/metadata-controls/metadata-controls.component';
import { ClipboardService } from './clipboard.service';
import {
  FenError, FenMetadata, FenPosition, Piece, Square, getFenWarnings, movePiece, parseFen,
  placePiece, removePiece, serializeFen, squareToIndex, updateMetadata,
} from './domain/fen';
import { describeFenError, describeFenWarning } from './fen-messages';

function startingPosition(): FenPosition {
  const result = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  if (!result.ok) throw new Error('Invalid starting position.');
  return result.position;
}

function emptyPosition(): FenPosition {
  const result = parseFen('8/8/8/8/8/8/8/8 w - - 0 1');
  if (!result.ok) throw new Error('Invalid empty position.');
  return result.position;
}

@Component({
  selector: 'app-root',
  imports: [ChessBoardComponent, ChessPieceComponent, MetadataControlsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly position = signal(startingPosition());
  readonly canonicalFen = computed(() => serializeFen(this.position()));
  // A null draft follows the applied position. An explicit draft survives edits,
  // even if a later edit happens to produce the same FEN.
  private readonly draft = signal<string | null>(null);
  readonly fenDraft = computed(() => this.draft() ?? this.canonicalFen());
  readonly hasUnappliedDraft = computed(() => this.draft() !== null);
  readonly errors = signal<readonly FenError[]>([]);
  readonly warnings = computed(() => getFenWarnings(this.position()));
  readonly describeError = describeFenError;
  readonly describeWarning = describeFenWarning;
  readonly tool = signal<Piece | 'erase' | null>(null);
  readonly draggedPiece = signal<Piece | null>(null);
  readonly isBlackView = signal(false);
  readonly copyPending = signal(false);
  private readonly copyResult = signal<{ fen: string; message: string } | null>(null);
  readonly copyMessage = computed(() => {
    const result = this.copyResult();
    return result?.fen === this.canonicalFen() ? result.message : '';
  });
  readonly blackPieces = PIECES.filter(piece => piece.color === 'black');
  readonly whitePieces = PIECES.filter(piece => piece.color === 'white');
  private readonly chessBoard = viewChild(ChessBoardComponent);
  private readonly metadataControls = viewChild(MetadataControlsComponent);
  private readonly clipboard = inject(ClipboardService);

  editFenDraft(text: string): void {
    this.draft.set(text === this.canonicalFen() ? null : text);
    this.errors.set([]);
  }

  applyFen(event: Event, input: HTMLTextAreaElement): void {
    event.preventDefault();
    const result = parseFen(this.fenDraft());
    if (!result.ok) {
      this.errors.set(result.errors);
      input.focus();
      const { start, end } = result.errors[0].span;
      input.setSelectionRange(start, end);
      return;
    }
    this.replacePosition(result.position);
  }

  useCurrentPosition(): void {
    this.draft.set(null);
    this.errors.set([]);
  }

  editMetadata(patch: Partial<FenMetadata>): void {
    this.position.update(position => updateMetadata(position, patch));
  }

  resetPosition(): void {
    this.replacePosition(startingPosition());
    this.tool.set(null);
  }

  clearPosition(): void {
    this.replacePosition(emptyPosition());
    this.tool.set(null);
  }

  flipBoard(): void {
    this.cancelInteraction();
    this.isBlackView.update(value => !value);
  }

  async copyFen(input: HTMLTextAreaElement): Promise<void> {
    if (this.copyPending()) return;
    const fen = this.canonicalFen();
    this.copyPending.set(true);
    this.copyResult.set(null);
    try {
      await this.clipboard.writeText(fen);
      this.copyResult.set({ fen, message: 'Applied FEN copied.' });
    } catch {
      this.copyResult.set({ fen, message: 'Copy failed. Select Applied FEN and copy it manually.' });
      if (fen === this.canonicalFen()) {
        input.focus();
        input.select();
      }
    } finally {
      this.copyPending.set(false);
    }
  }

  private replacePosition(position: FenPosition): void {
    this.cancelInteraction();
    this.position.set(position);
    this.metadataControls()?.resetDrafts();
    this.useCurrentPosition();
    this.copyResult.set(null);
  }

  private cancelInteraction(): void {
    this.chessBoard()?.cancelInteraction();
    this.draggedPiece.set(null);
  }

  selectTool(piece: Piece | 'erase' | null): void {
    this.tool.set(piece);
  }

  place(square: Square): void {
    const piece = this.tool();
    if (piece !== null) this.setPiece(square, piece === 'erase' ? null : piece);
  }

  dropPalettePiece(square: Square): void {
    const piece = this.draggedPiece();
    if (piece === null) return;
    this.setPiece(square, piece);
    this.tool.set(null);
    this.draggedPiece.set(null);
  }

  startPaletteDrag(event: DragEvent, piece: Piece): void {
    this.draggedPiece.set(piece);
    event.dataTransfer?.setData('text/plain', String(piece));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }

  move(move: { from: Square; to: Square }): void {
    const position = this.position();
    if (move.from === move.to || position.board[squareToIndex(move.from)] === null) return;
    this.position.set(movePiece(position, move.from, move.to));
  }

  private setPiece(square: Square, piece: Piece | null): void {
    const position = this.position();
    if (position.board[squareToIndex(square)] === piece) return;
    this.position.set(piece === null ? removePiece(position, square) : placePiece(position, square, piece));
  }
}
