import type { Point } from '../../fishdraw.ts';
import { Stage, type ColourEffect } from '../types.ts';
import { smoothstep } from './shared.ts';

/** Fine speckling: scattered melanophores or gold xanthophores too small to
 * pattern, laid down with the tip of the brush after the washes have dried. */
export const speckle: ColourEffect = {
  key: 'speckle',
  label: 'Speckle',
  genes: [
    { key: 'on', label: 'Speckle', kind: 'toggle', sample: r => Number(r.chance(0.35)) },
    { key: 'density', label: 'Density', kind: 'range', min: 0.1, max: 1, step: 0.05, sample: r => r.tri(0.15, 0.4, 1) },
    { key: 'size', label: 'Size', kind: 'range', min: 0.4, max: 2, step: 0.1, sample: r => r.tri(0.5, 0.9, 1.8) },
    { key: 'tone', label: 'Tone', kind: 'choice', options: [{ id: 0, label: 'Dark' }, { id: 1, label: 'Accent' }], sample: r => r.pick([0, 1], [3, 1]) },
  ],
  active: g => Boolean(g.on),
  paint(ctx) {
    const { anatomy, palette, genes, random, noise } = ctx;
    const { raster } = anatomy;
    const points: Point[] = [];
    const spacing = 3.2 / Math.sqrt(genes.density);
    for (let y = raster.box.y0; y <= raster.box.y1; y += spacing) for (let x = raster.box.x0; x <= raster.box.x1; x += spacing) {
      const px = x + random.range(-0.5, 0.5) * spacing, py = y + random.range(-0.5, 0.5) * spacing;
      const k = Math.round((py - raster.box.y0) / raster.step) * raster.cols + Math.round((px - raster.box.x0) / raster.step);
      if (!anatomy.skin[k] || anatomy.skinDepth[k] < 2) continue;
      // Densest on the back and in noise-driven clusters.
      const p = smoothstep(1, -0.6, anatomy.v[k]) * (0.4 + 0.9 * noise(px * 0.03, py * 0.03, 14));
      if (random.next() < p) points.push([px, py]);
    }
    return [{ stage: Stage.detail, layers: [{ kind: 'dabs', points, brush: 'pen', color: genes.tone ? palette.accent : palette.pigment, weight: 1 * genes.size, length: 1.3 * genes.size, angle: random.range(0, Math.PI) }] }];
  },
};
