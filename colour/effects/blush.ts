import { Stage, type ColourEffect } from '../types.ts';
import { graded, masked, smoothstep } from './shared.ts';

/** A warm ventral flush — the reddened belly of breeding chars and sticklebacks,
 * or blood showing through thin skin behind the gills. Off on most fish. */
export const blush: ColourEffect = {
  key: 'blush',
  label: 'Belly blush',
  genes: [
    { key: 'on', label: 'Blush', kind: 'toggle', sample: r => Number(r.chance(0.22)) },
    { key: 'strength', label: 'Strength', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.2, 0.5, 1) },
    { key: 'reach', label: 'Reach along the body', kind: 'range', min: 0.2, max: 1, step: 0.05, sample: r => r.tri(0.25, 0.55, 1) },
  ],
  active: g => Boolean(g.on),
  paint(ctx) {
    const { anatomy, palette, genes, noise } = ctx;
    const field = masked(anatomy, anatomy.skin, (x, y, k) =>
      smoothstep(0.15, 0.75, anatomy.v[k]) * smoothstep(genes.reach + 0.1, genes.reach - 0.25, anatomy.u[k]) * (0.7 + 0.3 * noise(x * 0.05, y * 0.05, 9)));
    return [{ stage: Stage.shade, layers: graded(ctx, field, [0.25, 0.6], palette.blush, 40 + 80 * genes.strength, { bleed: 0.35, texture: 0.2, border: 0.1 }) }];
  },
};
