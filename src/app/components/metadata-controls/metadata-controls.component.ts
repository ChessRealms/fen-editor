import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CastlingRights, EnPassantSquare, FenMetadata } from '../../domain/fen';

type Counter = 'halfmoveClock' | 'fullmoveNumber';

@Component({
  selector: 'app-metadata-controls',
  templateUrl: './metadata-controls.component.html',
  styleUrl: './metadata-controls.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetadataControlsComponent {
  readonly metadata = input.required<FenMetadata>();
  readonly metadataChanged = output<Partial<FenMetadata>>();
  readonly castlingOptions: readonly { key: keyof CastlingRights; label: string }[] = [
    { key: 'whiteKingside', label: 'White kingside (K)' },
    { key: 'whiteQueenside', label: 'White queenside (Q)' },
    { key: 'blackKingside', label: 'Black kingside (k)' },
    { key: 'blackQueenside', label: 'Black queenside (q)' },
  ];
  readonly enPassantSquares: readonly EnPassantSquare[] = [
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  ];
  readonly counters: readonly { key: Counter; label: string }[] = [
    { key: 'halfmoveClock', label: 'Halfmove clock' },
    { key: 'fullmoveNumber', label: 'Fullmove number' },
  ];
  private readonly numericDrafts = signal<Record<Counter, string | null>>({
    halfmoveClock: null, fullmoveNumber: null,
  });

  setActiveColor(value: string): void {
    if (value === 'w' || value === 'b') this.metadataChanged.emit({ activeColor: value });
  }

  setCastling(key: keyof CastlingRights, checked: boolean): void {
    this.metadataChanged.emit({ castling: { ...this.metadata().castling, [key]: checked } });
  }

  setEnPassant(value: string): void {
    if (value === '-') this.metadataChanged.emit({ enPassant: null });
    else {
      const square = this.enPassantSquares.find(square => square === value);
      if (square) this.metadataChanged.emit({ enPassant: square });
    }
  }

  counterText(key: Counter): string {
    return this.numericDrafts()[key] ?? String(this.metadata()[key]);
  }

  counterError(key: Counter): string | null {
    const text = this.counterText(key);
    const minimum = key === 'halfmoveClock' ? 0 : 1;
    return /^[0-9]+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) >= minimum
      ? null : `Enter a whole number from ${minimum} to ${Number.MAX_SAFE_INTEGER}, using digits only.`;
  }

  editCounter(key: Counter, text: string): void {
    this.numericDrafts.update(drafts => ({ ...drafts, [key]: text }));
    if (!this.counterError(key)) this.metadataChanged.emit({ [key]: Number(text) });
  }

  canonicalizeCounter(key: Counter): void {
    if (!this.counterError(key)) this.restoreCounter(key);
  }

  counterKeydown(event: KeyboardEvent, key: Counter): void {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      if (event.key === 'Escape') this.restoreCounter(key);
      else this.canonicalizeCounter(key);
    }
  }

  resetDrafts(): void {
    this.numericDrafts.set({ halfmoveClock: null, fullmoveNumber: null });
  }

  private restoreCounter(key: Counter): void {
    this.numericDrafts.update(drafts => ({ ...drafts, [key]: null }));
  }
}
