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

test('moves a board piece with native drag and drop', async ({ page }) => {
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

test('keeps mouse painting and stops it after release outside the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Place white rook', exact: true }).click();
  const a4 = page.locator('[data-square="a4"]');
  const b4 = page.locator('[data-square="b4"]');
  await a4.hover();
  await page.mouse.down();
  await b4.hover();
  await page.getByRole('heading').hover();
  await page.mouse.up();
  await page.locator('[data-square="c4"]').hover();
  await expect(a4).toHaveAccessibleName('a4, white rook');
  await expect(b4).toHaveAccessibleName('b4, white rook');
  await expect(page.locator('[data-square="c4"]')).toHaveAccessibleName('c4, empty');
});

test('imports on Enter, canonicalizes and preserves metadata through board composition', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const draft = page.getByLabel('FEN draft', { exact: true });
  const applied = page.getByLabel('Applied FEN', { exact: true });
  await draft.fill('  r3k2r/8/8/8/8/8/4P3/R3K2R\nb Kq a3 0017 0042  ');
  await expect(applied).toHaveValue(startingFen);
  await expect(page.getByRole('status')).toContainText('Unapplied changes');
  await draft.press('Enter');
  await expect(applied).toHaveValue(importedFen);
  await expect(draft).toHaveValue(importedFen);
  await expect(page.getByRole('status')).toContainText('Draft matches');
  // Import leaves focus below the board. Keep both endpoints visible so dragTo
  // does not scroll the destination into view between mousedown and dragstart.
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
  await expect(page.getByRole('status')).toContainText('Draft matches');
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
  await expect(page.getByRole('status')).toContainText('Draft matches');
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
