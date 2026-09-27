import { expect, test } from '@playwright/test';

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const importedFen = 'r3k2r/8/8/8/8/8/4P3/R3K2R b Kq a3 17 42';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('boots zoneless and serves the board, all pieces and tool assets', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'FEN Editor' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Chessboard', exact: true }).getByRole('button')).toHaveCount(64);
  await expect(page.getByRole('button', { name: /^Place / })).toHaveCount(12);
  await expect(page.getByLabel('FEN draft', { exact: true })).toHaveValue(startingFen);
  await expect(page.getByLabel('FEN draft', { exact: true })).toBeEditable();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(startingFen);
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveAttribute('readonly', '');
  await expect.poll(() => page.locator('img').evaluateAll(images =>
    images.every(image => image.complete && image.naturalWidth > 0),
  )).toBe(true);
  expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false);
  await expect(page.locator('[data-square="a8"]')).not.toHaveClass(/dark/);
});

test('places and erases a piece while updating full FEN and the clean draft', async ({ page }) => {
  await page.getByRole('button', { name: 'Place white queen', exact: true }).click();
  await page.getByRole('button', { name: 'e4, empty', exact: true }).click();
  await expect(page.getByRole('button', { name: 'e4, white queen', exact: true })).toBeVisible();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(
    'rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  );
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await page.getByRole('button', { name: 'e4, white queen', exact: true }).click();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(startingFen);
  await expect(page.getByLabel('FEN draft', { exact: true })).toHaveValue(startingFen);
});

test('keeps the editor within desktop and narrow layouts with errors and warnings', async ({ page }, testInfo) => {
  await page.getByLabel('FEN draft', { exact: true }).fill('8/8/8/8/8/8/8/8 w - - 0 1');
  await page.getByRole('button', { name: 'Apply FEN', exact: true }).click();
  await page.getByLabel('Halfmove clock', { exact: true }).fill('');
  await page.getByLabel('Fullmove number', { exact: true }).fill('1e3');
  await page.getByLabel('FEN draft', { exact: true }).fill('8/8/8/8/8/8/8/8 x KK a4 -1 0');
  await page.getByRole('button', { name: 'Apply FEN', exact: true }).click();
  for (const width of [1100, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('[data-square]').evaluateAll(squares => {
      const sizes = squares.map(square => square.getBoundingClientRect());
      return {
        square: sizes.every(size => Math.abs(size.width - size.height) < 1),
        equal: sizes.every(size => Math.abs(size.height - sizes[0].height) < 1),
        usable: sizes.every(size => size.width >= 24),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry).toEqual({ square: true, equal: true, usable: true, overflow: false });
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true });
  }
});

test('imports all metadata controls, applies edits immediately and retains an unapplied FEN draft', async ({ page }) => {
  const draft = page.getByLabel('FEN draft', { exact: true });
  const applied = page.getByLabel('Applied FEN', { exact: true });
  await draft.fill(importedFen);
  await draft.press('Enter');
  await expect(page.getByLabel('Active color', { exact: true })).toHaveValue('b');
  await expect(page.getByLabel('En passant target', { exact: true })).toHaveValue('a3');
  await expect(page.getByLabel('Halfmove clock', { exact: true })).toHaveValue('17');
  await expect(page.getByLabel('Fullmove number', { exact: true })).toHaveValue('42');
  await expect(page.getByLabel('White kingside (K)', { exact: true })).toBeChecked();
  await expect(page.getByLabel('White queenside (Q)', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Black kingside (k)', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Black queenside (q)', { exact: true })).toBeChecked();
  await page.getByLabel('Active color', { exact: true }).selectOption('w');
  await page.getByLabel('En passant target', { exact: true }).selectOption('h6');
  await page.getByLabel('White kingside (K)', { exact: true }).uncheck();
  await page.getByLabel('White queenside (Q)', { exact: true }).check();
  await page.getByLabel('Black kingside (k)', { exact: true }).check();
  await page.getByLabel('Black queenside (q)', { exact: true }).uncheck();
  await page.getByLabel('Halfmove clock', { exact: true }).fill('0');
  await page.getByLabel('Fullmove number', { exact: true }).fill('0012');
  await expect(applied).toHaveValue('r3k2r/8/8/8/8/8/4P3/R3K2R w Qk h6 0 12');
  await expect(draft).toHaveValue(await applied.inputValue());
  await draft.fill(importedFen);
  await page.getByLabel('En passant target', { exact: true }).selectOption('-');
  await expect(draft).toHaveValue(importedFen);
  await expect(applied).toHaveValue('r3k2r/8/8/8/8/8/4P3/R3K2R w Qk - 0 12');
  await draft.press('Enter');
  await expect(applied).toHaveValue(importedFen);
  await expect(page.getByLabel('Fullmove number', { exact: true })).toHaveValue('42');
});

test('edits numeric drafts with keyboard, preserving invalid text until Escape or position replacement', async ({ page }) => {
  const halfmove = page.getByLabel('Halfmove clock', { exact: true });
  const fullmove = page.getByLabel('Fullmove number', { exact: true });
  const applied = page.getByLabel('Applied FEN', { exact: true });
  await halfmove.fill('00017');
  await expect(applied).toHaveValue(startingFen.replace('0 1', '17 1'));
  await expect(halfmove).toHaveValue('00017');
  await halfmove.press('Enter');
  await expect(halfmove).toHaveValue('17');
  await fullmove.fill('00042');
  await fullmove.press('Tab');
  await expect(fullmove).toHaveValue('42');
  await halfmove.fill('');
  await fullmove.fill('9007199254740992');
  await fullmove.press('Enter');
  await expect(fullmove).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Active color', { exact: true }).selectOption('b');
  await page.getByRole('button', { name: 'Place white queen', exact: true }).click();
  await page.getByRole('button', { name: 'e4, empty', exact: true }).click();
  await expect(halfmove).toHaveValue('');
  await expect(fullmove).toHaveValue('9007199254740992');
  await expect(applied).toHaveValue('rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR b KQkq - 17 42');
  await fullmove.press('Escape');
  await expect(fullmove).toHaveValue('42');
  await expect(fullmove).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('FEN draft', { exact: true }).fill(importedFen);
  await page.getByRole('button', { name: 'Apply FEN', exact: true }).click();
  await expect(halfmove).toHaveValue('17');
  await expect(halfmove).not.toHaveAttribute('aria-invalid', 'true');
  await expect(applied).toHaveValue(importedFen);
});

test('Clear and Starting position discard drafts and restore Move while preserving orientation', async ({ page }) => {
  const draft = page.getByLabel('FEN draft', { exact: true });
  const applied = page.getByLabel('Applied FEN', { exact: true });
  await draft.fill(importedFen);
  await draft.press('Enter');
  await page.getByRole('button', { name: 'Flip board', exact: true }).click();
  for (const [command, expected] of [
    ['Clear', '8/8/8/8/8/8/8/8 w - - 0 1'], ['Starting position', startingFen],
  ]) {
    await draft.fill('bad draft');
    await draft.press('Enter');
    await page.getByLabel('Halfmove clock', { exact: true }).fill('');
    await page.getByLabel('Fullmove number', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Erase', exact: true }).click();
    await page.getByRole('button', { name: command, exact: true }).click();
    await expect(applied).toHaveValue(expected);
    await expect(draft).toHaveValue(expected);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByLabel('Halfmove clock', { exact: true })).toHaveValue('0');
    await expect(page.getByLabel('Fullmove number', { exact: true })).toHaveValue('1');
    await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(0);
    await expect(page.getByLabel('Active color', { exact: true })).toHaveValue('w');
    await expect(page.getByLabel('En passant target', { exact: true })).toHaveValue('-');
    await expect(page.getByRole('button', { name: 'Move', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-square]').first()).toHaveAttribute('data-square', 'h1');
    await expect(page.getByRole('region', { name: 'Applied position warnings' })).toHaveCount(command === 'Clear' ? 1 : 0);
  }
});

test('Flip preserves drafts and logical square identities for placement and dragging', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  const draft = page.getByLabel('FEN draft', { exact: true });
  await draft.fill('unfinished FEN');
  await page.getByLabel('Halfmove clock', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Flip board', exact: true }).click();
  await expect(page.locator('[data-square]').first()).toHaveAttribute('data-square', 'h1');
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(startingFen);
  await expect(draft).toHaveValue('unfinished FEN');
  await expect(page.getByLabel('Halfmove clock', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Place white queen', exact: true }).click();
  await page.getByRole('button', { name: 'd5, empty', exact: true }).click();
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await page.getByRole('group', { name: 'Chessboard', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'e2, white pawn', exact: true }).dragTo(
    page.getByRole('button', { name: 'e4, empty', exact: true }),
  );
  await expect(page.getByRole('button', { name: 'e4, white pawn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'd5, white queen', exact: true })).toBeVisible();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(
    'rnbqkbnr/pppppppp/8/3Q4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
  );
  await expect(draft).toHaveValue('unfinished FEN');
});

test('copies the real applied FEN with a dirty draft before any clipboard-read permission is granted', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-write']);
  await page.getByLabel('Active color', { exact: true }).selectOption('b');
  await page.getByLabel('FEN draft', { exact: true }).fill('unapplied draft');
  await page.getByLabel('Halfmove clock', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Copy applied FEN', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Copy status' })).toHaveText('Applied FEN copied.');
  // Read permission is granted only to verify the completed write, never by the app.
  await context.grantPermissions(['clipboard-read']);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(startingFen.replace(' w ', ' b '));
  await expect(page.getByLabel('FEN draft', { exact: true })).toHaveValue('unapplied draft');
  await expect(page.getByLabel('Halfmove clock', { exact: true })).toHaveValue('');
});

for (const failure of ['denied', 'unavailable']) {
  test(`offers selected applied text when clipboard is ${failure}`, async ({ page }) => {
    await page.evaluate(failure => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: failure === 'unavailable' ? undefined : {
          writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
        },
      });
    }, failure);
    await page.getByLabel('FEN draft', { exact: true }).fill('unapplied draft');
    await page.getByRole('button', { name: 'Copy applied FEN', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Copy status' })).toContainText('Copy failed');
    const applied = page.getByLabel('Applied FEN', { exact: true });
    await expect(applied).toBeFocused();
    expect(await applied.evaluate((input: HTMLTextAreaElement) => input.value.slice(input.selectionStart, input.selectionEnd)))
      .toBe(startingFen);
    await expect(page.getByRole('button', { name: 'Copy applied FEN', exact: true })).toBeEnabled();
  });
}

test('moves a board piece with pointer drag and drop', async ({ page }) => {
  await page.getByRole('button', { name: 'e2, white pawn', exact: true }).dragTo(
    page.getByRole('button', { name: 'e4, empty', exact: true }),
  );
  await expect(page.getByRole('button', { name: 'e2, empty', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'e4, white pawn', exact: true })).toBeVisible();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
  );
});

test('drags a palette piece onto an occupied square', async ({ page }) => {
  await page.getByRole('button', { name: 'Place black knight', exact: true }).dragTo(
    page.getByRole('button', { name: 'a2, white pawn', exact: true }),
  );
  await expect(page.getByRole('button', { name: 'a2, black knight', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('rolls back mouse painting after release outside the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Place white rook', exact: true }).click();
  const a4 = page.locator('[data-square="a4"]');
  const b4 = page.locator('[data-square="b4"]');
  await a4.hover();
  await page.mouse.down();
  await b4.hover();
  await page.getByRole('heading', { name: 'FEN Editor', exact: true }).hover();
  await page.mouse.up();
  await page.locator('[data-square="c4"]').hover();
  await expect(a4).toHaveAccessibleName('a4, empty');
  await expect(b4).toHaveAccessibleName('b4, empty');
  await expect(page.locator('[data-square="c4"]')).toHaveAccessibleName('c4, empty');
});

test('imports on Enter, canonicalizes and preserves metadata through board composition', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const draft = page.getByLabel('FEN draft', { exact: true });
  const applied = page.getByLabel('Applied FEN', { exact: true });
  await draft.fill('  r3k2r/8/8/8/8/8/4P3/R3K2R\nb Kq a3 0017 0042  ');
  await expect(applied).toHaveValue(startingFen);
  await expect(page.locator('#fen-status')).toContainText('Unapplied changes');
  await draft.press('Enter');
  await expect(applied).toHaveValue(importedFen);
  await expect(draft).toHaveValue(importedFen);
  await expect(page.locator('#fen-status')).toContainText('Draft matches');
  // Import leaves focus below the board. Keep both pointer endpoints visible.
  await page.getByRole('group', { name: 'Chessboard', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'e2, white pawn', exact: true }).dragTo(
    page.getByRole('button', { name: 'e4, empty', exact: true }),
  );
  await expect(page.getByRole('button', { name: 'e4, white pawn', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Place black knight', exact: true }).dragTo(
    page.getByRole('button', { name: 'a1, white rook', exact: true }),
  );
  await expect(page.getByRole('button', { name: 'a1, black knight', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Place white queen', exact: true }).click();
  await page.getByRole('button', { name: 'd4, empty', exact: true }).click();
  await expect(applied).toHaveValue('r3k2r/8/8/8/3QP3/8/8/n3K2R b Kq a3 17 42');
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await page.getByRole('button', { name: 'd4, white queen', exact: true }).click();
  await expect(applied).toHaveValue('r3k2r/8/8/8/4P3/8/8/n3K2R b Kq a3 17 42');
  await expect(draft).toHaveValue(await applied.inputValue());
});

test('rejects malformed FEN, selects the first error and retains it across board edits', async ({ page }) => {
  const draft = page.getByLabel('FEN draft', { exact: true });
  const applied = page.getByLabel('Applied FEN', { exact: true });
  const invalid = '  8/8/8/8/8/8/8/8 x - a4 0 0  ';
  await draft.fill(invalid);
  await page.getByRole('button', { name: 'Apply FEN', exact: true }).click();
  await expect(applied).toHaveValue(startingFen);
  await expect(draft).toHaveValue(invalid);
  await expect(draft).toHaveAttribute('aria-invalid', 'true');
  await expect(draft).toBeFocused();
  expect(await draft.evaluate((input: HTMLTextAreaElement) => ({
    start: input.selectionStart, end: input.selectionEnd,
  }))).toEqual({ start: invalid.indexOf('x'), end: invalid.indexOf('x') + 1 });
  await expect(page.getByRole('alert')).toContainText('Active color');
  await expect(page.getByRole('alert').getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await page.getByRole('button', { name: 'a2, white pawn', exact: true }).click();
  await expect(draft).toHaveValue(invalid);
  await expect(page.getByRole('alert').getByRole('listitem')).toHaveCount(3);
  await expect(applied).toHaveValue('rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1');
  await draft.fill('still a draft');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(draft).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Use current position', exact: true }).click();
  await expect(draft).toHaveValue(await applied.inputValue());
  await expect(page.locator('#fen-status')).toContainText('Draft matches');
});

test('preserves a valid unapplied draft until Apply replaces the entire position', async ({ page }) => {
  const draft = page.getByLabel('FEN draft', { exact: true });
  await draft.fill(importedFen);
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await page.getByRole('button', { name: 'e2, white pawn', exact: true }).click();
  await expect(draft).toHaveValue(importedFen);
  await expect(page.getByRole('button', { name: 'e2, empty', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply FEN', exact: true }).click();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(importedFen);
  await expect(page.getByRole('button', { name: 'e2, white pawn', exact: true })).toBeVisible();
  await expect(page.locator('#fen-status')).toContainText('Draft matches');
});

test('accepts warning-only positions and updates warnings from the applied board', async ({ page }) => {
  const draft = page.getByLabel('FEN draft', { exact: true });
  const warnings = page.getByRole('region', { name: 'Applied position warnings' });
  await draft.fill('8/8/8/8/8/8/8/8 w - - 0 1');
  await page.getByRole('button', { name: 'Apply FEN', exact: true }).click();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue('8/8/8/8/8/8/8/8 w - - 0 1');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(warnings.getByRole('listitem')).toHaveCount(2);
  await draft.fill(startingFen);
  await expect(warnings.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Place white king', exact: true }).click();
  await page.getByRole('button', { name: 'e1, empty', exact: true }).click();
  await expect(warnings.getByRole('listitem')).toHaveCount(1);
  await expect(warnings).toContainText('Black has 0 kings');
  await expect(draft).toHaveValue(startingFen);
});
