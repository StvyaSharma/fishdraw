import { expect, test, type Locator } from '@playwright/test';
import { fishInspirations, generate_preset, parameters_for_preset } from '../presets.ts';
import { binomen, parameters_for_seed } from '../fishdraw.ts';
import { serialize } from '../formats.ts';

async function expectPreset(drawing: Locator, presetId: string, seed = 'Biggus fishus') {
  const svg = decodeURIComponent((await drawing.getAttribute('src'))!.split(',')[1]);
  const expected = serialize(generate_preset(seed, presetId).polylines, 'svg');
  const strokes = (value: string) => [...value.matchAll(/\nM ([^\n]+)/g)].map(m => m[1].trim().split(/\s+/).map(Number));
  const actualLines = strokes(svg);
  const expectedLines = strokes(expected);
  // Different JS engines can simplify collinear points differently and drop a
  // different tiny stroke at the 0.9-unit cleanup threshold. Compare silhouette
  // endpoints and overall density here; exact browser preview/export equality
  // is checked below, and repeatability is tested within the generator runtime.
  expect(Math.abs(actualLines.length - expectedLines.length), presetId).toBeLessThanOrEqual(2);
  for (let i = 0; i < 2; i++) {
    for (const j of [0, 1, -2, -1]) expect(actualLines[i].at(j), `${presetId} stroke ${i}`).toBeCloseTo(expectedLines[i].at(j)!, 1);
  }
}

test('DialKit controls, seeds, reset, and exports work in production', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const drawing = page.getByRole('img', { name: /Procedural fish drawing/ });
  await expect(drawing).toBeVisible();
  await expect(page.locator('header, footer, h1, aside')).toHaveCount(0);
  await expect(page.locator('#root > img')).toHaveCount(1);
  await expect.poll(() => drawing.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(520);
  const initial = await drawing.getAttribute('src');
  await expect(page.getByRole('slider').first()).toBeVisible();
  const slider = page.getByRole('slider').first();
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(drawing).not.toHaveAttribute('src', initial!);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', initial!);

  await page.getByText('Scales', { exact: true }).click();
  await page.getByRole('option', { name: 'Crosshatch', exact: true }).click();
  await expect(drawing).not.toHaveAttribute('src', initial!);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', initial!);
  await page.getByText('Face', { exact: true }).click();
  const teeth = page.getByRole('radiogroup', { name: 'Teeth', exact: true });
  const on = teeth.getByRole('radio', { name: 'On', exact: true });
  const target = await on.getAttribute('aria-checked') === 'true' ? 'Off' : 'On';
  await teeth.getByRole('radio', { name: target, exact: true }).click();
  await expect(drawing).not.toHaveAttribute('src', initial!);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', initial!);

  await page.getByRole('textbox', { name: 'Seed', exact: true }).fill('Testus piscis');
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  await expect(drawing).toHaveAttribute('alt', 'Procedural fish drawing named Testus piscis');
  const named = await drawing.getAttribute('src');
  await expect(drawing).not.toHaveAttribute('src', initial!);
  // New seeds also reset the controls to their seeded defaults.
  await page.getByRole('textbox', { name: 'Seed', exact: true }).fill('Biggus fishus');
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', initial!);
  await page.getByRole('textbox', { name: 'Seed', exact: true }).fill('Testus piscis');
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', named!);

  await page.getByText('Export', { exact: true }).click();
  for (const format of ['svg', 'smil', 'json', 'csv', 'ps']) {
    await page.getByText('Format', { exact: true }).click();
    await page.getByRole('option', { name: new RegExp(`^${format}$`, 'i') }).click();

    const pendingDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    const download = await pendingDownload;
    expect(download.suggestedFilename()).toBe(`Testus-piscis.${format === 'smil' ? 'svg' : format}`);
    const path = await download.path();
    expect(path).not.toBeNull();
    const content = await Bun.file(path!).text();
    expect(content.length).toBeGreaterThan(100);
    if (format === 'svg' || format === 'smil') {
      const parsed = await page.evaluate(svg => {
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        return { errors: doc.querySelectorAll('parsererror').length, animations: doc.querySelectorAll('animate').length };
      }, content);
      expect(parsed.errors).toBe(0);
      if (format === 'smil') expect(parsed.animations).toBeGreaterThan(0);
    }
    if (format === 'json') expect(JSON.parse(content).length).toBeGreaterThan(0);
    if (format === 'ps') expect(content).toContain('%!PS-Adobe');
  }
  await page.getByRole('button', { name: 'Random', exact: true }).click();
  await expect(drawing).not.toHaveAttribute('alt', 'Procedural fish drawing named Testus piscis');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('editor.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('randomise traits picks a new combination and keeps controls, reset, and export in sync', async ({ page }) => {
  const uuids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  await page.addInitScript(ids => {
    let index = 0;
    Object.defineProperty(crypto, 'randomUUID', { value: () => ids[index++] });
  }, uuids);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const drawing = page.getByRole('img', { name: /Procedural fish drawing/ });
  await page.getByText('Inspiration', { exact: true }).click();
  await page.getByRole('option', { name: 'Florida gar', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Inspiration', exact: true }).click();
  for (const uuid of uuids) {
    const before = await drawing.getAttribute('src');
    parameters_for_seed(uuid);
    const seed = binomen();
    await page.getByRole('button', { name: 'Randomise traits', exact: true }).click();
    await expect(drawing).toHaveAttribute('alt', `Procedural fish drawing named ${seed}`);
    await expect(drawing).not.toHaveAttribute('src', before!);
    await expect(page.getByRole('textbox', { name: 'Seed', exact: true })).toHaveValue(seed);
    await expect(page.getByText('Explore all traits', { exact: true })).toBeVisible();
    await expectPreset(drawing, 'explorer', seed);
    const baseline = await drawing.getAttribute('src');
    const slider = page.getByRole('slider').first();
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeCloseTo(parameters_for_preset(seed, 'explorer').body_length, 5);
    await slider.focus();
    await slider.press('ArrowRight');
    await expect(drawing).not.toHaveAttribute('src', baseline!);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(drawing).toHaveAttribute('src', baseline!);
    await page.getByRole('button', { name: 'Draw', exact: true }).click();
    await expect(drawing).toHaveAttribute('src', baseline!);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  const preview = await drawing.getAttribute('src');
  await page.getByText('Export', { exact: true }).click();
  await page.getByText('Format', { exact: true }).click();
  await page.getByRole('option', { name: /^json$/i }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await pending;
  const polylines = await Bun.file((await download.path())!).json();
  expect(preview).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialize(polylines, 'svg'))}`);
  expect(errors).toEqual([]);
});

test('inspirations, independent traits, reset, and export stay in sync', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const drawing = page.getByRole('img', { name: /Procedural fish drawing/ });
  for (const preset of fishInspirations.filter(p => p.id !== 'procedural')) {
    const before = await drawing.getAttribute('src');
    await page.getByText('Inspiration', { exact: true }).click();
    await page.getByRole('option', { name: preset.label, exact: true }).click();
    await page.getByRole('button', { name: 'Apply Inspiration', exact: true }).click();
    await expect(drawing).not.toHaveAttribute('src', before!);
    await expectPreset(drawing, preset.id);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  const gar = await drawing.getAttribute('src');
  for (const [label, option] of [
    ['Scales', 'Smooth / no scale strokes'],
    ['Pattern', 'Ringed spots'],
    ['Lateral Line', 'Complete'],
    ['Tail Shape', 'Truncate · flat edge'],
  ]) {
    const before = await drawing.getAttribute('src');
    await page.getByText(label, { exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
    await expect(drawing).not.toHaveAttribute('src', before!);
  }
  const customized = await drawing.getAttribute('src');
  await page.getByText('Export', { exact: true }).click();
  await page.getByText('Format', { exact: true }).click();
  await page.getByRole('option', { name: /^json$/i }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const downloaded = await pending;
  const content = await Bun.file((await downloaded.path())!).text();
  const expectedSvg = serialize(JSON.parse(content), 'svg');
  expect(customized).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(expectedSvg)}`);

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', gar!);
  // Drawing again also discards edits and restores the chosen inspiration.
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  await expect(drawing).toHaveAttribute('src', gar!);
  await page.getByText('Inspiration', { exact: true }).click();
  await page.getByRole('option', { name: 'Original procedural fish', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Inspiration', exact: true }).click();
  await expect(drawing).not.toHaveAttribute('src', gar!);
  await expectPreset(drawing, 'procedural');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
