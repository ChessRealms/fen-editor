import AxeBuilder from '@axe-core/playwright';
import { expect, Locator, Page, test } from '@playwright/test';

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const importedFen = 'r3k2r/8/8/8/8/8/4P3/R3K2R b Kq a3 17 42';
const square = (page: Page, name: string) => page.locator(`[data-square="${name}"]`);
const command = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function tabTo(page: Page, target: Locator, backwards = false): Promise<void> {
  for (let step = 0; step < 40; step++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  await expect(target).toBeFocused();
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('exposes an eight by eight grid with one Tab stop and named native buttons', async ({ page }) => {
  const grid = page.getByRole('grid', { name: 'Chessboard', exact: true });
  await expect(grid.getByRole('row')).toHaveCount(8);
  for (const row of await grid.getByRole('row').all()) await expect(row.getByRole('gridcell')).toHaveCount(8);
  await expect(grid.getByRole('button')).toHaveCount(64);
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
  await expect(grid.getByRole('img')).toHaveCount(0);
  await expect(grid).toHaveAccessibleDescription(/Arrow keys move focus/);
  await tabTo(page, square(page, 'a8'));
  await page.keyboard.press('ArrowRight');
  await expect(square(page, 'b8')).toBeFocused();
  await expect(square(page, 'b8')).toHaveAccessibleName('b8, black knight');
  await page.keyboard.press('Tab');
  await expect(command(page, 'Place white pawn')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(square(page, 'b8')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(command(page, 'Place black king')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(square(page, 'b8')).toBeFocused();
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(startingFen);
});

for (const flipped of [false, true]) {
  test(`arrows and row/board edges follow visual directions, flipped=${flipped}`, async ({ page }) => {
    if (flipped) await command(page, 'Flip board').click();
    await square(page, 'e4').click();
    await page.keyboard.press('ArrowRight');
    await expect(square(page, flipped ? 'd4' : 'f4')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(square(page, flipped ? 'd5' : 'f3')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await expect(square(page, 'e4')).toBeFocused();
    for (const key of ['Home', 'ArrowLeft']) {
      await page.keyboard.press(key);
      await expect(square(page, flipped ? 'h4' : 'a4')).toBeFocused();
    }
    for (const key of ['End', 'ArrowRight']) {
      await page.keyboard.press(key);
      await expect(square(page, flipped ? 'a4' : 'h4')).toBeFocused();
    }
    for (const key of ['Control+Home', 'ArrowLeft', 'ArrowUp']) {
      await page.keyboard.press(key);
      await expect(square(page, flipped ? 'h1' : 'a8')).toBeFocused();
    }
    for (const key of ['Control+End', 'ArrowRight', 'ArrowDown']) {
      await page.keyboard.press(key);
      await expect(square(page, flipped ? 'a8' : 'h1')).toBeFocused();
    }
    await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(startingFen);
  });
}

test('completes import, composition, metadata, commands and copy using only the keyboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const applied = page.getByLabel('Applied FEN', { exact: true });
  const draft = page.getByLabel('FEN draft', { exact: true });
  const status = page.getByRole('status', { name: 'Editor status' });
  await tabTo(page, draft);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(importedFen);
  await page.keyboard.press('Enter');
  await expect(applied).toHaveValue(importedFen);
  await expect(status).toContainText('FEN applied.');
  await tabTo(page, command(page, 'Place white queen'), true);
  await page.keyboard.press('Space');
  await expect(command(page, 'Place white queen')).toHaveAttribute('aria-pressed', 'true');
  await tabTo(page, square(page, 'a8'), true);
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']) {
    await page.keyboard.press(key);
  }
  await expect(square(page, 'e4')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(square(page, 'e4')).toHaveAccessibleName('e4, white queen');
  await expect(status).toContainText('white queen placed on e4.');
  await expect(applied).toHaveValue('r3k2r/8/8/8/4Q3/8/4P3/R3K2R b Kq a3 17 42');
  await tabTo(page, command(page, 'Move'));
  await page.keyboard.press('Enter');
  await tabTo(page, square(page, 'e4'), true);
  await page.keyboard.press('Space');
  await expect(square(page, 'e4')).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText('white queen on e4 selected.');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(square(page, 'e5')).toBeFocused();
  await expect(square(page, 'e5')).toHaveAccessibleName('e5, white queen');
  await expect(square(page, 'e4')).toHaveAccessibleName('e4, empty');
  await expect(status).toContainText('white queen moved from e4 to e5.');
  await page.keyboard.press('Delete');
  await expect(square(page, 'e5')).toHaveAccessibleName('e5, empty');
  await expect(applied).toHaveValue(importedFen);
  await tabTo(page, page.getByLabel('Active color', { exact: true }));
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('En passant target', { exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('White kingside (K)', { exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await tabTo(page, page.getByLabel('Halfmove clock', { exact: true }));
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('00025');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Halfmove clock', { exact: true })).toHaveValue('25');
  await expect(applied).toHaveValue('r3k2r/8/8/8/8/8/4P3/R3K2R w q - 25 42');
  await tabTo(page, command(page, 'Copy applied FEN'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status', { name: 'Copy status' })).toHaveText('Applied FEN copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await applied.inputValue());
  await tabTo(page, command(page, 'Flip board'), true);
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('Black side at the bottom.');
  await tabTo(page, square(page, 'e5'), true);
  await page.keyboard.press('ArrowLeft');
  await expect(square(page, 'f5')).toBeFocused();
  await tabTo(page, command(page, 'Clear'));
  await page.keyboard.press('Space');
  await expect(applied).toHaveValue('8/8/8/8/8/8/8/8 w - - 0 1');
  await expect(status).toContainText('2 position warnings.');
  await page.keyboard.press('Shift+Tab');
  await expect(command(page, 'Starting position')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(applied).toHaveValue(startingFen);
  await expect(status).toContainText('Starting position restored.');
});

test('keeps focus independent of selection, cancels, replaces, and preserves drafts when erasing', async ({ page }) => {
  await square(page, 'e2').click();
  await page.keyboard.press('ArrowUp');
  await expect(square(page, 'e3')).toBeFocused();
  await expect(square(page, 'e2')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(square(page, 'e2')).toHaveAttribute('aria-pressed', 'false');
  await expect(square(page, 'e3')).toBeFocused();
  await expect(page.getByRole('status', { name: 'Editor status' })).toHaveText('Interaction canceled.');
  await page.keyboard.press('Space');
  await expect(page.getByRole('status', { name: 'Editor status' })).toContainText('e3 is empty.');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(square(page, 'e2')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(square(page, 'e1')).toHaveAccessibleName('e1, white pawn');
  await expect(page.getByRole('status', { name: 'Editor status' })).toContainText('Replaced white king.');
  await page.getByLabel('FEN draft', { exact: true }).fill('unfinished draft');
  await page.getByLabel('Halfmove clock', { exact: true }).fill('invalid');
  await square(page, 'e1').click();
  await page.keyboard.press('Backspace');
  await expect(square(page, 'e1')).toBeFocused();
  await expect(square(page, 'e1')).toHaveAccessibleName('e1, empty');
  await expect(square(page, 'e1')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('FEN draft', { exact: true })).toHaveValue('unfinished draft');
  await expect(page.getByLabel('Halfmove clock', { exact: true })).toHaveValue('invalid');
});

test('text editing shortcuts do not edit the board or cancel its source selection', async ({ page }) => {
  await square(page, 'e2').click();
  const draft = page.getByLabel('FEN draft', { exact: true });
  await draft.fill('draft');
  await draft.press('Home');
  await page.keyboard.press('Delete');
  await expect(draft).toHaveValue('raft');
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await expect(draft).toHaveValue('raf');
  await page.keyboard.press('Escape');
  await expect(square(page, 'e2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Applied FEN', { exact: true })).toHaveValue(startingFen);
});

test('passes axe checks at startup and with selection, errors, warnings and flipped narrow layout', async ({ page }, testInfo) => {
  const audit = async (name: string) => {
    const result = await new AxeBuilder({ page }).analyze();
    await testInfo.attach(name, { body: JSON.stringify(result), contentType: 'application/json' });
    expect(result.violations).toEqual([]);
  };
  await audit('initial');
  await square(page, 'e2').click();
  await audit('selected-source');
  await command(page, 'Clear').click();
  await page.getByLabel('FEN draft', { exact: true }).fill('8/8/8/8/8/8/8/8 x KK a4 -1 0');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('FEN draft', { exact: true })).toHaveAccessibleDescription(/FEN was not applied/);
  await page.getByLabel('Fullmove number', { exact: true }).fill('0');
  await expect(page.getByLabel('Fullmove number', { exact: true })).toHaveAccessibleDescription(/Enter a whole number from 1/);
  await command(page, 'Flip board').click();
  await page.setViewportSize({ width: 320, height: 900 });
  await command(page, 'Place black king').focus();
  await page.keyboard.press('Tab');
  await expect(square(page, 'e2')).toBeFocused();
  await audit('errors-warnings-narrow-flipped');
  await page.screenshot({ path: testInfo.outputPath('keyboard-focus-320.png'), fullPage: true });
});
