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
  const power = 0.55 + noise(1.7, 3.1, 27) * 0.6;
  const taper = 0.45 + noise(4.7, 1.1, 27) * 0.4;
  const peduncle = 0.035 + noise(8.7, 3.1, 27) * 0.1;
  const bias = (noise(2.7, 6.1, 27) - 0.5) * 0.55;
  for (let i = 0; i < 32; i++) {
    const t = i / 31;
    const along = Math.max(0, Math.min(1, t + Math.sin(t * Math.PI) * bias));
    let h: number;
    if (mode === 'torpedo') h = peduncle + Math.sin(Math.PI * along) ** power * (1 - along * taper);
    else if (mode === 'discoid') h = peduncle + Math.sin(Math.PI * along) ** (power * 0.75) * (1 - along * taper * 0.45);
    else if (mode === 'eel') h = peduncle + (1 - along) ** (power * 0.8) * 0.5;
    else h = peduncle + Math.sin(Math.PI * along) ** (power * 0.4) * (1 - along * taper) * 0.65;
    h *= 0.75 + p.body_curve_amount * 0.3;
    const bend = (noise(t * 2.5, 5.3, 28) - 0.5) * p.body_height * (mode === 'eel' ? 1.1 : 0.25);
    const x = 225 + (t - 0.5) * p.body_length;
    for (let side = 0; side < 2; side++) {
      const variation = 0.5 + noise(t * 3, side + 1, 29) * 0.95;
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
