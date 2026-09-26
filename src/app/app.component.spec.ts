import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { SquareIndex } from './types/square-index';
import { PieceEnum } from './types/piece.enum';

describe('Editor shell', () => {
  let fixture: ComponentFixture<AppComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function button(label: string): HTMLButtonElement {
    const element = Array.from(root.querySelectorAll('button')).find(candidate =>
      candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label);
    if (!element) throw new Error('Button missing: ' + label);
    return element;
  }

  it('renders a zoneless board, all palette pieces and placement', () => {
    expect('Zone' in globalThis).toBe(false);
    expect(root.querySelectorAll('[data-square]')).toHaveLength(64);
    expect(root.querySelectorAll('.piece-tool')).toHaveLength(12);
    expect(root.querySelector<HTMLInputElement>('#placement')?.value)
      .toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(button('a8, black rook').classList.contains('dark')).toBe(false);
    expect(button('h8, black rook').classList.contains('dark')).toBe(true);
  });

  it('places and erases using UI events without mutating an earlier board snapshot', async () => {
    const original = fixture.componentInstance.board();
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').click();
    await fixture.whenStable();
    expect(button('e4, white queen')).toBeDefined();
    expect(original.getPieceAt(new SquareIndex(36))).toBe(PieceEnum.NONE);
    expect(root.querySelector<HTMLInputElement>('#placement')?.value)
      .toBe('rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR');
    button('Erase').click();
    await fixture.whenStable();
    button('e4, white queen').click();
    await fixture.whenStable();
    expect(button('e4, empty')).toBeDefined();
  });

  it('moves through board output, and treats self-drop as a no-op', async () => {
    const source = button('e2, white pawn');
    source.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    source.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(button('e2, white pawn')).toBeDefined();
    source.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    button('e4, empty').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(button('e2, empty')).toBeDefined();
    expect(button('e4, white pawn')).toBeDefined();
  });

  it('does not move a piece when the drag ends without a drop', async () => {
    const original = fixture.componentInstance.board();
    button('e2, white pawn').dispatchEvent(new Event('dragstart', { bubbles: true }));
    button('e2, white pawn').dispatchEvent(new Event('dragend', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.board()).toBe(original);
    expect(root.querySelector('.dragging')).toBeNull();
  });

  it('stops painting after a mouse release outside the board', async () => {
    button('Place black bishop').click();
    await fixture.whenStable();
    button('a4, empty').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, buttons: 1 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button('b4, empty').dispatchEvent(new MouseEvent('mouseenter', { buttons: 0 }));
    await fixture.whenStable();
    expect(button('a4, black bishop')).toBeDefined();
    expect(button('b4, empty')).toBeDefined();
  });
});

describe('Board orientation input', () => {
  it('reverses rendering without changing logical square identities', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent, ChessBoardComponent] }).compileComponents();
    const app = TestBed.createComponent(AppComponent);
    const fixture = TestBed.createComponent(ChessBoardComponent);
    fixture.componentRef.setInput('board', app.componentInstance.board());
    fixture.componentRef.setInput('isBlackView', true);
    await fixture.whenStable();
    const squares = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-square]');
    expect(squares[0].getAttribute('data-square')).toBe('h1');
    expect(squares[63].getAttribute('data-square')).toBe('a8');
  });
});
