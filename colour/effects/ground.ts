import { Stage, type ColourEffect } from '../types.ts';
import { graded, masked } from './shared.ts';

/** A pale underwash over the whole body, painted first so every later wash
 * sits on tinted paper instead of bare white, as a watercolourist would. */
export const ground: ColourEffect = {
  key: 'ground',
  label: 'Ground wash',
  genes: [
    { key: 'strength', label: 'Strength', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.25, 0.55, 0.9) },
  ],
  paint(ctx) {
    const { anatomy, palette, genes } = ctx;
    const field = masked(anatomy, anatomy.skin, () => 1);
    return [{ stage: Stage.ground, layers: graded(ctx, field, [0.5], palette.belly, 40 + 90 * genes.strength, { bleed: 0.1, texture: 0.25, border: 0.2 }) }];
  },
};
