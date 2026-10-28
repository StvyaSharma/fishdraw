import type { Drawing, FishParams, Point, Polyline } from '../fishdraw.ts';

/** Body coordinates: u runs from the front of the trunk to the tail base;
 * v runs from -1 (dorsal edge) to +1 (ventral edge). */
export interface BodyFrame {
  top: Polyline;
  bottom: Polyline;
  outline: Polyline;
  point(u: number, v: number): Point;
  length: number;
  depth: number;
}

export interface TraitContext {
  params: FishParams;
  body: BodyFrame;
  random(): number;
  noise(x: number, y?: number, z?: number): number;
}

export interface Trait<Context, Result> {
  /** Existing numeric IDs are stable for saved parameter objects. */
  id: number;
  key: string;
  label: string;
  render: (context: Context) => Result;
}

/** Original surface/tail renderers keep their established drawing order. */
export type LegacyTrait<Context, Result> = Omit<Trait<Context, Result>, 'render'> & {
  render?: (context: Context) => Result;
};

export interface ShapeContext {
  params: FishParams;
  noise: TraitContext['noise'];
}

/** Return 32 corresponding points per curve, ordered from trunk front to tail.
 * Fixed sampling preserves the original engine's fin-anchor indices. */
export type ShapeTrait = Trait<ShapeContext, [Polyline, Polyline]>;
export type SurfaceTrait = LegacyTrait<TraitContext, Drawing>;
export type TailTrait = LegacyTrait<TraitContext, { outline: Polyline; strokes: Drawing }>;

/** Extensions are scoped to a call; no global registration or random state. */
export interface FishTraitExtensions {
  shapes?: readonly ShapeTrait[];
  textures?: readonly Trait<TraitContext, Drawing>[];
  markings?: readonly Trait<TraitContext, Drawing>[];
  tails?: readonly Trait<TraitContext, { outline: Polyline; strokes: Drawing }>[];
}

export function bodyFrame(top: Polyline, bottom: Polyline): BodyFrame {
  const sample = (line: Polyline, u: number): Point => {
    const t = Math.max(0, Math.min(1, u)) * (line.length - 1);
    const i = Math.min(Math.floor(t), line.length - 2);
    const f = t - i;
    return [line[i][0] + (line[i + 1][0] - line[i][0]) * f,
      line[i][1] + (line[i + 1][1] - line[i][1]) * f];
  };
  return {
    top, bottom, outline: [...top, ...bottom.toReversed()],
    length: top.at(-1)![0] - top[0][0],
    depth: Math.max(...bottom.map(p => p[1])) - Math.min(...top.map(p => p[1])),
    point(u, v) {
      const a = sample(top, u);
      const b = sample(bottom, u);
      const t = (v + 1) / 2;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    },
  };
}

export function path(count: number, point: (t: number) => Point): Polyline {
  return Array.from({ length: count }, (_, i) => point(i / (count - 1)));
}
