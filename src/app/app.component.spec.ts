import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from './app.component';
import { ClipboardService } from './clipboard.service';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { squareToIndex } from './domain/fen';

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const importedFen = 'r3k2r/8/8/8/8/8/4P3/R3K2R b Kq a3 17 42';

describe('FEN editor', () => {
  let fixture: ComponentFixture<AppComponent>;
  let root: HTMLElement;
  let hitTarget: Element | null;

  // jsdom has no layout or pointer capture. Browser tests verify both natively.
  function pointer(type: string, target: EventTarget, init: PointerEventInit = {}): void {
    hitTarget = target instanceof Element ? target : null;
    const square = hitTarget?.getAttribute('data-square');
    const index = square ? squareToIndex(square as Parameters<typeof squareToIndex>[0]) : -1;
    target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true,
      button: 0, buttons: type === 'pointerup' ? 0 : 1,
      clientX: index * 10, clientY: 10, ...init,
    }));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    hitTarget = null;
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => hitTarget });
    for (const element of root.querySelectorAll('button')) {
      let captured: number | null = null;
      element.setPointerCapture = id => { captured = id; };
      element.hasPointerCapture = id => captured === id;
      element.releasePointerCapture = () => { captured = null; };
    }
  });

  afterEach(() => { vi.restoreAllMocks(); });

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

  function field(id: string): HTMLInputElement | HTMLSelectElement {
    const element = root.querySelector<HTMLInputElement | HTMLSelectElement>('#' + id);
    if (!element) throw new Error('Field missing: ' + id);
    return element;
  }

  async function editField(id: string, value: string): Promise<void> {
    const input = field(id);
    input.value = value;
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
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
    pointer('pointerdown', source);
    pointer('pointerup', source);
    await fixture.whenStable();
    expect(button('e2, white pawn')).toBeDefined();
    pointer('pointerdown', source);
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    expect(button('e2, empty')).toBeDefined();
    expect(button('e4, white pawn')).toBeDefined();
  });

  it('does not move a piece when the drag ends without a drop', async () => {
    const original = fixture.componentInstance.position();
    pointer('pointerdown', button('e2, white pawn'));
    pointer('pointercancel', button('e2, white pawn'));
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(original);
    expect(root.querySelector('.dragging')).toBeNull();
  });

  it('rolls back painting after a pointer release outside the board', async () => {
    button('Place black bishop').click();
    await fixture.whenStable();
    pointer('pointerdown', button('a4, empty'));
    pointer('pointerup', document);
    pointer('pointermove', button('b4, empty'));
    await fixture.whenStable();
    expect(button('a4, empty')).toBeDefined();
    expect(button('b4, empty')).toBeDefined();
  });

  it('selects an occupied source and moves with two activations, including replacement and self-cancel', async () => {
    const original = fixture.componentInstance.position();
    button('e4, empty').click();
    await fixture.whenStable();
    expect(root.querySelector('.selected')).toBeNull();
    button('e2, white pawn').click();
    await fixture.whenStable();
    expect(button('e2, white pawn').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.position()).toBe(original);
    button('e2, white pawn').click();
    await fixture.whenStable();
    expect(root.querySelector('.selected')).toBeNull();
    expect(fixture.componentInstance.position()).toBe(original);
    button('e2, white pawn').click();
    button('e7, black pawn').click();
    await fixture.whenStable();
    expect(button('e2, empty')).toBeDefined();
    expect(button('e7, white pawn')).toBeDefined();
    expect(root.querySelector('.selected')).toBeNull();
  });

  it.each(['Apply FEN', 'Starting position', 'Clear', 'Erase'])('preserves logical selection on Flip and clears it on %s', async command => {
    button('e2, white pawn').click();
    button('Flip board').click();
    await fixture.whenStable();
    expect(button('e2, white pawn').getAttribute('aria-pressed')).toBe('true');
    button(command).click();
    await fixture.whenStable();
    expect(root.querySelector('.selected')).toBeNull();
  });

  it('commits a whole stroke once, preserves metadata/drafts and ignores the trailing pointer click', async () => {
    await applyDraft(importedFen);
    await applyDraft('invalid draft');
    await editField('halfmoveClock', '');
    const original = fixture.componentInstance.position();
    const errors = root.querySelector('#fen-errors')?.textContent;
    button('Place white queen').click();
    await fixture.whenStable();
    const changes = vi.spyOn(fixture.componentInstance.position, 'update');
    pointer('pointerdown', button('a4, empty'));
    pointer('pointermove', button('b4, empty'));
    await fixture.whenStable();
    expect(root.querySelectorAll('.preview')).toHaveLength(2);
    expect(fixture.componentInstance.position()).toBe(original);
    expect(textarea('applied-fen').value).toBe(importedFen);
    expect(changes).not.toHaveBeenCalled();
    pointer('pointerup', button('b4, empty'));
    await fixture.whenStable();
    button('a4, white queen').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await fixture.whenStable();
    expect(changes).toHaveBeenCalledTimes(1);
    expect(textarea('applied-fen').value).toBe('r3k2r/8/8/8/QQ6/8/4P3/R3K2R b Kq a3 17 42');
    expect(textarea('fen-draft').value).toBe('invalid draft');
    expect(field('halfmoveClock').value).toBe('');
    expect(root.querySelector('#fen-errors')?.textContent).toBe(errors);
    expect(root.querySelector('.preview')).toBeNull();
  });

  it.each(['pointercancel', 'lostpointercapture', 'Escape', 'blur', 'resize', 'tool change'])('rolls back a stroke on %s and ignores stale release/click', async reason => {
    button('Erase').click();
    await fixture.whenStable();
    const original = fixture.componentInstance.position();
    pointer('pointerdown', button('a2, white pawn'));
    pointer('pointermove', button('b2, white pawn'));
    await fixture.whenStable();
    expect(root.querySelectorAll('.preview')).toHaveLength(2);
    if (reason === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    else if (reason === 'blur' || reason === 'resize') window.dispatchEvent(new Event(reason));
    else if (reason === 'tool change') button('Move').click();
    else pointer(reason, button('a2, white pawn'));
    pointer('pointerup', button('b2, white pawn'));
    button('a2, white pawn').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(original);
    expect(root.querySelector('.preview')).toBeNull();
  });

  it('ignores right buttons, secondary pointers and events from another pointer during a stroke', async () => {
    button('Erase').click();
    await fixture.whenStable();
    const original = fixture.componentInstance.position();
    pointer('pointerdown', button('a2, white pawn'), { button: 2 });
    pointer('pointerup', button('a2, white pawn'));
    pointer('pointerdown', button('a2, white pawn'), { isPrimary: false });
    pointer('pointerup', button('a2, white pawn'));
    expect(fixture.componentInstance.position()).toBe(original);
    pointer('pointerdown', button('a2, white pawn'));
    pointer('pointermove', button('b2, white pawn'), { pointerId: 2, isPrimary: false });
    pointer('pointercancel', button('b2, white pawn'), { pointerId: 2 });
    pointer('pointerup', button('b2, white pawn'), { pointerId: 2 });
    pointer('pointerup', button('a2, white pawn'));
    await fixture.whenStable();
    expect(button('a2, empty')).toBeDefined();
    expect(button('b2, white pawn')).toBeDefined();
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
    pointer('pointerdown', button('e2, white pawn'));
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    button('Place black bishop').click();
    await fixture.whenStable();
    pointer('pointerdown', button('a4, empty'));
    pointer('pointermove', button('b4, empty'));
    pointer('pointerup', button('b4, empty'));
    await fixture.whenStable();
    pointer('pointerdown', button('Place black knight'));
    pointer('pointerup', button('a1, white rook'));
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
    pointer('pointerdown', button('e2, white pawn'));
    pointer('pointermove', button('e4, empty'));
    await fixture.whenStable();
    expect(root.querySelector('.dragging')).not.toBeNull();
    button('Apply FEN').click();
    await fixture.whenStable();
    expect(root.querySelector('.dragging')).toBeNull();
    expect(root.querySelector('.drop-target')).toBeNull();
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
  });

  it('cancels palette dragging and painting on valid Apply', async () => {
    await editDraft(importedFen);
    pointer('pointerdown', button('Place white queen'));
    button('Apply FEN').click();
    await fixture.whenStable();
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
    button('Place white queen').click();
    await fixture.whenStable();
    pointer('pointerdown', button('e4, empty'));
    await fixture.whenStable();
    await applyDraft(importedFen);
    pointer('pointermove', button('d4, empty'));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
    expect(button('d4, empty')).toBeDefined();
  });

  it('synchronizes imported metadata controls and edits each field without changing pieces', async () => {
    await applyDraft(importedFen);
    const original = fixture.componentInstance.position();
    expect(field('active-color').value).toBe('b');
    expect(field('en-passant').value).toBe('a3');
    expect(field('halfmoveClock').value).toBe('17');
    expect(field('fullmoveNumber').value).toBe('42');
    const rights = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(rights.map(input => input.checked)).toEqual([true, false, false, true]);
    for (const right of rights) {
      right.click();
      await fixture.whenStable();
    }
    await editField('active-color', 'w');
    await editField('en-passant', 'h6');
    await editField('halfmoveClock', '0');
    await editField('fullmoveNumber', '9007199254740991');
    expect(textarea('applied-fen').value).toBe('r3k2r/8/8/8/8/8/4P3/R3K2R w Qk h6 0 9007199254740991');
    expect(textarea('fen-draft').value).toBe(textarea('applied-fen').value);
    expect(fixture.componentInstance.position().board).toEqual(original.board);
    expect(original.activeColor).toBe('b');
    expect(original.castling.whiteKingside).toBe(true);
    expect(root.querySelector('.warnings')).not.toBeNull();
    await editField('en-passant', '-');
    expect(fixture.componentInstance.position().enPassant).toBeNull();
    for (const right of rights.filter(input => input.checked)) {
      right.click();
      await fixture.whenStable();
    }
    expect(textarea('applied-fen').value).toContain(' w - - 0 9007199254740991');
  });

  it('retains FEN drafts and syntax errors across metadata edits until Apply replaces all fields', async () => {
    await applyDraft('invalid FEN draft');
    const errors = root.querySelector('#fen-errors')?.textContent;
    await editField('active-color', 'b');
    await editField('halfmoveClock', '25');
    expect(textarea('fen-draft').value).toBe('invalid FEN draft');
    expect(root.querySelector('#fen-errors')?.textContent).toBe(errors);
    await editDraft(importedFen);
    await editField('en-passant', 'h6');
    expect(textarea('fen-draft').value).toBe(importedFen);
    await editField('halfmoveClock', '');
    await editField('fullmoveNumber', 'invalid');
    button('Apply FEN').click();
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(importedFen);
    expect(field('halfmoveClock').value).toBe('17');
    expect(field('fullmoveNumber').value).toBe('42');
    expect(root.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(0);
    expect(field('en-passant').value).toBe('a3');
  });

  it.each([
    ['halfmoveClock', ''], ['halfmoveClock', '-1'], ['halfmoveClock', '1.5'],
    ['halfmoveClock', '1e3'], ['halfmoveClock', '+2'], ['halfmoveClock', ' 2'],
    ['halfmoveClock', 'text'], ['halfmoveClock', '9007199254740992'],
    ['fullmoveNumber', ''], ['fullmoveNumber', '0'], ['fullmoveNumber', '-1'],
    ['fullmoveNumber', '9007199254740992'],
  ])('keeps invalid numeric draft local: %s = "%s"', async (id, value) => {
    const original = fixture.componentInstance.position();
    await editField(id, value);
    expect(fixture.componentInstance.position()).toBe(original);
    expect(field(id).value).toBe(value);
    expect(field(id).getAttribute('aria-invalid')).toBe('true');
    expect(field(id).getAttribute('aria-describedby')).toContain(id + '-error');
    expect(root.querySelector('#' + id + '-error')?.textContent).toContain('whole number');
    field(id).dispatchEvent(new Event('blur'));
    field(id).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(field(id).value).toBe(value);
    expect(textarea('applied-fen').value).toBe(startingFen);
    field(id).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(field(id).value).toBe(id === 'halfmoveClock' ? '0' : '1');
    expect(field(id).hasAttribute('aria-invalid')).toBe(false);
  });

  it.each(['halfmoveClock', 'fullmoveNumber'])('commits %s immediately and canonicalizes only on blur/Enter', async id => {
    await editField(id, '00012');
    expect(field(id).value).toBe('00012');
    expect(textarea('applied-fen').value).toBe(startingFen.replace('0 1', id === 'halfmoveClock' ? '12 1' : '0 12'));
    field(id).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(field(id).value).toBe('12');
    await editField(id, '00025');
    field(id).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(field(id).value).toBe('25');
    await editField(id, '9007199254740991');
    expect(field(id).hasAttribute('aria-invalid')).toBe(false);
    expect(textarea('applied-fen').value).toContain('9007199254740991');
    await editField(id, '');
    field(id).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(field(id).value).toBe('9007199254740991');
  });

  it('preserves numeric drafts across unrelated edits, failed Apply, Use current position and Flip', async () => {
    await editField('halfmoveClock', '');
    await editField('fullmoveNumber', '00042');
    await editField('active-color', 'b');
    button('Place white queen').click();
    await fixture.whenStable();
    button('e4, empty').click();
    await fixture.whenStable();
    await applyDraft('bad draft');
    button('Use current position').click();
    button('Flip board').click();
    await fixture.whenStable();
    expect(field('halfmoveClock').value).toBe('');
    expect(field('halfmoveClock').getAttribute('aria-invalid')).toBe('true');
    expect(field('fullmoveNumber').value).toBe('00042');
    expect(textarea('applied-fen').value).toContain(' b KQkq - 0 42');
  });

  it.each([
    ['Clear', '8/8/8/8/8/8/8/8 w - - 0 1'],
    ['Starting position', startingFen],
  ])('%s replaces all state, cancels gestures, restores Move and preserves orientation', async (command, expected) => {
    await applyDraft(importedFen);
    button('Flip board').click();
    await applyDraft('bad draft');
    await editField('halfmoveClock', '');
    await editField('fullmoveNumber', 'bad');
    pointer('pointerdown', button('e2, white pawn'));
    pointer('pointermove', button('e4, empty'));
    button(command).click();
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(expected);
    expect(textarea('fen-draft').value).toBe(expected);
    expect(root.querySelector('#fen-errors')).toBeNull();
    expect(root.querySelector('.dragging')).toBeNull();
    expect(root.querySelector('.drop-target')).toBeNull();
    expect(root.querySelector('[data-square]')?.getAttribute('data-square')).toBe('h1');
    expect(field('halfmoveClock').value).toBe('0');
    expect(field('fullmoveNumber').value).toBe('1');
    expect(root.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(0);
    expect(root.querySelectorAll('.warnings li')).toHaveLength(command === 'Clear' ? 2 : 0);
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(expected);
    button('Place white queen').click();
    await fixture.whenStable();
    pointer('pointerdown', button('e4, empty'));
    pointer('pointerdown', button('Place white queen'));
    button(command).click();
    await fixture.whenStable();
    expect(button('Move').getAttribute('aria-pressed')).toBe('true');
    pointer('pointerup', button('e4, empty'));
    button('Place white queen').click();
    await fixture.whenStable();
    pointer('pointermove', button('d4, empty'));
    await fixture.whenStable();
    expect(textarea('applied-fen').value).toBe(expected);
  });

  it('flips display only and cancels board/palette dragging and further painting', async () => {
    await applyDraft('bad FEN');
    await editField('halfmoveClock', '');
    const original = fixture.componentInstance.position();
    const errors = root.querySelector('#fen-errors')?.textContent;
    pointer('pointerdown', button('e2, white pawn'));
    pointer('pointermove', button('e4, empty'));
    button('Flip board').click();
    await fixture.whenStable();
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(original);
    expect(textarea('fen-draft').value).toBe('bad FEN');
    expect(root.querySelector('#fen-errors')?.textContent).toBe(errors);
    expect(field('halfmoveClock').value).toBe('');
    expect(root.querySelector('.dragging')).toBeNull();
    expect(root.querySelector('.drop-target')).toBeNull();
    expect(root.querySelector('[data-square]')?.getAttribute('data-square')).toBe('h1');
    pointer('pointerdown', button('Place white queen'));
    button('Flip board').click();
    await fixture.whenStable();
    pointer('pointerup', button('e4, empty'));
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(original);
    button('Place white queen').click();
    await fixture.whenStable();
    pointer('pointerdown', button('e4, empty'));
    await fixture.whenStable();
    const painted = fixture.componentInstance.position();
    button('Flip board').click();
    await fixture.whenStable();
    pointer('pointermove', button('d4, empty'));
    await fixture.whenStable();
    expect(fixture.componentInstance.position()).toBe(painted);
    expect(button('Place white queen').getAttribute('aria-pressed')).toBe('true');
  });

  it('copies the canonical applied FEN and announces success only after the write resolves', async () => {
    let complete!: () => void;
    const write = new Promise<void>(resolve => { complete = resolve; });
    const copy = vi.spyOn(TestBed.inject(ClipboardService), 'writeText').mockReturnValue(write);
    await editDraft(importedFen);
    await editField('halfmoveClock', '');
    button('Copy applied FEN').click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledExactlyOnceWith(startingFen);
    expect(root.querySelector('#copy-status')?.textContent).toBe('');
    expect(button('Copy applied FEN').disabled).toBe(true);
    complete();
    await write;
    await fixture.whenStable();
    expect(root.querySelector('#copy-status')?.textContent).toContain('Applied FEN copied.');
    expect(button('Copy applied FEN').disabled).toBe(false);
    expect(textarea('fen-draft').value).toBe(importedFen);
    expect(field('halfmoveClock').value).toBe('');
  });

  it('selects applied FEN for manual copying when a write fails and permits retry', async () => {
    const copy = vi.spyOn(TestBed.inject(ClipboardService), 'writeText').mockRejectedValue(new Error('Denied'));
    button('Copy applied FEN').click();
    await fixture.whenStable();
    expect(root.querySelector('#copy-status')?.textContent).toContain('Copy failed');
    expect(textarea('applied-fen').selectionStart).toBe(0);
    expect(textarea('applied-fen').selectionEnd).toBe(startingFen.length);
    expect(button('Copy applied FEN').disabled).toBe(false);
    copy.mockResolvedValue();
    button('Copy applied FEN').click();
    await fixture.whenStable();
    expect(root.querySelector('#copy-status')?.textContent).toContain('Applied FEN copied.');
  });

  it.each(['resolve', 'reject'] as const)('does not report stale clipboard %s results as belonging to a changed position', async outcome => {
    let complete!: () => void;
    let fail!: (error: Error) => void;
    const write = new Promise<void>((resolve, reject) => { complete = resolve; fail = reject; });
    vi.spyOn(TestBed.inject(ClipboardService), 'writeText').mockReturnValue(write);
    button('Copy applied FEN').click();
    await fixture.whenStable();
    await editField('active-color', 'b');
    if (outcome === 'resolve') complete();
    else fail(new Error('Denied'));
    await write.catch(() => undefined);
    await fixture.whenStable();
    expect(root.querySelector('#copy-status')?.textContent).toBe('');
    expect(button('Copy applied FEN').disabled).toBe(false);
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
