import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { ChessPieceComponent } from './components/chess-board/chess-piece/chess-piece.component';
import { PIECES } from './components/chess-board/chess-piece/piece-assets';
import { DefaultFenString, createFenString, parseFenString } from './components/chess-board/utils/fen-string';
import { ChessBoard } from './types/chess-board';
import { PieceEnum } from './types/piece.enum';
import { PieceMove } from './types/piece-move';
import { SquareIndex } from './types/square-index';

@Component({
  selector: 'app-root',
  imports: [ChessBoardComponent, ChessPieceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Temporary placement-only adapter. PR-03/04 replaces ChessBoard with FenPosition.
  readonly board = signal(parseFenString(DefaultFenString));
  readonly placement = computed(() => createFenString(this.board()));
  readonly tool = signal<PieceEnum | null>(null);
  readonly draggedPiece = signal<PieceEnum | null>(null);
  readonly blackPieces = PIECES.filter(piece => piece.color === 'black');
  readonly whitePieces = PIECES.filter(piece => piece.color === 'white');
  readonly erase = PieceEnum.NONE;

  selectTool(piece: PieceEnum | null): void {
    this.tool.set(piece);
  }

  place(square: SquareIndex): void {
    const piece = this.tool();
    if (piece !== null) this.setPiece(square, piece);
  }

  dropPalettePiece(square: SquareIndex): void {
    const piece = this.draggedPiece();
    if (piece === null) return;
    this.setPiece(square, piece);
    this.tool.set(null);
    this.draggedPiece.set(null);
  }

  startPaletteDrag(event: DragEvent, piece: PieceEnum): void {
    this.draggedPiece.set(piece);
    event.dataTransfer?.setData('text/plain', String(piece));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }

  move(move: PieceMove): void {
    if (move.src.isEquals(move.dst) || this.board().getPieceAt(move.src) === PieceEnum.NONE) return;
    this.updateBoard(board => board.movePiece(move));
  }

  private setPiece(square: SquareIndex, piece: PieceEnum): void {
    if (this.board().getPieceAt(square) === piece) return;
    this.updateBoard(board => board.setPieceAt(square, piece));
  }

  private updateBoard(change: (board: ChessBoard) => void): void {
    const next = ChessBoard.createEmpty();
    this.board().getPieces().forEach((piece, index) => next.setPieceAt(new SquareIndex(index), piece));
    change(next);
    this.board.set(next);
  }
}
