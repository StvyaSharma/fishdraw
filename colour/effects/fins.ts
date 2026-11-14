import { finNames } from '../anatomy.ts';
import { Stage, type ColourEffect, type PaintLayer } from '../types.ts';
import { masked, smoothstep, wash } from './shared.ts';

export const finMargins = [
  { id: 0, label: 'None' },
  { id: 1, label: 'Dark edge' },
  { id: 2, label: 'Accent edge' },
  { id: 3, label: 'Body colour edge' },
] as const;

/** Fins are thin membrane: a light, wet tint that is densest at the base and
 * thins toward the edge, with an optional coloured margin on the free edges. */
export const fins: ColourEffect = {
  key: 'fins',
  label: 'Fins',
  genes: [
    { key: 'tint', label: 'Tint', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.2, 0.5, 0.95) },
    { key: 'base', label: 'Densest at the base', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0, 0.5, 1) },
    { key: 'margin', label: 'Margin', kind: 'choice', options: finMargins, sample: r => r.pick([0, 1, 2, 3], [4, 2, 2, 1]) },
    { key: 'marginWidth', label: 'Margin width', kind: 'range', min: 1, max: 8, step: 0.5, sample: r => r.tri(1.5, 3, 7) },
  ],
  paint(ctx) {
    const { anatomy, palette, genes, noise } = ctx;
    const { raster } = anatomy;
    const offSkin = raster.mask(() => true).map((_, k) => Number(!(anatomy.trunk[k] || anatomy.head[k])));
    const fromBody = raster.distance(offSkin);
    const tint: PaintLayer[] = [], base: PaintLayer[] = [], margins: PaintLayer[] = [];
    const marginColour = [palette.pigment, palette.pigment, palette.accent, palette.back][genes.margin];
    for (const name of finNames) {
      const mask = anatomy.fins[name];
      if (!mask.some(Boolean)) continue;
      const fill = masked(anatomy, mask, () => 1);
      for (const poly of raster.contours(fill, 0.5, 10).outer) tint.push(wash(ctx, poly, palette.fin, 30 + 70 * genes.tint, { bleed: 0.3, texture: 0.3, border: 0.3, split: 0.3 }));
      if (genes.base > 0.05 && name !== 'pectoral') {
        const near = masked(anatomy, mask, (x, y, k) => smoothstep(28, 4, fromBody[k]) * (0.8 + 0.2 * noise(x * 0.05, y * 0.05, 12)));
        for (const poly of raster.contours(near, 0.4, 10).outer) base.push(wash(ctx, poly, palette.back, 30 + 70 * genes.base * genes.tint, { bleed: 0.35, texture: 0.4, border: 0.1 }));
      }
      if (genes.margin && name !== 'pectoral') {
        const depth = raster.distance(mask);
        const band = masked(anatomy, mask, (x, y, k) =>
          fromBody[k] > 6 ? 1 - depth[k] / (genes.marginWidth * (0.7 + 0.6 * noise(x * 0.04, y * 0.04, 8))) : 0);
        for (const poly of raster.contours(band, 0, 6).outer) margins.push(wash(ctx, poly, marginColour, 150, { bleed: 0.06, texture: 0.4, border: 0.6 }));
      }
    }
    return [{ stage: Stage.fins, layers: [...tint, ...base] }, { stage: Stage.detail, layers: margins }];
  },
};
