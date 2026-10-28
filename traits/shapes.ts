import type { Polyline } from '../fishdraw.ts';
import type { ShapeContext, ShapeTrait } from './types.ts';

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

function original({ params: p, noise }: ShapeContext, tapered: boolean): [Polyline, Polyline] {
  const curves: [Polyline, Polyline] = [[], []];
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 32; i++) {
      const t = i / 31;
      const bean = (x: number) => Math.pow(0.25 - Math.pow(x - 0.5, 2), 0.5) * (2.6 + 2.4 * Math.pow(x, 1.5)) * 0.542;
      const height = tapered
        ? lerp(1 - p.body_curve_amount, 1, lerp(0, 1, noise(t * 1.2, side + 1)) * bean(1 - t))
        : Math.sin(t * Math.PI) * lerp(0.5, 1, noise(t * 2, side + 1)) * p.body_curve_amount + (1 - p.body_curve_amount);
      curves[side].push([225 + (t - 0.5) * p.body_length, 150 + (side ? 1 : -1) * height * p.body_height]);
    }
  }
  return curves;
}

function profile({ params: p, noise }: ShapeContext, mode: 'torpedo' | 'discoid' | 'eel' | 'elongate'): [Polyline, Polyline] {
  const curves: [Polyline, Polyline] = [[], []];
  for (let i = 0; i < 32; i++) {
    const t = i / 31;
    let h: number;
    if (mode === 'torpedo') h = 0.07 + Math.sin(Math.PI * t) ** 0.8 * (1 - t * 0.72);
    else if (mode === 'discoid') h = 0.09 + Math.sin(Math.PI * t) ** 0.65 * (1 - t * 0.35);
    else if (mode === 'eel') h = 0.12 + (1 - t) ** 0.65 * 0.45;
    else h = 0.10 + Math.sin(Math.PI * t) ** 0.3 * (1 - t * 0.65) * 0.6;
    h *= 0.75 + p.body_curve_amount * 0.3;
    const bend = mode === 'eel' ? Math.sin(t * Math.PI * 2) * p.body_height * 0.32 : 0;
    const x = 225 + (t - 0.5) * p.body_length;
    for (let side = 0; side < 2; side++) {
      const variation = 0.97 + noise(t * 2, side + 1) * 0.06;
      curves[side].push([x, 150 + bend + (side ? 1 : -1) * h * p.body_height * variation]);
    }
  }
  return curves;
}

export const bodyShapes: readonly ShapeTrait[] = [
  { id: 0, key: 'rounded', label: 'Rounded', render: c => original(c, false) },
  { id: 1, key: 'tapered', label: 'Tapered', render: c => original(c, true) },
  { id: 2, key: 'torpedo', label: 'Torpedo', render: c => profile(c, 'torpedo') },
  { id: 3, key: 'discoid', label: 'Deep oval', render: c => profile(c, 'discoid') },
  { id: 4, key: 'eel', label: 'Eel-like', render: c => profile(c, 'eel') },
  { id: 5, key: 'elongate', label: 'Elongate', render: c => profile(c, 'elongate') },
];
