import { expect, test, type Page } from '@playwright/test';

/** Painting is heavy under a software GPU, so these run after the line-drawing
 * tests (see playwright.config.ts) and cannot slow them down. */
async function chooseView(page: Page, label: string) {
  await page.getByText('View', { exact: true }).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}

async function downloadPng(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  return new Uint8Array(await Bun.file((await download.path())!).arrayBuffer());
}

test('paints the fish with p5.brush, follows the colour panel, and exports PNG', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const painting = page.locator('.painting');
  await expect(page.getByRole('img', { name: 'Watercolour painting of a procedural fish named Biggus fishus' })).toBeVisible();
  await expect(painting).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });

  await page.getByText('Export', { exact: true }).click();
  const first = await downloadPng(page);
  expect([...first.slice(1, 4)].map(c => String.fromCharCode(c)).join('')).toBe('PNG');
  // A painted sheet is far from blank: measure how many pixels differ from the paper.
  const inked = await page.evaluate(async bytes => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let marked = 0;
    for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - 255) + Math.abs(data[i + 1] - 250) + Math.abs(data[i + 2] - 240) > 40) marked++;
    return { width: bitmap.width, fraction: marked / (data.length / 4) };
  }, [...first]);
  expect(inked.width).toBe(1040);
  expect(inked.fraction).toBeGreaterThan(0.05);

  // Repainting the same genes gives the same picture; a new palette changes it.
  await page.getByRole('button', { name: 'Reset colour', exact: true }).click();
  await page.waitForTimeout(500);
  await expect(painting).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
  expect(await downloadPng(page)).toEqual(first);
  await page.getByText('Family', { exact: true }).click();
  const family = page.getByRole('option', { name: 'Rose & violet · deep reef', exact: true });
  if (await family.getAttribute('aria-selected') === 'true') await page.getByRole('option', { name: 'Sand & umber · bottom', exact: true }).click();
  else await family.click();
  // Never read the canvas mid-paint: only download once the repaint has settled.
  await expect.poll(async () => {
    if (await painting.getAttribute('aria-busy') !== 'false') return false;
    return JSON.stringify([...await downloadPng(page)]) !== JSON.stringify([...first]);
  }, { timeout: 60_000, intervals: [1000] }).toBe(true);

  await chooseView(page, 'Line drawing');
  await expect(page.getByRole('img', { name: /Procedural fish drawing/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('engraved colour previews and exports one pen per pigment', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=engraved');
  const drawing = page.getByRole('img', { name: 'Procedural fish drawing named Biggus fishus, engraved in colour' });
  await expect(drawing).toBeVisible();
  const pens = (svg: string) => new Set([...svg.matchAll(/stroke="(#[0-9a-f]{6})"/g)].map(m => m[1]));
  const preview = decodeURIComponent((await drawing.getAttribute('src'))!.split(',')[1]);
  expect(pens(preview).size).toBeGreaterThan(3);
  await page.getByText('Export', { exact: true }).click();
  await page.getByText('Format', { exact: true }).click();
  await page.getByRole('option', { name: /^svg$/i }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const svg = await Bun.file((await (await pending).path())!).text();
  expect(svg).toBe(preview);
  expect(errors).toEqual([]);
});

