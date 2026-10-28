import type { Point, Polyline, Drawing } from '../fishdraw.ts';
import { path, type TailTrait, type TraitContext } from './types.ts';
import { ink } from './organic.ts';

function tail(c: TraitContext, kind: 'truncate' | 'pointed' | 'heterocercal') {
  const { body, params: p, random, noise } = c;
  const top = body.top.at(-1)!;
  const bottom = body.bottom.at(-1)!;
  const x = top[0];
  const y = (top[1] + bottom[1]) / 2;
  const length = p.tail_length * (0.88 + random() * 0.24);
  const spread = 0.85 + random() * 0.35;
  const sweep = (random() - 0.5) * length * 0.2;
  const phase = random() * 20;
  const rays = 20 + Math.floor(random() * 16);
  const randomProfile = random() * 0.3;
  const edge = path(rays + 1, t => {
    let dx = length;
    let dy = (t - 0.5) * length * 1.2 * spread;
    if (kind === 'pointed') {
      dx *= 1 - Math.abs(t - 0.5) ** (0.8 + randomProfile) * 1.5;
      dy *= 0.5;
    } else if (kind === 'heterocercal') {
      dx *= 0.24 + Math.abs(t - 0.5) ** 0.8 * 1.6;
      dy *= t < 0.5 ? 1.6 + randomProfile : 0.65;
    }
    const ripple = noise(t * 7, phase, 25) - 0.5;
    return [x + dx + ripple * length * 0.12, y + dy + sweep * Math.sin(t * Math.PI) + ripple * 2];
  });
  function side(a: Point, b: Point, bend: number): Polyline {
    return ink(c, path(15, t => [a[0] * (1 - t) + b[0] * t,
      a[1] * (1 - t) + b[1] * t + Math.sin(t * Math.PI) * bend]), 0.8);
  }
  const outline = [...side(top, edge[0], -length * 0.06), ...ink(c, edge, 1.2), ...side(edge.at(-1)!, bottom, length * 0.04)];
  const strokes: Drawing = [outline];
  for (let i = 1; i < rays; i++) {
    const t = i / rays;
    const root: Point = [x, top[1] + (bottom[1] - top[1]) * t];
    const tip = edge[i];
    const curvature = (noise(t * 4, phase, 26) - 0.5) * length * 0.22;
    const start = random() * 0.16;
    const end = 0.55 + random() * 0.42;
    const ray = (s: number): Point => [root[0] + (tip[0] - root[0]) * s,
      root[1] + (tip[1] - root[1]) * s + Math.sin(s * Math.PI) * curvature];
    strokes.push(ink(c, path(22, u => ray(start + u * (end - start))), 0.9));
    if (random() < 0.4) {
      strokes.push(ink(c, path(9, u => {
        const point = ray(0.5 + u * 0.47);
        return [point[0], point[1] + 1.1];
      }), 0.5));
    }
  }
  return { outline: [...outline, top], strokes };
}

export const tailShapes: readonly TailTrait[] = [
  { id: 0, key: 'ruffled', label: 'Ruffled' },
  { id: 1, key: 'rounded', label: 'Rounded' },
  { id: 2, key: 'forked', label: 'Forked' },
  { id: 3, key: 'emarginate', label: 'Shallow fork' },
  { id: 4, key: 'swept', label: 'Swept' },
  { id: 5, key: 'lunate', label: 'Crescent' },
  { id: 6, key: 'truncate', label: 'Truncate · flat edge', render: c => tail(c, 'truncate') },
  { id: 7, key: 'pointed', label: 'Pointed', render: c => tail(c, 'pointed') },
  { id: 8, key: 'heterocercal', label: 'Asymmetric · upper lobe', render: c => tail(c, 'heterocercal') },
];
