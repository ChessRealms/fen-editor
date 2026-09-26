import { expect, test } from '@playwright/test';

const startingPlacement = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('boots zoneless and serves the board, all pieces and tool assets', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'FEN Editor' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Chessboard', exact: true }).getByRole('button')).toHaveCount(64);
  await expect(page.getByRole('button', { name: /^Place / })).toHaveCount(12);
  await expect(page.getByLabel('Piece placement', { exact: true })).toHaveValue(startingPlacement);
  await expect(page.getByLabel('Piece placement', { exact: true })).toHaveAttribute('readonly', '');
  await expect.poll(() => page.locator('img').evaluateAll(images =>
    images.every(image => image.complete && image.naturalWidth > 0),
  )).toBe(true);
  expect(await page.evaluate(() => 'Zone' in globalThis)).toBe(false);
  await expect(page.locator('[data-square="a8"]')).not.toHaveClass(/dark/);
});

test('places and erases a piece while updating placement', async ({ page }) => {
  await page.getByRole('button', { name: 'Place white queen', exact: true }).click();
  await page.getByRole('button', { name: 'e4, empty', exact: true }).click();
  await expect(page.getByRole('button', { name: 'e4, white queen', exact: true })).toBeVisible();
  await expect(page.getByLabel('Piece placement', { exact: true })).toHaveValue(
    'rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR',
  );
  await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await page.getByRole('button', { name: 'e4, white queen', exact: true }).click();
  await expect(page.getByLabel('Piece placement', { exact: true })).toHaveValue(startingPlacement);
});

test('keeps all squares equal on desktop and narrow layouts', async ({ page }) => {
  for (const width of [1100, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('[data-square]').evaluateAll(squares => {
      const sizes = squares.map(square => square.getBoundingClientRect());
      return {
        square: sizes.every(size => Math.abs(size.width - size.height) < 1),
        equal: sizes.every(size => Math.abs(size.height - sizes[0].height) < 1),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry).toEqual({ square: true, equal: true, overflow: false });
  }
});

test('moves a board piece with native drag and drop', async ({ page }) => {
  await page.getByRole('button', { name: 'e2, white pawn', exact: true }).dragTo(
    page.getByRole('button', { name: 'e4, empty', exact: true }),
  );
  await expect(page.getByRole('button', { name: 'e2, empty', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'e4, white pawn', exact: true })).toBeVisible();
  await expect(page.getByLabel('Piece placement', { exact: true })).toHaveValue(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
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
