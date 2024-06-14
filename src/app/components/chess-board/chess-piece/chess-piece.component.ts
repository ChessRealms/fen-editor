import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PieceEnum } from '../../../types/piece-enum';

@Component({
  selector: 'app-chess-piece',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chess-piece.component.html',
  styleUrl: './chess-piece.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessPieceComponent {
  @Input() piece: PieceEnum;

  constructor() {
    this.piece = PieceEnum.WRook;
  }

  get wPawn() {
    return PieceEnum.WPawn;
  }

  get wKnight() {
    return PieceEnum.WKnight;
  }

  get wBishop() {
    return PieceEnum.WBishop;
  }

  get wRook() {
    return PieceEnum.WRook;
  }

  get wQueen() {
    return PieceEnum.WQueen;
  }

  get wKing() {
    return PieceEnum.WKing;
  }

  get bPawn() {
    return PieceEnum.BPawn;
  }

  get bKnight() {
    return PieceEnum.BKnight;
  }

  get bBishop() {
    return PieceEnum.BBishop;
  }

  get bRook() {
    return PieceEnum.BRook;
  }

  get bQueen() {
    return PieceEnum.BQueen;
  }

  get bKing() {
    return PieceEnum.BKing;
  }
}
