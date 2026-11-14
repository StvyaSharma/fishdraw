import { Stage, type ColourEffect } from '../types.ts';
import { graded, masked } from './shared.ts';

/** The silvery lateral band: iridophores, stacked guanine plates that reflect
 * rather than absorb. Painted as a cool glaze after the body has dried, so it
 * lifts the flank without muddying the countershading beneath. */
export const sheen: ColourEffect = {
  key: 'sheen',
  label: 'Lateral sheen',
  genes: [
    { key: 'on', label: 'Sheen', kind: 'toggle', sample: r => Number(r.chance(0.6)) },
    { key: 'centre', label: 'Band centre', kind: 'range', min: -0.5, max: 0.6, step: 0.05, sample: r => r.tri(-0.3, 0.1, 0.5) },
    { key: 'width', label: 'Band width', kind: 'range', min: 0.1, max: 0.6, step: 0.05, sample: r => r.tri(0.12, 0.28, 0.55) },
    { key: 'strength', label: 'Strength', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.3, 0.6, 1) },
  ],
  active: g => Boolean(g.on),
  paint(ctx) {
    const { anatomy, palette, genes, noise } = ctx;
    const field = masked(anatomy, anatomy.skin, (x, y, k) => {
      const centre = genes.centre + (noise(x * 0.01, 4.4) - 0.5) * 0.35;
      // The band narrows toward the snout and the tail.
      const taper = Math.sin(Math.PI * Math.max(0.05, Math.min(0.95, anatomy.u[k])));
      return Math.exp(-(((anatomy.v[k] - centre) / (genes.width * (0.5 + 0.5 * taper))) ** 2)) * (0.75 + 0.25 * noise(x * 0.08, y * 0.08, 3));
    });
    return [{ stage: Stage.glaze, layers: graded(ctx, field, [0.3, 0.65], palette.sheen, 35 + 75 * genes.strength, { bleed: 0.3, texture: 0.15, border: 0.15, split: 0.4 }) }];
  },
};
