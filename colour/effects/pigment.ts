import { cellRules, pigmentCells } from '../pigment.ts';
import { Stage, type ColourEffect, type PaintLayer } from '../types.ts';
import { finNames } from '../anatomy.ts';
import { graded, smoothstep, wash } from './shared.ts';

export const pigmentPatterns = [
  { id: 0, key: 'none', label: 'None' },
  { id: 1, key: 'spots', label: 'Spots' },
  { id: 2, key: 'stripes', label: 'Horizontal stripes' },
  { id: 3, key: 'bars', label: 'Vertical bars' },
  { id: 4, key: 'labyrinth', label: 'Labyrinth' },
  { id: 5, key: 'network', label: 'Reticulated network' },
  { id: 6, key: 'mottled', label: 'Mottled' },
] as const;

/** Melanophore pattern. Spots, stripes, bars, labyrinths and networks emerge
 * from the pigment-cell automaton; mottling is soft noise, the cryptic blotching
 * of bottom dwellers. Each mark is its own wash, so it dries with its own
 * bleed, granulation and edge ring. */
export const pigment: ColourEffect = {
  key: 'pigment',
  label: 'Pigment pattern',
  genes: [
    { key: 'pattern', label: 'Pattern', kind: 'choice', options: pigmentPatterns, sample: r => r.pick([0, 1, 2, 3, 4, 5, 6], [2, 3, 2, 3, 2, 1, 2]) },
    { key: 'scale', label: 'Scale', kind: 'range', min: 0.6, max: 2.2, step: 0.05, sample: r => r.tri(0.7, 1, 1.9) },
    { key: 'coverage', label: 'Coverage', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.2, 0.5, 0.85) },
    { key: 'dorsal', label: 'Fade toward belly', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0, 0.35, 1) },
    { key: 'core', label: 'Dark cores', kind: 'toggle', sample: r => Number(r.chance(0.4)) },
    { key: 'fins', label: 'Pattern on fins', kind: 'toggle', sample: r => Number(r.chance(0.25)) },
  ],
  active: g => g.pattern !== 0,
  paint(ctx) {
    const { anatomy, palette, genes, style, random, noise } = ctx;
    const { raster } = anatomy;
    const key = pigmentPatterns.find(p => p.id === genes.pattern)?.key ?? 'none';
    // Where pigment may go: the skin, and the median fins and tail if asked.
    const allowed = new Uint8Array(anatomy.skin);
    if (genes.fins) for (const name of finNames) if (name !== 'pectoral') anatomy.fins[name].forEach((m, k) => { if (m) allowed[k] = 1; });
    const fade = (k: number) => 1 - genes.dorsal * smoothstep(-0.5, 0.9, anatomy.v[k]);

    const cell = 3 * genes.scale;
    let density: (x: number, y: number) => number;
    if (key === 'mottled') {
      const f = 0.02 / genes.scale;
      density = (x, y) => smoothstep(0.3, 0.7, noise(x * f, y * f, 21) * 0.75 + noise(x * f * 3, y * f * 3, 22) * 0.25);
    } else {
      let cols = Math.max(12, Math.round((raster.box.x1 - raster.box.x0) / cell));
      let rows = Math.max(8, Math.round((raster.box.y1 - raster.box.y0) / cell));
      const limit = 8000;
      if (cols * rows > limit) { const s = Math.sqrt(limit / (cols * rows)); cols = Math.round(cols * s); rows = Math.round(rows * s); }
      const sheet = pigmentCells(cols, rows, cellRules[key as keyof typeof cellRules], random);
      const sx = (cols - 1) / (raster.box.x1 - raster.box.x0), sy = (rows - 1) / (raster.box.y1 - raster.box.y0);
      density = (x, y) => {
        const gx = Math.min(cols - 1.001, (x - raster.box.x0) * sx), gy = Math.min(rows - 1.001, (y - raster.box.y0) * sy);
        const i = Math.floor(gx), j = Math.floor(gy), tx = gx - i, ty = gy - j;
        const at = (a: number, b: number) => sheet[b * cols + a];
        return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - ty) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * ty;
      };
    }
    // A little noise on the level keeps edges from looking traced.
    const threshold = 0.62 - 0.3 * genes.coverage;
    const field = raster.field((x, y, k) => allowed[k] ? density(x, y) * fade(k) + (noise(x * 0.07, y * 0.07, 5) - 0.5) * 0.1 : 0);
    const opacity = (110 + 90 * style.contrast);
    const layers: PaintLayer[] = [];

    if (key === 'network') {
      // The dark net is everything between pale cells: wash it lightly, then
      // draw the net itself as wet strokes around each pale cell.
      // In this rule the cells that win are the pale ones.
      const cellsAt = raster.contours(field, threshold, 6).outer;
      layers.push(...graded(ctx, raster.field((_x, _y, k) => allowed[k] ? 1 : 0), [0.5], palette.pigment, opacity * 0.35, { bleed: 0.1, texture: 0.6 }));
      for (const points of cellsAt) layers.push({ kind: 'stroke', points: [...points, points[0]], brush: 'marker', color: palette.pigment, weight: Math.max(1.4, cell * 0.65), curvature: 0.4 });
    } else if (key === 'mottled') {
      layers.push(...graded(ctx, field, [threshold, threshold + 0.2], palette.pigment, opacity * 0.55, { bleed: 0.3, texture: 0.7, border: 0.25 }));
    } else {
      for (const poly of raster.contours(field, threshold, 4).outer) layers.push(wash(ctx, poly, palette.pigment, opacity, { bleed: 0.08, texture: 0.6, border: 0.55 }));
      if (genes.core) for (const poly of raster.contours(field, threshold + 0.22, 4).outer) layers.push(wash(ctx, poly, palette.pigment, opacity * 0.8, { bleed: 0.05, texture: 0.7, border: 0.6 }));
    }
    return [{ stage: Stage.pattern, layers }];
  },
};
