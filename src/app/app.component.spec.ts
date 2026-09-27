import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { squareToIndex } from './domain/fen';

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const importedFen = 'r3k2r/8/8/8/8/8/4P3/R3K2R b Kq a3 17 42';

describe('FEN editor', () => {
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

  function textarea(id: string): HTMLTextAreaElement {
    const element = root.querySelector<HTMLTextAreaElement>('#' + id);
    if (!element) throw new Error('Textarea missing: ' + id);
    return element;
  }

  async function editDraft(text: string): Promise<void> {
    const input = textarea('fen-draft');
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function applyDraft(text: string): Promise<void> {
    await editDraft(text);
    button('Apply FEN').click();
    await fixture.whenStable();
  }

  it('renders a zoneless board, all palette pieces and all six FEN fields', () => {
    expect('Zone' in globalThis).toBe(false);
    expect(root.querySelectorAll('[data-square]')).toHaveLength(64);
    expect(root.querySelectorAll('.piece-tool')).toHaveLength(12);
    expect(textarea('fen-draft').value).toBe(startingFen);
    expect(textarea('fen-draft').readOnly).toBe(false);
    expect(textarea('applied-fen').value).toBe(startingFen);
    expect(textarea('applied-fen').readOnly).toBe(true);
    expect(root.querySelector('#fen-status')?.textContent).toContain('Draft matches');
    expect(root.querySelector('.warnings')).toBeNull();
    expect(button('a8, black rook').classList.contains('dark')).toBe(false);
    expect(button('h8, black rook').classList.contains('dark')).toBe(true);
  });

  it('places and erases using UI events without mutating an earlier board snapshot', async () => {
    const original = fixture.componentInstance.position();
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').click();
    await fixture.whenStable();
    expect(button('e4, white queen')).toBeDefined();
    expect(original.board[squareToIndex('e4')]).toBeNull();
    expect(textarea('applied-fen').value)
      .toBe('rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(textarea('fen-draft').value).toBe(textarea('applied-fen').value);
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
    const original = fixture.componentInstance.position();
    button('e2, white pawn').dispatchEvent(new Event('dragstart', { bubbles: true }));
    button('e2, white pawn').dispatchEvent(new Event('dragend', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(original);
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

  it('keeps typing local, then atomically applies all six fields and canonicalizes the draft', async () => {
    const original = fixture.componentInstance.position();
    await editDraft('  r3k2r/8/8/8/8/8/4P3/R3K2R\tb Kq a3 0017 0042  ');
    expect(fixture.componentInstance.position()).toBe(original);
    expect(textarea('applied-fen').value).toBe(startingFen);
    expect(root.querySelector('#fen-status')?.textContent).toContain('Unapplied changes');
    button('Apply FEN').click();
    await fixture.whenStable();
    expect(textarea('fen-draft').value).toBe(importedFen);
    expect(textarea('applied-fen').value).toBe(importedFen);
    expect(fixture.componentInstance.position()).toMatchObject({
      activeColor: 'b', castling: { whiteKingside: true, whiteQueenside: false,
        blackKingside: false, blackQueenside: true },
      enPassant: 'a3', halfmoveClock: 17, fullmoveNumber: 42,
    });
    expect(button('a7, empty')).toBeDefined();
    expect(original.board[squareToIndex('a7')]).toBe('p');
    expect(root.querySelector('#fen-status')?.textContent).toContain('Draft matches');
  });

  it('applies on Enter without inserting a newline', async () => {
    await editDraft(importedFen);
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    textarea('fen-draft').dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(textarea('applied-fen').value).toBe(importedFen);
  });

  it('preserves imported metadata through placement, erasing, movement, painting and palette drop', async () => {
    await applyDraft(importedFen);
    const imported = fixture.componentInstance.position();
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').click();
    await fixture.whenStable();
    button('Erase').click();
    await fixture.whenStable();
    button('e4, white queen').click();
    await fixture.whenStable();
    button('Move').click();
    await fixture.whenStable();
    button('e2, white pawn').dispatchEvent(new Event('dragstart', { bubbles: true }));
    button('e4, empty').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    button('Place black bishop').click();
    await fixture.whenStable();
    button('a4, empty').dispatchEvent(new MouseEvent('mousedown', { button: 0, buttons: 1 }));
    button('b4, empty').dispatchEvent(new MouseEvent('mouseenter', { buttons: 1 }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    await fixture.whenStable();
    button('Place black knight').dispatchEvent(new Event('dragstart', { bubbles: true }));
    button('a1, white rook').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe('r3k2r/8/8/8/bb2P3/8/8/n3K2R b Kq a3 17 42');
    expect(textarea('fen-draft').value).toBe(textarea('applied-fen').value);
    expect(imported.board[squareToIndex('a1')]).toBe('R');
    expect(imported.board[squareToIndex('e2')]).toBe('P');
    expect(imported.board[squareToIndex('e4')]).toBeNull();
  });

  it.each([
    ['8/8/8/8/8/8/8/7 b - - 0 1', 'Piece placement, rank 1'],
    ['8/8/8/8/8/8/8/8 x - - 0 1', 'Active color'],
    ['8/8/8/8/8/8/8/8 b KK - 0 1', 'Castling'],
    ['8/8/8/8/8/8/8/8 b - a4 0 1', 'En passant'],
    ['8/8/8/8/8/8/8/8 b - - -1 1', 'Halfmove clock'],
    ['8/8/8/8/8/8/8/8 b - - 0 0', 'Fullmove number'],
    ['8/8/8/8/8/8/8/8', 'FEN'],
  ])('rejects malformed FEN atomically: %s', async (draft, field) => {
    const original = fixture.componentInstance.position();
    await applyDraft(draft);
    expect(fixture.componentInstance.position()).toBe(original);
    expect(textarea('applied-fen').value).toBe(startingFen);
    expect(textarea('fen-draft').value).toBe(draft);
    expect(textarea('fen-draft').getAttribute('aria-invalid')).toBe('true');
    expect(textarea('fen-draft').getAttribute('aria-describedby')).toContain('fen-errors');
    expect(root.querySelector('#fen-errors')?.textContent).toContain(field);
    expect(root.querySelector('.warnings')).toBeNull();
  });

  it('selects the first error span and preserves exact invalid input and errors across board edits', async () => {
    const draft = '  8/8/8/8/8/8/8/8 x - a4 0 0  ';
    await applyDraft(draft);
    const input = textarea('fen-draft');
    expect(input.selectionStart).toBe(draft.indexOf('x'));
    expect(input.selectionEnd).toBe(draft.indexOf('x') + 1);
    expect(root.querySelectorAll('#fen-errors li')).toHaveLength(3);
    const errors = root.querySelector('#fen-errors')?.textContent;
    button('Erase').click();
    await fixture.whenStable();
    button('e1, white king').click();
    await fixture.whenStable();
    expect(input.value).toBe(draft);
    expect(root.querySelector('#fen-errors')?.textContent).toBe(errors);
    expect(root.querySelector('#fen-status')?.textContent).toContain('Unapplied changes');
    expect(textarea('applied-fen').value).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w KQkq - 0 1');
    await editDraft(importedFen);
    expect(root.querySelector('#fen-errors')).toBeNull();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('handles an empty draft with an end-of-input error caret', async () => {
    await applyDraft('');
    expect(textarea('fen-draft').value).toBe('');
    expect(textarea('fen-draft').selectionStart).toBe(0);
    expect(textarea('fen-draft').selectionEnd).toBe(0);
    expect(root.querySelector('#fen-errors')?.textContent).toContain('FEN, character 1');
    expect(textarea('applied-fen').value).toBe(startingFen);
  });

  it('keeps a valid unapplied draft during board edits and later replaces the whole position', async () => {
    await editDraft(importedFen);
    button('Erase').click();
    await fixture.whenStable();
    button('e2, white pawn').click();
    await fixture.whenStable();
    expect(textarea('fen-draft').value).toBe(importedFen);
    expect(textarea('applied-fen').value).not.toBe(importedFen);
    button('Apply FEN').click();
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
    expect(button('e2, white pawn')).toBeDefined();
    expect(root.querySelector('#fen-status')?.textContent).toContain('Draft matches');
  });

  it('keeps an explicit draft pending when a board edit happens to produce the same FEN', async () => {
    const editedFen = 'rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    await editDraft(editedFen);
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').click();
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(editedFen);
    expect(root.querySelector('#fen-status')?.textContent).toContain('Unapplied changes');
    button('Erase').click();
    await fixture.whenStable();
    button('e4, white queen').click();
    await fixture.whenStable();
    expect(textarea('fen-draft').value).toBe(editedFen);
  });

  it('discards the draft and its errors only on Use current position, then follows board edits', async () => {
    await applyDraft('invalid draft');
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').click();
    await fixture.whenStable();
    const applied = fixture.componentInstance.position();
    button('Use current position').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(applied);
    expect(textarea('fen-draft').value).toBe(textarea('applied-fen').value);
    expect(root.querySelector('#fen-errors')).toBeNull();
    expect(root.querySelector('#fen-status')?.textContent).toContain('Draft matches');
    button('e5, empty').click();
    await fixture.whenStable();
    expect(textarea('fen-draft').value).toBe(textarea('applied-fen').value);
  });

  it('allows warning-only positions, shows warnings for applied state and recomputes them on edits', async () => {
    await applyDraft('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(root.querySelector('#fen-errors')).toBeNull();
    expect(root.querySelectorAll('.warnings li')).toHaveLength(2);
    expect(root.querySelector('.warnings')?.textContent).toContain('White has 0 kings');
    expect(textarea('applied-fen').value).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
    await editDraft(startingFen);
    expect(root.querySelectorAll('.warnings li')).toHaveLength(2);
    button('Place white king').click();
    await fixture.whenStable();
    button('e1, empty').click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.warnings li')).toHaveLength(1);
    button('Place black king').click();
    await fixture.whenStable();
    button('e8, empty').click();
    await fixture.whenStable();
    expect(root.querySelector('.warnings')).toBeNull();
    expect(textarea('fen-draft').value).toBe(startingFen);
  });

  it('cancels a board drag on valid Apply so a stale drop cannot move the imported piece', async () => {
    await editDraft(importedFen);
    button('e2, white pawn').dispatchEvent(new Event('dragstart', { bubbles: true }));
    button('e4, empty').dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(root.querySelector('.dragging')).not.toBeNull();
    button('Apply FEN').click();
    await fixture.whenStable();
    expect(root.querySelector('.dragging')).toBeNull();
    expect(root.querySelector('.drop-target')).toBeNull();
    button('e4, empty').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
  });

  it('cancels palette dragging and painting on valid Apply', async () => {
    await editDraft(importedFen);
    button('Place white queen').dispatchEvent(new Event('dragstart', { bubbles: true }));
    button('Apply FEN').click();
    await fixture.whenStable();
    button('e4, empty').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').dispatchEvent(new MouseEvent('mousedown', { button: 0, buttons: 1 }));
    await fixture.whenStable();
    await applyDraft(importedFen);
    button('d4, empty').dispatchEvent(new MouseEvent('mouseenter', { buttons: 1 }));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
    expect(button('d4, empty')).toBeDefined();
  });
});

describe('Board orientation input', () => {
  it('reverses rendering without changing logical square identities', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent, ChessBoardComponent] }).compileComponents();
    const app = TestBed.createComponent(AppComponent);
    const fixture = TestBed.createComponent(ChessBoardComponent);
    fixture.componentRef.setInput('board', app.componentInstance.position().board);
    fixture.componentRef.setInput('isBlackView', true);
    await fixture.whenStable();
    const squares = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-square]');
    expect(squares[0].getAttribute('data-square')).toBe('h1');
    expect(squares[63].getAttribute('data-square')).toBe('a8');
  });
});
