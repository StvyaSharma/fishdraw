import type { Polyline } from '../../fishdraw.ts';
import type { ColourAnatomy } from '../anatomy.ts';
import type { EffectContext, WashLayer } from '../types.ts';

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** Wash settings scaled by the shared style genes. */
export function wash(ctx: EffectContext, poly: Polyline, color: string, opacity: number, o: { bleed?: number; texture?: number; border?: number; split?: number } = {}): WashLayer {
  const { wetness, granulation } = ctx.style;
  return {
    kind: 'wash', poly, color, opacity: Math.round(Math.max(0, Math.min(255, opacity))),
    bleed: clamp01((o.bleed ?? 0.15) * (0.4 + 1.2 * wetness)),
    texture: clamp01((o.texture ?? 0.4) * (0.3 + 1.1 * granulation)),
    border: clamp01((o.border ?? 0.4) * (0.6 + 0.6 * (1 - wetness))),
    split: clamp01((o.split ?? 0.15) * (0.5 + wetness)),
  };
}

/** Graded tone as stacked glazes: each contour of the field at a rising level
 * is one more transparent wash, so tone builds up the way it does on paper. */
export function graded(ctx: EffectContext, field: Float32Array, levels: readonly number[], color: string, opacity: number, o: Parameters<typeof wash>[4] = {}) {
  const layers: WashLayer[] = [];
  for (const level of levels) for (const poly of ctx.anatomy.raster.contours(field, level, 20).outer) {
    layers.push(wash(ctx, poly, color, opacity, o));
  }
  return layers;
}

/** A field that is zero outside a mask, so its contours stay inside it. */
export function masked(anatomy: ColourAnatomy, mask: Uint8Array, value: (x: number, y: number, k: number) => number) {
  return anatomy.raster.field((x, y, k) => mask[k] ? value(x, y, k) : 0);
}
