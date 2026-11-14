import { Stage, type ColourEffect, type PaintLayer } from '../types.ts';

/** The engraved line work, inked last with a technical pen. Scale and texture
 * lines take a lighter, body-tinted ink so the colour reads through them. */
export const ink: ColourEffect = {
  key: 'ink',
  label: 'Ink',
  genes: [
    { key: 'weight', label: 'Line weight', kind: 'range', min: 0.3, max: 1.4, step: 0.05, sample: r => r.tri(0.45, 0.7, 1.1) },
    { key: 'texture', label: 'Scale lines', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.3, 0.65, 1) },
    { key: 'wobble', label: 'Hand wobble', kind: 'range', min: 0, max: 4, step: 0.25, sample: r => r.tri(0, 0.75, 3) },
  ],
  paint(ctx) {
    const { palette, genes, ink: drawing } = ctx;
    const layers: PaintLayer[] = [];
    drawing.polylines.forEach((points, i) => {
      const tag = drawing.tags[i];
      if (tag === 'texture') {
        if (genes.texture > 0) layers.push({ kind: 'stroke', points, brush: 'fish-fine', color: palette.texture, weight: genes.weight * (0.5 + 0.5 * genes.texture), wiggle: genes.wobble });
      } else {
        layers.push({ kind: 'stroke', points, brush: 'fish-ink', color: palette.ink, weight: tag === 'caption' ? 0.6 : genes.weight, wiggle: tag === 'caption' ? 0 : genes.wobble });
      }
    });
    return [{ stage: Stage.ink, layers }];
  },
};
