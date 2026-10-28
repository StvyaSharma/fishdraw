import { expect, test } from '@playwright/test';

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
