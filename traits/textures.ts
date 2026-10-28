import type { Drawing, Point } from '../fishdraw.ts';
import { path, type SurfaceTrait, type TraitContext } from './types.ts';
import { ink, warp, surfaceBounds, surfaceV } from './organic.ts';

function scales(c: TraitContext, kind: 'cycloid' | 'ctenoid' | 'ganoid' | 'denticles'): Drawing {
  const { params: p, random, noise } = c;
  const bounds = surfaceBounds(c);
  const spacing = (kind === 'denticles' ? 7 : 12) * p.scale_scale * (0.85 + random() * 0.3);
  const rowStep = spacing * (kind === 'ganoid' ? 0.66 : 0.72);
  const strokes: Drawing = [];
  // Lay scales in drawing space, then clip. Compressing a UV grid into a thin
  // peduncle previously collapsed hundreds of scale strokes into a black knot.
  let row = 0;
  for (let y = bounds.top - spacing; y < bounds.bottom + spacing; y += rowStep, row++) {
    for (let x = bounds.left - spacing; x < bounds.right + spacing; x += spacing) {
      const center = warp(c, [x + (row % 2) * spacing * 0.5, y], spacing * 2.3);
      const v = surfaceV(c, ...center);
      if (v < -0.15 || v > 1.15) continue;
      const coverage = 0.96 - Math.max(0, v - 0.45) * 0.85;
      if (random() > coverage || noise(x * 0.024, y * 0.024, 13) < 0.25) continue;
      const width = spacing * (0.45 + random() * 0.24);
      const height = rowStep * (0.55 + random() * 0.28);
      const angle = (noise(x * 0.01, y * 0.01, 16) - 0.5) * 0.65;
      const point = (dx: number, dy: number): Point => [center[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
        center[1] + dx * Math.sin(angle) + dy * Math.cos(angle)];
      if (kind === 'ganoid') {
        const corners: Point[] = [[x - spacing * 0.5, y], [x, y - rowStep], [x + spacing * 0.5, y], [x, y + rowStep]];
        // Neighboring plates share warped edges; draw the trailing half once.
        const offset = (row % 2) * spacing * 0.5;
        const plate = corners.map(([px, py]) => warp(c, [px + offset, py], spacing * 2.3));
        strokes.push(ink(c, [plate[1], plate[2], plate[3]], 0.75));
        if (random() < 0.48) strokes.push(ink(c, [plate[0], plate[1]], 0.6));
        if (random() < 0.5) strokes.push(ink(c, [point(-width * 0.15, -height * 0.3), point(width * 0.6, 0)], 0.4));
      } else if (kind === 'denticles') {
        const size = 0.55 + random() * 0.9;
        strokes.push(ink(c, [point(-width * 0.25, -height * 0.22), point(width * size, 0), point(-width * 0.1, height * 0.3)], 0.5));
      } else {
        const start = -Math.PI * (0.42 + random() * 0.12);
        const sweep = Math.PI * (0.75 + random() * 0.25);
        const edge = (t: number) => point(Math.cos(start + t * sweep) * width, Math.sin(start + t * sweep) * height);
        strokes.push(ink(c, path(11, edge), 1));
        if (kind === 'ctenoid') {
          const teeth = 2 + Math.floor(random() * 4);
          for (let i = 0; i < teeth; i++) {
            const t = 0.23 + (i + random() * 0.4) / teeth * 0.55;
            const a = edge(t);
            strokes.push([a, [a[0] + spacing * (0.1 + random() * 0.18), a[1] + (random() - 0.5) * spacing * 0.1]]);
          }
        }
        // Sparse interior engraving, thinning toward the belly.
        if (random() < 0.5 * (1 - Math.max(0, v))) {
          strokes.push(ink(c, [point(-width * 0.25, -height * 0.22), point(width * 0.6, height * 0.12)], 0.6));
        }
      }
    }
  }
  return strokes;
}

function scutes(c: TraitContext): Drawing {
  const { body, params, random, noise } = c;
  const count = Math.max(8, Math.round(body.length / (22 * params.scale_scale) * (0.8 + random() * 0.4)));
  const strokes: Drawing = [];
  for (const row of [-0.9, -0.12, 0.74]) {
    const phase = random() * 10;
    for (let i = 2; i < count; i++) {
      const u = (i + (random() - 0.5) * 0.35) / count;
      const v = row + (noise(u * 5, phase) - 0.5) * 0.17;
      const w = (0.28 + random() * 0.25) / count;
      const h = (row === -0.9 ? 0.07 : 0.11) * (0.65 + random() * 0.8);
      const a = body.point(u - w, v);
      const b = body.point(u - w * 0.2, v - h);
      const tip = body.point(u + w * 1.15, v - h * 0.1);
      const d = body.point(u - w * 0.1, v + h * 0.65);
      strokes.push(ink(c, [a, b, tip, d, a], 0.65));
      strokes.push(ink(c, [a, tip], 0.45));
      if (random() < 0.65) strokes.push([body.point(u - w * 0.1, v - h * 0.5), tip]);
    }
  }
  return strokes;
}

export const surfaceTextures: readonly SurfaceTrait[] = [
  { id: 0, key: 'layered', label: 'Layered' },
  { id: 1, key: 'fine', label: 'Fine' },
  { id: 2, key: 'crosshatch', label: 'Crosshatch' },
  { id: 3, key: 'veined', label: 'Veined' },
  { id: 4, key: 'smooth', label: 'Smooth / no scale strokes', render: () => [] },
  { id: 5, key: 'cycloid', label: 'Cycloid · smooth-edged', render: c => scales(c, 'cycloid') },
  { id: 6, key: 'ctenoid', label: 'Ctenoid · comb-edged', render: c => scales(c, 'ctenoid') },
  { id: 7, key: 'ganoid', label: 'Ganoid · diamond armor', render: c => scales(c, 'ganoid') },
  { id: 8, key: 'denticles', label: 'Placoid-inspired ticks', render: c => scales(c, 'denticles') },
  { id: 9, key: 'scutes', label: 'Scute rows', render: scutes },
];
