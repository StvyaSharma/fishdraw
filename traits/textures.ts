import type { Drawing } from '../fishdraw.ts';
import { path, type SurfaceTrait, type TraitContext } from './types.ts';

function scales(c: TraitContext, kind: 'cycloid' | 'ctenoid' | 'ganoid' | 'denticles'): Drawing {
  const { body, params: p, random } = c;
  const spacing = 10 * p.scale_scale;
  const columns = Math.max(8, Math.round(body.length / spacing));
  const rows = Math.max(4, Math.round(body.depth / spacing));
  const strokes: Drawing = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const u = (col + (row % 2) * 0.5) / columns;
      const v = -0.92 + (row + 0.5) / rows * 1.84;
      const du = 0.75 / columns;
      const dv = 0.8 / rows;
      if (kind === 'ganoid') {
        const w = 0.5 / columns;
        const h = 1.84 / rows;
        strokes.push([body.point(u - w, v), body.point(u, v - h), body.point(u + w, v), body.point(u, v + h), body.point(u - w, v)]);
      } else if (kind === 'denticles') {
        const jitter = (random() - 0.5) / rows * 0.3;
        strokes.push([body.point(u - du * 0.3, v - dv * 0.25 + jitter), body.point(u + du * 0.45, v + jitter), body.point(u - du * 0.3, v + dv * 0.25 + jitter)]);
      } else {
        strokes.push(path(9, t => {
          const a = (t - 0.5) * Math.PI;
          return body.point(u + Math.cos(a) * du, v + Math.sin(a) * dv);
        }));
        if (kind === 'ctenoid') {
          for (const a of [-0.5, 0, 0.5]) {
            strokes.push([body.point(u + Math.cos(a) * du, v + Math.sin(a) * dv),
              body.point(u + Math.cos(a) * du + du * 0.35, v + Math.sin(a) * dv * 1.1)]);
          }
        }
      }
    }
  }
  return strokes;
}

function scutes({ body, params }: TraitContext): Drawing {
  const count = Math.max(8, Math.round(body.length / (22 * params.scale_scale)));
  const strokes: Drawing = [];
  // Only the dorsal and visible flank rows; not all five anatomical rows.
  for (const v of [-0.9, -0.12, 0.74]) {
    for (let i = 2; i < count; i++) {
      const u = i / count;
      const w = 0.36 / count;
      const h = v === -0.9 ? 0.08 : 0.12;
      strokes.push([body.point(u - w, v), body.point(u, v - h), body.point(u + w, v), body.point(u, v + h), body.point(u - w, v)]);
      strokes.push([body.point(u - w, v), body.point(u + w * 0.6, v)]);
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
