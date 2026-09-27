import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ChessBoardComponent, PaintStroke } from './components/chess-board/chess-board.component';
import { ChessPieceComponent } from './components/chess-board/chess-piece/chess-piece.component';
import { PIECES, pieceLabel } from './components/chess-board/chess-piece/piece-assets';
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
  readonly isBlackView = signal(false);
  readonly announcements = signal<readonly { text: string }[]>([]);
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
    this.announcePosition('FEN applied.');
  }

  useCurrentPosition(): void {
    this.draft.set(null);
    this.errors.set([]);
    this.announce('FEN draft restored to the applied position.');
  }

  editMetadata(patch: Partial<FenMetadata>): void {
    this.position.update(position => updateMetadata(position, patch));
  }

  resetPosition(): void {
    this.replacePosition(startingPosition());
    this.tool.set(null);
    this.announcePosition('Starting position restored. Move tool selected.');
  }

  clearPosition(): void {
    this.replacePosition(emptyPosition());
    this.tool.set(null);
    this.announcePosition('Board cleared. Move tool selected.');
  }

  flipBoard(): void {
    this.cancelInteraction();
    this.isBlackView.update(value => !value);
    this.announce(`${this.isBlackView() ? 'Black' : 'White'} side at the bottom.`);
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
    this.chessBoard()?.selectedSquare.set(null);
    this.position.set(position);
    this.metadataControls()?.resetDrafts();
    this.useCurrentPosition();
    this.copyResult.set(null);
  }

  private cancelInteraction(): void {
    this.chessBoard()?.cancelInteraction();
  }

  selectTool(piece: Piece | 'erase' | null): void {
    this.cancelInteraction();
    this.chessBoard()?.selectedSquare.set(null);
    this.tool.set(piece);
    this.announce(piece === null ? 'Move tool selected. Choose a piece, then a destination.'
      : piece === 'erase' ? 'Erase tool selected. Activate a square to erase it.'
        : `Place ${pieceLabel(piece)} selected. Activate a square to place it.`);
  }

  selectPaletteTool(event: MouseEvent, piece: Piece): void {
    if (event.detail === 0) this.selectTool(piece);
  }

  startPalettePointer(event: PointerEvent, piece: Piece): void {
    this.chessBoard()?.beginPalettePointer(event, piece);
  }

  paint(stroke: PaintStroke): void {
    // Publish one immutable position per completed stroke; drafts and metadata
    // follow the same path as a single-square edit.
    this.position.update(position => stroke.squares.reduce((current, square) => {
      if (current.board[squareToIndex(square)] === stroke.piece) return current;
      return stroke.piece === null ? removePiece(current, square) : placePiece(current, square, stroke.piece);
    }, position));
    this.announcePosition(stroke.squares.length === 1
      ? stroke.piece === null ? `${stroke.squares[0]} cleared.` : `${pieceLabel(stroke.piece)} placed on ${stroke.squares[0]}.`
      : stroke.piece === null ? `${stroke.squares.length} squares cleared.` : `${pieceLabel(stroke.piece)} placed on ${stroke.squares.length} squares.`);
  }

  dropPalettePiece(drop: { square: Square; piece: Piece }): void {
    this.paint({ squares: [drop.square], piece: drop.piece });
    this.tool.set(null);
  }

  move(move: { from: Square; to: Square }): void {
    const position = this.position();
    if (move.from === move.to || position.board[squareToIndex(move.from)] === null) return;
    this.position.set(movePiece(position, move.from, move.to));
    const replaced = position.board[squareToIndex(move.to)];
    this.announcePosition(`${pieceLabel(position.board[squareToIndex(move.from)])} moved from ${move.from} to ${move.to}.${replaced ? ' Replaced ' + pieceLabel(replaced) + '.' : ''}`);
  }

  announce(text: string): void {
    // Replace the child of the persistent live region so repeated commands
    // with the same message can still be announced.
    this.announcements.set([{ text }]);
  }

  private announcePosition(message: string): void {
    const count = this.warnings().length;
    this.announce(`${message} ${count ? `${count} position warning${count === 1 ? '' : 's'}. See Applied position warnings.` : 'No position warnings.'}`);
  }
}
