import type { Drawing } from '../fishdraw.ts';
import { path, type SurfaceTrait, type TraitContext } from './types.ts';

function stripes({ body, params: p }: TraitContext): Drawing {
  const count = Math.max(1, Math.round(4 / p.pattern_scale));
  return Array.from({ length: count }, (_, i) => path(65, t =>
    body.point(t, -0.72 + (i + 0.5) / count * 1.44 + Math.sin(t * Math.PI * 3) * 0.04)));
}

function chevrons({ body, params: p }: TraitContext): Drawing {
  const count = Math.max(3, Math.round(12 / p.pattern_scale));
  const strokes: Drawing = [];
  for (let i = 1; i < count; i++) {
    for (let k = 0; k < 3; k++) {
      strokes.push(path(35, t => {
        const v = t * 1.9 - 0.95;
        return body.point(i / count + Math.abs(v) * 0.13 + k * 0.004, v);
      }));
    }
  }
  return strokes;
}

function reticulation({ body, params: p, random }: TraitContext): Drawing {
  const cols = Math.max(7, Math.round(body.length / (22 * p.pattern_scale)));
  const rows = Math.max(3, Math.round(body.depth / (20 * p.pattern_scale)));
  const nodes = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: cols + 1 }, (_, col) => ({
      u: (col + (row % 2) * 0.5 + (random() - 0.5) * 0.35) / cols,
      v: -1 + (row + (random() - 0.5) * 0.35) / rows * 2,
    })));
  const strokes: Drawing = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = nodes[row][col];
      for (const b of [nodes[row][col + 1], nodes[row + 1][col]]) {
        strokes.push(path(5, t => body.point(a.u + (b.u - a.u) * t,
          a.v + (b.v - a.v) * t + Math.sin(t * Math.PI) * 0.03)));
      }
    }
  }
  return strokes;
}

function rings({ body, params: p, random }: TraitContext, ocellus: boolean): Drawing {
  const strokes: Drawing = [];
  const count = ocellus ? 1 : Math.max(5, Math.round(25 / p.pattern_scale));
  for (let i = 0; i < count; i++) {
    const u = ocellus ? 0.78 : 0.23 + random() * 0.7;
    const v = ocellus ? -0.32 : -0.7 + random() * 1.4;
    const center = body.point(u, v);
    const localDepth = body.point(u, 1)[1] - body.point(u, -1)[1];
    const r = Math.min(localDepth * (ocellus ? 0.22 : 0.09) * p.pattern_scale, body.length * 0.055);
    for (const factor of ocellus ? [1, 0.73, 0.58, 0.43, 0.28, 0.13] : [1, 0.66]) {
      strokes.push(path(33, t => [center[0] + Math.cos(t * Math.PI * 2) * r * factor,
        center[1] + Math.sin(t * Math.PI * 2) * r * factor]));
    }
  }
  return strokes;
}

function countershading({ body, params: p }: TraitContext): Drawing {
  const strokes: Drawing = [];
  const count = Math.round(body.length / (4 * p.pattern_scale));
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    strokes.push(path(8, t => body.point(u + t * 0.025, -0.96 + t * 0.65)));
  }
  return strokes;
}

export const bodyMarkings: readonly SurfaceTrait[] = [
  { id: 0, key: 'none', label: 'None' },
  { id: 1, key: 'spots', label: 'Spots' },
  { id: 2, key: 'mottled', label: 'Mottled' },
  { id: 3, key: 'bars', label: 'Stripes' },
  { id: 4, key: 'stipple', label: 'Stipple' },
  { id: 5, key: 'longitudinal', label: 'Longitudinal stripes', render: stripes },
  { id: 6, key: 'chevrons', label: 'Chevrons', render: chevrons },
  { id: 7, key: 'reticulated', label: 'Reticulated network', render: reticulation },
  { id: 8, key: 'ocellus', label: 'Ocellus · eye spot', render: c => rings(c, true) },
  { id: 9, key: 'rings', label: 'Ringed spots', render: c => rings(c, false) },
  { id: 10, key: 'countershading', label: 'Dark back / pale belly', render: countershading },
];

/** A clear halo keeps an eye spot legible over scales and other markings. */
export function ocellusMask({ body, params: p }: TraitContext) {
  const center = body.point(0.78, -0.32);
  const depth = body.point(0.78, 1)[1] - body.point(0.78, -1)[1];
  const radius = Math.min(depth * 0.22 * p.pattern_scale, body.length * 0.055) * 1.18;
  return path(33, t => [center[0] + Math.cos(t * Math.PI * 2) * radius,
    center[1] + Math.sin(t * Math.PI * 2) * radius]);
}

export function lateralLine({ body, params: p }: TraitContext): Drawing {
  if (!p.lateral_line_type) return [];
  const end = p.lateral_line_type === 2 ? 0.78 : 0.98;
  const point = (t: number) => body.point(0.18 + t * (end - 0.18),
    p.lateral_line_type === 2 ? -0.25 - Math.sin(t * Math.PI) * 0.48 : -0.08 - Math.sin(t * Math.PI) * 0.16);
  const strokes = [path(65, point)];
  for (let i = 1; i < 28; i++) {
    const [x, y] = point(i / 28);
    strokes.push([[x, y - 1.3], [x, y + 1.3]]);
  }
  return strokes;
}
