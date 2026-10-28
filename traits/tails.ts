import type { Point } from '../fishdraw.ts';
import { path, type TailTrait, type TraitContext } from './types.ts';

function tail(c: TraitContext, kind: 'truncate' | 'pointed' | 'heterocercal') {
  const { body, params: p } = c;
  const top = body.top.at(-1)!;
  const bottom = body.bottom.at(-1)!;
  const x = top[0];
  const y = (top[1] + bottom[1]) / 2;
  const edge = path(33, t => {
    let dx = p.tail_length;
    let dy = (t - 0.5) * p.tail_length * 1.2;
    if (kind === 'pointed') {
      dx *= 1 - Math.abs(t - 0.5) * 1.5;
      dy *= 0.5;
    } else if (kind === 'heterocercal') {
      dx *= 0.28 + Math.abs(t - 0.5) * 1.6;
      dy *= t < 0.5 ? 1.75 : 0.7;
    }
    return [x + dx, y + dy];
  });
  const outline = [top, ...edge, bottom];
  const strokes = [outline];
  for (let i = 1; i < edge.length - 1; i += 2) {
    const t = i / (edge.length - 1);
    const root: Point = [x, top[1] + (bottom[1] - top[1]) * t];
    const tip = edge[i];
    strokes.push(path(9, s => [root[0] + (tip[0] - root[0]) * s,
      root[1] + (tip[1] - root[1]) * s + Math.sin(s * Math.PI) * 2]));
  }
  return { outline, strokes };
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
