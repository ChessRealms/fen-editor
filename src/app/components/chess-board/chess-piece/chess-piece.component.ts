import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PieceEnum } from '../../../types/piece.enum';
import { PIECES } from './piece-assets';

@Component({
  selector: 'app-chess-piece',
  templateUrl: './chess-piece.component.html',
  styleUrl: './chess-piece.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessPieceComponent {
  readonly piece = input.required<PieceEnum>();
  readonly asset = computed(() => PIECES.find(piece => piece.value === this.piece())?.asset);
}
