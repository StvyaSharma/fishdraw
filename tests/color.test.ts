import { expect, test } from 'bun:test';
import { generate, main, parameters_for_seed } from '../fishdraw.ts';
import { serialize } from '../formats.ts';
import { colorPatterns, paletteFamilies, pigmentCells, colorRandom } from '../traits/color.ts';

test('colour never moves a line-work stroke', () => {
  const mono = generate('Pomacanthus rex');
  const color = generate('Pomacanthus rex', { color_enabled: 1 });
  expect(mono.colors).toBeUndefined();
  const ink = color.polylines.filter((_, i) => color.colors![i] === '#000000' || color.colors![i] === color.colors!.at(-1));
  // Every monochrome stroke is still drawn, in the same order, in the coloured fish.
  const key = (line: number[][]) => JSON.stringify(line);
  const colored = new Set(color.polylines.map(key));
  expect(mono.polylines.every(line => colored.has(key(line)))).toBe(true);
  expect(ink.length).toBeGreaterThan(0);
  expect(main('Pomacanthus rex')).toEqual(mono.polylines);
});

test('colour genes are seeded, bounded and independent of the line-work stream', () => {
  const a = parameters_for_seed('Seeded colour');
  expect(parameters_for_seed('Seeded colour')).toEqual(a);
  expect(paletteFamilies.some(p => p.id === a.color_palette)).toBe(true);
  expect(colorPatterns.some(p => p.id === a.color_pattern)).toBe(true);
  expect(a.color_contrast).toBeGreaterThanOrEqual(0.2);
  expect(a.color_contrast).toBeLessThanOrEqual(1);
  const first = generate('Seeded colour', { color_enabled: 1 });
  generate('Something else', { color_enabled: 1 });
  expect(generate('Seeded colour', { color_enabled: 1 })).toEqual(first);
});

test('every pattern and palette draws finite strokes with one colour per stroke', () => {
  for (const pattern of colorPatterns) {
    const fish = generate('Patterned fish', { color_enabled: 1, color_pattern: pattern.id, color_palette: pattern.id % paletteFamilies.length, color_fin_margin: 1, color_eye_bar: 1 });
    expect(fish.colors!.length).toBe(fish.polylines.length);
    expect(fish.colors!.every(c => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    expect(fish.polylines.flat().every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= 500 && y <= 300)).toBe(true);
    expect(new Set(fish.colors).size).toBeGreaterThan(pattern.id ? 4 : 3);
  }
});

test('the pigment-cell automaton turns one parameter into distinct patterns', () => {
  const runs = (field: Float32Array, cols: number, rows: number, horizontal: boolean) => {
    let changes = 0;
    const outer = horizontal ? rows : cols, inner = horizontal ? cols : rows;
    for (let a = 0; a < outer; a++) for (let b = 1; b < inner; b++) {
      const at = (k: number) => (horizontal ? field[a * cols + k] : field[k * cols + a]) > 0.5;
      if (at(b) !== at(b - 1)) changes++;
    }
    return changes / outer;
  };
  const cols = 100, rows = 50;
  const stripes = pigmentCells(cols, rows, 2, colorRandom(3));
  const bars = pigmentCells(cols, rows, 3, colorRandom(3));
  // Stripes run along the body (few changes along a row); bars cross it.
  expect(runs(stripes, cols, rows, true)).toBeLessThan(runs(stripes, cols, rows, false));
  expect(runs(bars, cols, rows, false)).toBeLessThan(runs(bars, cols, rows, true));
  const spots = pigmentCells(cols, rows, 1, colorRandom(3));
  const cover = (f: Float32Array) => f.reduce((s, v) => s + Number(v > 0.5), 0) / f.length;
  expect(cover(spots)).toBeLessThan(cover(pigmentCells(cols, rows, 4, colorRandom(3))));
});

test('coloured output keeps pens separate in every format', () => {
  const fish = generate('Pen layers', { color_enabled: 1, color_pattern: 3 });
  const svg = serialize(fish.polylines, 'svg', 1, fish.colors);
  expect(svg.match(/<path /g)!.length).toBe(new Set(fish.colors).size);
  expect(svg.lastIndexOf('stroke="black"')).toBeGreaterThan(svg.lastIndexOf('stroke="#'));
  expect(serialize(fish.polylines, 'ps', 1, fish.colors)).toContain('setrgbcolor');
  const json = JSON.parse(serialize(fish.polylines, 'json', 1, fish.colors));
  expect(json[0]).toHaveProperty('color');
  expect(serialize(fish.polylines, 'csv', 1, fish.colors).split('\n')[0]).toStartWith('#');
  expect(serialize(fish.polylines, 'smil', 1, fish.colors)).toContain(`stroke="${fish.colors![0]}"`);
});
