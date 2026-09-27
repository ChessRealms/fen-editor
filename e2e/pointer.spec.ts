import { devices, expect, Locator, Page, test } from '@playwright/test';

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const square = (page: Page, name: string) => page.locator(`[data-square="${name}"]`);
const applied = (page: Page) => page.getByLabel('Applied FEN', { exact: true });

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Missing pointer target');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function moveTo(page: Page, locator: Locator): Promise<void> {
  const point = await center(locator);
  await page.mouse.move(point.x, point.y, { steps: 8 });
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test.describe('Mouse and pen gestures', () => {
  test.use({ viewport: { width: 1280, height: 1100 } });

  test('captures a pointer, previews a move, commits on release and suppresses its click', async ({ page }) => {
    const source = square(page, 'e2');
    await source.evaluate(element => element.addEventListener('gotpointercapture', event => {
      element.setAttribute('data-pointer-id', String((event as PointerEvent).pointerId));
    }));
    await moveTo(page, source);
    await page.mouse.down();
    await moveTo(page, square(page, 'e4'));
    expect(await source.evaluate(element => element.hasPointerCapture(Number(element.getAttribute('data-pointer-id'))))).toBe(true);
    await expect(source).toHaveClass(/dragging/);
    await expect(square(page, 'e4')).toHaveClass(/drop-target/);
    await expect(square(page, 'e4').locator('img')).toHaveCount(1);
    await expect(applied(page)).toHaveValue(startingFen);
    await page.mouse.up();
    await expect(square(page, 'e2')).toHaveAccessibleName('e2, empty');
    await expect(square(page, 'e4')).toHaveAccessibleName('e4, white pawn');
    await expect(page.locator('.selected, .dragging, .drop-target')).toHaveCount(0);
    expect(await source.evaluate(element => element.hasPointerCapture(Number(element.getAttribute('data-pointer-id'))))).toBe(false);
    await expect(applied(page)).toHaveValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
  });

  test('moves with two clicks, preserves selection through Flip and clears it with commands', async ({ page }) => {
    await square(page, 'e4').click();
    await expect(page.locator('.selected')).toHaveCount(0);
    await square(page, 'e2').click();
    await expect(square(page, 'e2')).toHaveAttribute('aria-pressed', 'true');
    await expect(applied(page)).toHaveValue(startingFen);
    await page.getByRole('button', { name: 'Flip board', exact: true }).click();
    await expect(square(page, 'e2')).toHaveAttribute('aria-pressed', 'true');
    await square(page, 'e7').click();
    await expect(square(page, 'e7')).toHaveAccessibleName('e7, white pawn');
    await expect(square(page, 'e2')).toHaveAccessibleName('e2, empty');
    await expect(page.locator('.selected')).toHaveCount(0);
    await square(page, 'e7').click();
    await square(page, 'e7').click();
    await expect(page.locator('.selected')).toHaveCount(0);
    for (const command of ['Apply FEN', 'Starting position', 'Clear']) {
      await square(page, 'e1').click();
      await page.getByRole('button', { name: command, exact: true }).click();
      await expect(page.locator('.selected')).toHaveCount(0);
    }
  });

  test('stages painting and erasing until release, retaining metadata and dirty drafts', async ({ page }) => {
    await page.getByLabel('Active color', { exact: true }).selectOption('b');
    await page.getByLabel('Halfmove clock', { exact: true }).fill('23');
    await page.getByLabel('FEN draft', { exact: true }).fill('unfinished FEN');
    await page.getByRole('button', { name: 'Place white queen', exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await moveTo(page, square(page, 'a4'));
    await page.mouse.down();
    await moveTo(page, square(page, 'c4'));
    await expect(page.locator('.preview')).toHaveCount(3);
    await expect(applied(page)).toHaveValue(startingFen.replace(' w ', ' b ').replace('0 1', '23 1'));
    await page.mouse.up();
    await expect(applied(page)).toHaveValue('rnbqkbnr/pppppppp/8/8/QQQ5/8/PPPPPPPP/RNBQKBNR b KQkq - 23 1');
    await expect(page.getByLabel('FEN draft', { exact: true })).toHaveValue('unfinished FEN');
    await page.getByRole('button', { name: 'Erase', exact: true }).click();
    await moveTo(page, square(page, 'a4'));
    await page.mouse.down();
    await moveTo(page, square(page, 'c4'));
    await expect(square(page, 'b4').locator('img')).toHaveCount(0);
    await expect(square(page, 'b4')).toHaveAccessibleName('b4, white queen');
    await page.mouse.up();
    await expect(applied(page)).toHaveValue(startingFen.replace(' w ', ' b ').replace('0 1', '23 1'));
  });

  for (const kind of ['move', 'paint', 'palette'] as const) {
    for (const reason of ['outside', 'Escape', 'lost capture', 'pointercancel'] as const) {
      test(`cancels ${kind} on ${reason} without changing position or tool`, async ({ page }) => {
        if (kind === 'paint') await page.getByRole('button', { name: 'Erase', exact: true }).click();
        const source = kind === 'palette' ? page.getByRole('button', { name: 'Place black knight', exact: true }) : square(page, 'e2');
        await source.evaluate(element => element.addEventListener('gotpointercapture', event => {
          element.setAttribute('data-pointer-id', String((event as PointerEvent).pointerId));
        }));
        await moveTo(page, source);
        await page.mouse.down();
        await moveTo(page, square(page, 'e4'));
        if (reason === 'outside') await page.mouse.move(10, 10);
        else if (reason === 'Escape') await page.keyboard.press('Escape');
        else if (reason === 'lost capture') {
          await source.evaluate(element => element.releasePointerCapture(Number(element.getAttribute('data-pointer-id'))));
          await page.mouse.move(11, 11);
        } else {
          const pointerId = Number(await source.getAttribute('data-pointer-id'));
          await source.dispatchEvent('pointercancel', { pointerId, pointerType: 'mouse' });
        }
        await page.mouse.up();
        await expect(applied(page)).toHaveValue(startingFen);
        await expect(page.locator('.selected, .preview, .dragging, .drop-target')).toHaveCount(0);
        await expect(page.getByRole('button', { name: kind === 'paint' ? 'Erase' : 'Move', exact: true })).toHaveAttribute('aria-pressed', 'true');
      });
    }
  }

  test('supports pen input through the same pointer capture path', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    const from = await center(square(page, 'e2'));
    const to = await center(square(page, 'e4'));
    await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...from, button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen' });
    await session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...to, button: 'left', buttons: 1, pointerType: 'pen' });
    await expect(applied(page)).toHaveValue(startingFen);
    await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...to, button: 'left', buttons: 0, clickCount: 1, pointerType: 'pen' });
    await expect(square(page, 'e4')).toHaveAccessibleName('e4, white pawn');
    await expect(page.locator('.selected')).toHaveCount(0);
  });
});

test.describe('Touch in Chromium Android emulation', () => {
  const device = devices['Pixel 7'];
  test.use({ viewport: device.viewport, deviceScaleFactor: device.deviceScaleFactor,
    userAgent: device.userAgent, isMobile: true, hasTouch: true });

  test('taps to place, move and erase with no duplicate click, retaining selection after rotation', async ({ page }) => {
    await page.getByRole('button', { name: 'Place black queen', exact: true }).tap();
    await square(page, 'e4').tap();
    await expect(square(page, 'e4')).toHaveAccessibleName('e4, black queen');
    await page.getByRole('button', { name: 'Move', exact: true }).tap();
    await square(page, 'e4').tap();
    await expect(square(page, 'e4')).toHaveAttribute('aria-pressed', 'true');
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(square(page, 'e4')).toHaveAttribute('aria-pressed', 'true');
    await square(page, 'f4').tap();
    await expect(square(page, 'f4')).toHaveAccessibleName('f4, black queen');
    await page.getByRole('button', { name: 'Erase', exact: true }).tap();
    await square(page, 'f4').tap();
    await expect(applied(page)).toHaveValue(startingFen);
  });

  test('drags and cancels real touch streams, then paints without scrolling the board', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    const from = await center(square(page, 'e2'));
    const to = await center(square(page, 'e4'));
    const scrollBefore = await page.evaluate(() => scrollY);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', point?: { x: number; y: number }) => {
      await session.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
    };
    await touch('touchStart', from);
    await touch('touchMove', to);
    await expect(square(page, 'e4')).toHaveClass(/drop-target/);
    await expect(applied(page)).toHaveValue(startingFen);
    await touch('touchCancel');
    await expect(applied(page)).toHaveValue(startingFen);
    await expect(page.locator('.dragging, .drop-target')).toHaveCount(0);
    await touch('touchStart', from);
    await touch('touchMove', to);
    await touch('touchEnd');
    await expect(square(page, 'e4')).toHaveAccessibleName('e4, white pawn');
    await expect(page.locator('.selected')).toHaveCount(0);
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    await page.getByRole('button', { name: 'Place black rook', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Place black rook', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await touch('touchStart', await center(square(page, 'a4')));
    await touch('touchMove', await center(square(page, 'b4')));
    await expect(square(page, 'a4')).toHaveAccessibleName('a4, empty');
    await touch('touchEnd');
    await expect(square(page, 'a4')).toHaveAccessibleName('a4, black rook');
    await expect(square(page, 'b4')).toHaveAccessibleName('b4, black rook');
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  });

  test('preserves native page scrolling from the palette and outside the board', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    for (const surface of ['palette', 'page margin']) {
      await page.evaluate(() => scrollTo(0, 0));
      const point = surface === 'palette'
        ? await center(page.getByRole('button', { name: 'Place black queen', exact: true }))
        : { x: 5, y: 500 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
      for (let step = 1; step <= 6; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x: point.x, y: point.y - step * 20, id: 1 }],
        });
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(30);
      await expect(applied(page)).toHaveValue(startingFen);
      await expect(page.getByRole('button', { name: 'Move', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    expect(await page.locator('.board').evaluate(element => getComputedStyle(element).touchAction)).toBe('pinch-zoom');
    expect(await page.locator('body').evaluate(element => getComputedStyle(element).touchAction)).toBe('auto');
  });
});

test('keeps targets usable at narrow sizes and 200% CSS zoom', async ({ page }, testInfo) => {
  for (const [width, zoom] of [[320, 1], [375, 1], [768, 1], [1280, 2]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom); }, zoom);
    const geometry = await page.evaluate(zoom => {
      const cells = [...document.querySelectorAll('[data-square]')].map(element => element.getBoundingClientRect());
      const controls = [...document.querySelectorAll('.piece-tool, .tools button, .fen-actions button')].map(element => element.getBoundingClientRect());
      return {
        noOverflow: document.documentElement.scrollWidth <= innerWidth,
        squareCells: cells.every(cell => Math.abs(cell.width - cell.height) < 1),
        usableCells: cells.every(cell => cell.width / zoom >= 24),
        usableControls: controls.every(control => control.width / zoom >= 44 && control.height / zoom >= 44),
      };
    }, zoom);
    expect(geometry).toEqual({ noOverflow: true, squareCells: true, usableCells: true, usableControls: true });
    await page.screenshot({ path: testInfo.outputPath(`pointer-layout-${width}-${zoom}x.png`), fullPage: true });
  }
});
