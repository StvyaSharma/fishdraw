import type { Point } from '../../fishdraw.ts';
import { Stage, type ColourEffect } from '../types.ts';
import { wash } from './shared.ts';

export const irisColours = [
  { id: 0, label: 'Gold' },
  { id: 1, label: 'Accent' },
  { id: 2, label: 'Silver' },
  { id: 3, label: 'Red' },
] as const;

/** The iris: a small, saturated ring that gives the drawing its focal point. */
export const eye: ColourEffect = {
  key: 'eye',
  label: 'Eye',
  genes: [
    { key: 'iris', label: 'Iris', kind: 'choice', options: irisColours, sample: r => r.pick([0, 1, 2, 3], [4, 2, 3, 1]) },
  ],
  paint(ctx) {
    const { anatomy, palette, genes } = ctx;
    const { x, y, r } = anatomy.source.eye;
    const circle = (radius: number): Point[] => Array.from({ length: 28 }, (_, i) => [x + Math.cos(i / 28 * Math.PI * 2) * radius, y + Math.sin(i / 28 * Math.PI * 2) * radius]);
    const colour = ['#c9962e', palette.accent, '#b8c2c8', '#b2412c'][genes.iris];
    return [{ stage: Stage.detail, layers: [
      wash(ctx, circle(r * 0.92), colour, 190, { bleed: 0.03, texture: 0.3, border: 0.6 }),
      wash(ctx, circle(r * 0.42), '#15130f', 230, { bleed: 0.01, texture: 0.1, border: 0.2 }),
    ] }];
  },
};
