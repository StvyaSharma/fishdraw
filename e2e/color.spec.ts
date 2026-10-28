import { generate_scene } from '../fishdraw.ts';
import { contains, distanceToPath } from '../color/anatomy.ts';
import { expect, test } from '@playwright/test';

test('native DialKit colors, regional controls, watercolor clipping, and export', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const fish = page.getByRole('img', { name: /Procedural fish/ });
  await expect(fish).toHaveAttribute('data-medium', 'ink');
  await page.getByRole('button', { name: 'Coloring', exact: true }).click();
  await page.getByRole('button', { name: /^Medium / }).click();
  await page.getByRole('option', { name: 'Vector color', exact: true }).click();
  const enabled = page.getByRole('radiogroup', { name: 'Enabled', exact: true });
  await enabled.getByRole('radio', { name: 'On', exact: true }).click();
  await expect(fish).toHaveAttribute('data-medium', 'vector');
  const vector = await fish.getAttribute('src');
  expect(decodeURIComponent(vector!.split(',')[1])).toContain('data-pigment="melanin"');
  await page.getByRole('button', { name: /^Palette / }).click();
  await page.getByRole('option', { name: 'Reef · blue and yellow', exact: true }).click();
  await expect(fish).not.toHaveAttribute('src', vector!);
  const coloring = page.getByRole('button', { name: 'Coloring', exact: true }).locator('xpath=../..');
  await coloring.getByRole('button', { name: 'Regions', exact: true }).click();
  const head = coloring.getByRole('button', { name: 'Head', exact: true });
  await head.click();
  const beforeRegionalChange = await fish.getAttribute('src');
  await head.locator('xpath=../..').getByRole('button', { name: /^Palette / }).click();
  await page.getByRole('option', { name: 'Golden · warm pigments', exact: true }).click();
  await expect(fish).not.toHaveAttribute('src', beforeRegionalChange!);
  await coloring.getByRole('button', { name: 'Regions', exact: true }).click();
  await page.getByRole('button', { name: 'Pattern', exact: true }).click();
  await page.getByRole('button', { name: /^Solver / }).click();
  await page.getByRole('option', { name: 'Turing · Schnakenberg', exact: true }).click();
  await expect(fish).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: 'Pattern', exact: true }).click();
  await page.getByRole('button', { name: /^Medium / }).click();
  await page.getByRole('option', { name: 'p5.brush watercolor', exact: true }).click();
  await expect(fish).toHaveAttribute('data-medium', 'watercolor', { timeout: 60_000 });
  await expect(fish).toHaveAttribute('aria-busy', 'false');
  expect(await fish.getAttribute('src')).toMatch(/^data:image\/png/);
  // Outside every anatomical mask, only the original paper is allowed.
  const pixel = await fish.evaluate((img: HTMLImageElement) => {
    const c = document.createElement('canvas'); c.width = 520; c.height = 320;
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
    return [...ctx.getImageData(30, 20, 1, 1).data];
  });
  expect(pixel).toEqual([255, 250, 240, 255]);
  const bluePixels = await fish.evaluate((img: HTMLImageElement) => {
    const c = document.createElement('canvas'); c.width = 520; c.height = 320;
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, 520, 320).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 2] > pixels[i] + 15 && pixels[i + 1] > pixels[i] + 10) count++;
    return count;
  });
  expect(bluePixels).toBeGreaterThan(500);
  const anatomy = generate_scene('Biggus fishus').anatomy;
  const outside: [number, number][] = [];
  for (let y = 20; y < 300; y += 8) for (let x = 20; x < 500; x += 8) {
    if (anatomy.regions.every(r => !contains(r.outline, x, y) && distanceToPath([x, y], [...r.outline, r.outline[0]]) > 4)) outside.push([x, y]);
  }
  const outsideColor = await fish.evaluate((img: HTMLImageElement, points) => {
    const c = document.createElement('canvas'); c.width = 520; c.height = 320;
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
    return points.filter(([x, y]) => {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      // Original black/gray barbels can extend outside painted skin. A saturated
      // blue/green pixel outside every exact contour would be leaked paint.
      return b > r + 15 && g > r + 10;
    }).length;
  }, outside);
  expect(outsideColor).toBe(0);
  await fish.screenshot({ path: testInfo.outputPath('watercolor.png') });
  const watercolor = await fish.getAttribute('src');
  await page.getByRole('button', { name: 'Coloring', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const svg = await Bun.file((await (await downloading).path())!).text();
  expect(svg).toContain(`href="${watercolor}"`);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(fish).toHaveAttribute('data-medium', 'ink');
  expect(errors).toEqual([]);
});

test('watercolor explicitly falls back to vector color without WebGL2', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      if (String(args[0]) === 'webgl2') return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto('/');
  const fish = page.getByRole('img', { name: /Procedural fish/ });
  await page.getByRole('button', { name: 'Coloring', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Enabled', exact: true }).getByRole('radio', { name: 'On', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('WebGL2');
  await expect(fish).toHaveAttribute('data-medium', 'vector');
  await expect(fish).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: 'Coloring', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const svg = await Bun.file((await (await pending).path())!).text();
  expect(svg).toContain('data-region="body"');
});
