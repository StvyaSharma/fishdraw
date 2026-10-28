import type { Point, Polyline } from '../fishdraw.ts';
import { path, type TraitContext } from './types.ts';

/** Continuous fields move neighboring features together, as in the original
 * scale mesh. Independent white noise at every vertex just makes scratchiness. */
export function warp(c: TraitContext, [x, y]: Point, amount: number): Point {
  return [x + (c.noise(x * 0.016, y * 0.016, 6.1) - 0.5) * amount,
    y + (c.noise(x * 0.016, y * 0.016, 9.3) - 0.5) * amount];
}

/** Fine pen drift over a sampled stroke; endpoints remain attached. */
export function ink(c: TraitContext, points: Polyline, amount = 0.65): Polyline {
  const phase = c.random() * 40;
  const samples = points.length === 2
    ? path(Math.max(3, Math.min(80, Math.ceil(Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) / 3))), t =>
      [points[0][0] * (1 - t) + points[1][0] * t, points[0][1] * (1 - t) + points[1][1] * t])
    : points;
  return samples.map(([x, y], i) => {
    const fade = Math.sin(i / (samples.length - 1) * Math.PI);
    return [x + (c.noise(x * 0.14, y * 0.14, phase) - 0.5) * amount * fade,
      y + (c.noise(x * 0.14, y * 0.14, phase + 3) - 0.5) * amount * fade];
  });
}

export function surfaceBounds(c: TraitContext) {
  const xs = c.body.outline.map(p => p[0]);
  const ys = c.body.outline.map(p => p[1]);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

export function surfaceV(c: TraitContext, x: number, y: number) {
  const u = (x - c.body.top[0][0]) / c.body.length;
  const top = c.body.point(u, -1)[1];
  const bottom = c.body.point(u, 1)[1];
  return (y - top) / Math.max(1, bottom - top);
}
