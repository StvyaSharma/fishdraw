import type { Drawing, Point, Polyline } from '../fishdraw.ts';
import { path, type SurfaceTrait, type TraitContext } from './types.ts';
import { ink, warp, surfaceBounds } from './organic.ts';

function stripes(c: TraitContext): Drawing {
  const { body, params: p, random, noise } = c;
  const count = Math.max(1, Math.round((2.5 + random() * 2) / p.pattern_scale));
  const strokes: Drawing = [];
  for (let i = 0; i < count; i++) {
    const center = -0.75 + (i + 0.25 + random() * 0.5) / count * 1.5;
    const phase = random() * 20;
    const width = (0.025 + random() * 0.06) * p.pattern_scale;
    const passes = 2 + Math.floor(random() * 4);
    for (let k = 0; k < passes; k++) {
      const start = random() * 0.13;
      const end = 0.85 + random() * 0.15;
      strokes.push(ink(c, path(70, t => {
        const u = start + t * (end - start);
        const bend = (noise(u * 5, phase) - 0.5) * 0.3;
        return body.point(u, center + bend + (k / passes - 0.5) * width);
      }), 0.8));
    }
  }
  return strokes;
}

function chevrons(c: TraitContext): Drawing {
  const { body, params: p, random, noise } = c;
  const count = Math.max(3, Math.round((8 + random() * 6) / p.pattern_scale));
  const strokes: Drawing = [];
  for (let i = 1; i < count; i++) {
    const u = (i + (random() - 0.5) * 0.55) / count;
    const slope = 0.07 + random() * 0.18;
    const apex = (random() - 0.5) * 0.3;
    const passes = 2 + Math.floor(random() * 4);
    const width = 0.004 + random() * 0.008;
    for (let k = 0; k < passes; k++) {
      const start = -1 + random() * 0.18;
      const end = 1 - random() * 0.2;
      strokes.push(ink(c, path(45, t => {
        const v = start + (end - start) * t;
        const bend = Math.sqrt((v - apex) ** 2 + 0.018) * slope;
        return body.point(u + bend + (noise(v * 2 + 2, i * 0.6) - 0.5) * 0.04 + k * width, v);
      }), 0.8));
    }
  }
  return strokes;
}

/** Irregular pigment cells, not another scale grid. Each half-plane clips one
 * Voronoi cell; the small bounded site count keeps this independent of zoom. */
function reticulation(c: TraitContext): Drawing {
  const { random, params: p } = c;
  const b = surfaceBounds(c);
  const width = b.right - b.left;
  const height = b.bottom - b.top;
  const spacing = 22 * p.pattern_scale;
  const count = Math.max(15, Math.min(180, Math.round(width * height / (spacing * spacing) * (0.8 + random() * 0.4))));
  const sites: Point[] = Array.from({ length: count }, () => [b.left + random() * width, b.top + random() * height]);
  const seen = new Set<string>();
  const strokes: Drawing = [];
  for (let i = 0; i < sites.length; i++) {
    let cell: Polyline = [[b.left - spacing, b.top - spacing], [b.right + spacing, b.top - spacing],
      [b.right + spacing, b.bottom + spacing], [b.left - spacing, b.bottom + spacing]];
    const a = sites[i];
    for (let j = 0; j < sites.length && cell.length; j++) {
      if (i === j) continue;
      const other = sites[j];
      const nx = other[0] - a[0], ny = other[1] - a[1];
      const limit = (other[0] ** 2 + other[1] ** 2 - a[0] ** 2 - a[1] ** 2) / 2;
      const next: Polyline = [];
      for (let k = 0; k < cell.length; k++) {
        const p0 = cell[k], p1 = cell[(k + 1) % cell.length];
        const d0 = p0[0] * nx + p0[1] * ny - limit;
        const d1 = p1[0] * nx + p1[1] * ny - limit;
        if (d0 <= 0) next.push(p0);
        if ((d0 <= 0) !== (d1 <= 0)) {
          const t = d0 / (d0 - d1);
          next.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
        }
      }
      cell = next;
    }
    for (let j = 0; j < cell.length; j++) {
      const a = cell[j], b = cell[(j + 1) % cell.length];
      const key = [a, b].map(p => p.map(v => v.toFixed(3)).join(',')).sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      if (random() < 0.08) continue;
      const edge = path(9, t => warp(c, [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t], spacing * 0.5));
      strokes.push(ink(c, edge, 0.8));
      if (random() < 0.5) {
        const offset = 0.7 + random() * 1.1;
        strokes.push(ink(c, edge.slice(1, 7).map(([x, y]) => [x + offset, y + offset * 0.5]), 0.5));
      }
    }
  }
  return strokes;
}

function eyeSpot(c: TraitContext) {
  const { body, params: p, noise } = c;
  const u = 0.71 + noise(2.3, 4.1, 21) * 0.13;
  const v = -0.55 + noise(5.1, 1.9, 21) * 0.4;
  const center = body.point(u, v);
  const depth = body.point(u, 1)[1] - body.point(u, -1)[1];
  const radius = Math.min(depth * (0.18 + noise(8.1, 2.3, 21) * 0.1) * p.pattern_scale, body.length * 0.065);
  const aspect = 0.8 + noise(3.4, 1.2, 21) * 0.35;
  const phase = noise(2.3, 7.9, 21) * Math.PI * 2;
  const contour = (angle: number, scale = 1): Point => {
    const r = radius * scale * (1 + Math.sin(angle * 3 + phase) * 0.07 + Math.sin(angle * 5 - phase) * 0.04);
    return [center[0] + Math.cos(angle) * r * aspect, center[1] + Math.sin(angle) * r];
  };
  return { center, radius, aspect, contour };
}

function rings(c: TraitContext, ocellus: boolean): Drawing {
  const { body, params: p, random, noise } = c;
  const strokes: Drawing = [];
  if (ocellus) {
    const spot = eyeSpot(c);
    strokes.push(ink(c, path(49, t => spot.contour(t * Math.PI * 2)), 0.5));
    strokes.push(ink(c, path(49, t => spot.contour(t * Math.PI * 2, 0.73)), 0.5));
    // Engraved dark center with a clear ring, rather than a perfect bullseye.
    for (let y = -spot.radius * 0.65; y <= spot.radius * 0.65; y += 1.8 + random() * 0.7) {
      const half = Math.sqrt(Math.max(0, (spot.radius * 0.65) ** 2 - y * y)) * spot.aspect;
      strokes.push(ink(c, [[spot.center[0] - half, spot.center[1] + y], [spot.center[0] + half, spot.center[1] + y]], 0.8));
    }
    return strokes;
  }
  const count = Math.max(5, Math.round((16 + random() * 20) / p.pattern_scale));
  for (let i = 0; i < count; i++) {
    const u = 0.2 + random() * 0.76;
    const v = -0.8 + random() * 1.55;
    const center = body.point(u, v);
    const depth = body.point(u, 1)[1] - body.point(u, -1)[1];
    const r = Math.min(depth * 0.1, body.length * 0.035) * p.pattern_scale * (0.45 + random());
    const aspect = 0.6 + random() * 0.8;
    const phase = random() * 30;
    for (const factor of [1, 0.55 + random() * 0.15]) {
      const gap = random() < 0.3 ? random() * 0.5 : 0;
      strokes.push(ink(c, path(25, t => {
        const a = t * (Math.PI * 2 - gap) + phase;
        const radius = r * factor * (0.8 + noise(Math.cos(a) + phase, Math.sin(a) + phase, 22) * 0.4);
        return [center[0] + Math.cos(a) * radius * aspect, center[1] + Math.sin(a) * radius];
      }), 0.65));
    }
  }
  return strokes;
}

function countershading(c: TraitContext): Drawing {
  const { body, params: p, random, noise } = c;
  const strokes: Drawing = [];
  const count = Math.round(body.length / (3.5 * p.pattern_scale));
  for (let i = 0; i < count; i++) {
    const u = (i + random() * 0.65) / count;
    if (random() < 0.12) continue;
    const depth = 0.25 + noise(u * 6, 2, 23) * 0.8;
    const lean = 0.012 + random() * 0.035;
    const start = -0.98 + random() * 0.09;
    const end = Math.min(-0.08, start + depth * (0.7 + random() * 0.5));
    strokes.push(ink(c, path(12, t => body.point(u + t * lean, start + t * (end - start))), 0.9));
    if (random() < 0.25) strokes.push(ink(c, [body.point(u - lean * 0.3, -0.92), body.point(u + lean * 0.4, -0.72)], 0.5));
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

/** Derive the halo from the same seed field as the spot, without consuming RNG. */
export function ocellusMask(c: TraitContext) {
  const spot = eyeSpot(c);
  return path(49, t => spot.contour(t * Math.PI * 2, 1.2));
}

export function lateralLine(c: TraitContext): Drawing {
  const { body, params: p, random, noise } = c;
  if (!p.lateral_line_type) return [];
  const end = p.lateral_line_type === 2 ? 0.7 + random() * 0.12 : 0.94 + random() * 0.04;
  const point = (t: number) => body.point(0.18 + t * (end - 0.18),
    (p.lateral_line_type === 2 ? -0.25 - Math.sin(t * Math.PI) * 0.48 : -0.08 - Math.sin(t * Math.PI) * 0.16)
      + (noise(t * 4, 2.1, 24) - 0.5) * 0.14);
  const strokes = [ink(c, path(65, point), 0.55)];
  for (let t = 0.03; t < 0.99; t += 0.025 + random() * 0.02) {
    const [x, y] = point(t);
    const size = 0.65 + random() * 0.95;
    strokes.push([[x - size * 0.2, y - size], [x + size * 0.4, y + size]]);
  }
  return strokes;
}
