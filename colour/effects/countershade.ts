import { Stage, type ColourEffect } from '../types.ts';
import { graded, masked, smoothstep } from './shared.ts';

/** Countershading (Thayer's principle): a dark dorsum grading to a pale belly
 * cancels the shading of overhead light. The boundary wanders with noise and
 * the gradient is built from several glazes, darkest along the back. */
export const countershade: ColourEffect = {
  key: 'countershade',
  label: 'Countershading',
  genes: [
    { key: 'boundary', label: 'Boundary height', kind: 'range', min: -0.7, max: 0.5, step: 0.05, sample: r => r.tri(-0.6, -0.05, 0.45) },
    { key: 'softness', label: 'Softness', kind: 'range', min: 0.1, max: 0.9, step: 0.05, sample: r => r.tri(0.15, 0.4, 0.85) },
    { key: 'strength', label: 'Strength', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.35, 0.7, 1) },
    { key: 'wander', label: 'Wander', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0, 0.4, 1) },
  ],
  paint(ctx) {
    const { anatomy, palette, genes, style, noise } = ctx;
    const { boundary, softness, strength, wander } = genes;
    const field = masked(anatomy, anatomy.skin, (x, y, k) => {
      const edge = boundary + (noise(x * 0.015, 1.3) - 0.5) * 0.9 * wander;
      // Edge-of-body darkening keeps the dorsal outline crisp.
      return smoothstep(edge + softness, edge - softness, anatomy.v[k]) * (0.85 + 0.15 * noise(x * 0.06, y * 0.06, 4));
    });
    const opacity = (30 + 70 * strength) * (0.6 + 0.6 * style.contrast);
    return [{ stage: Stage.shade, layers: graded(ctx, field, [0.15, 0.45, 0.75], palette.back, opacity, { bleed: 0.22, texture: 0.5, border: 0.35 }) }];
  },
};
