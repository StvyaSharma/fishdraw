import type { Drawing, Polyline, Point } from '../fishdraw.ts';
import { path, type TraitContext } from './types.ts';
import { ink } from './organic.ts';

/** Continuous median fin margin for eel-inspired silhouettes. */
export function ribbonFin(c: TraitContext): Drawing {
  const { body, params: p, random, noise } = c;
  const start = 0.16 + random() * 0.1;
  const lowerEnd = 0.3 + random() * 0.1;
  const samples = 42 + Math.floor(random() * 14);
  const phase = random() * 20;
  const upper = path(samples, t => {
    const u = start + t * (1 - start);
    const pt = body.point(u, -1);
    const height = (0.3 + noise(u * 5, phase, 30) * 0.8) * Math.sin(t * Math.PI / 2);
    return [pt[0], pt[1] - height * p.dorsal_length * 0.45];
  });
  const lower = path(samples, t => {
    const u = 1 - t * (1 - lowerEnd);
    const pt = body.point(u, 1);
    const height = (0.35 + noise(u * 4, phase + 2, 30) * 0.8) * Math.cos(t * Math.PI / 2);
    return [pt[0], pt[1] + height * p.anal_length * 0.55];
  });
  const end = body.point(1, 0);
  const tip: Point = [end[0] + p.tail_length * (0.5 + random() * 0.25), end[1] + (random() - 0.5) * 8];
  const join = path(17, t => {
    const a = p.has_dorsal ? upper.at(-1)! : body.point(1, -1);
    const b = p.has_anal ? lower[0] : body.point(1, 1);
    return [(1-t)**2 * a[0] + 2*t*(1-t)*tip[0]*1.08 + t*t*b[0],
      (1-t)**2 * a[1] + 2*t*(1-t)*tip[1] + t*t*b[1]];
  });
  const margin: Polyline = [
    ...(p.has_dorsal ? upper : [body.point(1, -1)]),
    ...join,
    ...(p.has_anal ? lower : [body.point(1, 1)]),
  ];
  const strokes: Drawing = [ink(c, margin, 1.2)];
  for (let i = 2; i < samples; i++) {
    if (random() < 0.23) continue;
    const t = i / (samples - 1);
    for (const [visible, root, edge] of [
      [p.has_dorsal, body.point(start + t * (1 - start), -1), upper[i]],
      [p.has_anal, body.point(1 - t * (1 - lowerEnd), 1), lower[i]],
    ] as const) {
      if (!visible) continue;
      const length = 0.5 + random() * 0.45;
      const lean = (random() - 0.5) * 5;
      strokes.push(ink(c, path(8, s => [root[0] + (edge[0] - root[0]) * s * length + Math.sin(s * Math.PI) * lean,
        root[1] + (edge[1] - root[1]) * s * length]), 0.6));
    }
  }
  return strokes;
}

export const finArrangements = [
  { id: 0, label: 'Single dorsal' },
  { id: 1, label: 'Legacy finlets' },
  { id: 2, label: 'Adipose fin' },
  { id: 3, label: 'Second dorsal' },
  { id: 4, label: 'Two dorsals + finlet trains' },
  { id: 5, label: 'Continuous eel margin' },
] as const;

export const lateralLines = [
  { id: 0, label: 'None' },
  { id: 1, label: 'Complete' },
  { id: 2, label: 'High arch · incomplete' },
] as const;
