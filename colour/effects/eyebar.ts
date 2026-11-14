import { Stage, type ColourEffect } from '../types.ts';
import { masked, wash } from './shared.ts';

/** A dark bar through the eye, the disruptive mask of butterflyfish and many
 * reef fish: it hides the eye, the one shape a predator looks for. */
export const eyeBar: ColourEffect = {
  key: 'eyeBar',
  label: 'Eye bar',
  genes: [
    { key: 'on', label: 'Eye bar', kind: 'toggle', sample: r => Number(r.chance(0.2)) },
    { key: 'width', label: 'Width', kind: 'range', min: 0.6, max: 2, step: 0.05, sample: r => r.tri(0.8, 1.1, 1.8) },
    { key: 'slant', label: 'Slant', kind: 'range', min: -0.5, max: 0.5, step: 0.05, sample: r => r.tri(-0.4, 0.15, 0.5) },
  ],
  active: g => Boolean(g.on),
  paint(ctx) {
    const { anatomy, palette, genes, style, noise } = ctx;
    const { eye } = anatomy.source;
    const head = new Uint8Array(anatomy.raster.size);
    for (let k = 0; k < head.length; k++) head[k] = anatomy.head[k] | anatomy.eye[k];
    const field = masked(anatomy, head, (x, y) => {
      const d = Math.abs(x - eye.x + (y - eye.y) * genes.slant);
      return 1 - d / (eye.r * genes.width * (1 + (noise(y * 0.05, 3, 7) - 0.5) * 0.5));
    });
    const layers = anatomy.raster.contours(field, 0, 10).outer.map(poly => wash(ctx, poly, palette.pigment, 150 + 80 * style.contrast, { bleed: 0.06, texture: 0.5, border: 0.5 }));
    return [{ stage: Stage.pattern, layers }];
  },
};
