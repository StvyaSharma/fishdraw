import type { Drawing, Polyline } from '../fishdraw.ts';
import { path, type TraitContext } from './types.ts';

/** Continuous median fin margin for eel-inspired silhouettes. */
export function ribbonFin({ body, params: p }: TraitContext): Drawing {
  const upper = path(48, t => {
    const u = 0.2 + t * 0.8;
    const pt = body.point(u, -1);
    return [pt[0], pt[1] - Math.sin(t * Math.PI / 2) * p.dorsal_length * 0.28];
  });
  const lower = path(48, t => {
    const u = 1 - t * 0.65;
    const pt = body.point(u, 1);
    return [pt[0], pt[1] + Math.cos(t * Math.PI / 2) * p.anal_length * 0.4];
  });
  const end = body.point(1, 0);
  const margin: Polyline = [
    ...(p.has_dorsal ? upper : [body.point(1, -1)]),
    [end[0] + p.tail_length * 0.65, end[1]],
    ...(p.has_anal ? lower : [body.point(1, 1)]),
  ];
  const strokes = [margin];
  for (let i = 2; i < upper.length; i += 2) {
    if (p.has_dorsal) strokes.push([body.point(0.2 + i / 47 * 0.8, -1), upper[i]]);
    if (p.has_anal) strokes.push([body.point(1 - i / 47 * 0.65, 1), lower[i]]);
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
