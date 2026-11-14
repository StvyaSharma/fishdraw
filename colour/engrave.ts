import type { Drawing, Polyline } from '../fishdraw.ts';
import { hash } from './random.ts';
import type { PaintLayer, PaintPlan } from './types.ts';

/** A second renderer for the same paint plan: every wash becomes hatching in
 * its pigment, so the colour stays plotter-ready — one pen per colour, lines
 * only, no fills. Tone is line spacing; stacked glazes cross at different
 * angles, the way an engraver builds depth. */

export interface Engraving { strokes: Drawing; colors: string[] }

/** Parallel lines at `angle`, `spacing` apart, clipped exactly to a polygon (even-odd). */
export function hatchPolygon(poly: Polyline, angle: number, spacing: number, phase = 0): Drawing {
  const out: Drawing = [];
  if (poly.length < 3 || spacing <= 0) return out;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  // Work in a frame where hatch lines are horizontal: t along, s across.
  const across = poly.map(([x, y]) => -dy * x + dx * y);
  const lo = Math.min(...across), hi = Math.max(...across);
  for (let s = lo + ((phase % 1) + 1) % 1 * spacing; s < hi; s += spacing) {
    const hits: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = across[j], b = across[i];
      if ((a > s) === (b > s)) continue;
      const k = (s - a) / (b - a);
      const [x0, y0] = poly[j], [x1, y1] = poly[i];
      hits.push(dx * (x0 + (x1 - x0) * k) + dy * (y0 + (y1 - y0) * k));
    }
    hits.sort((p, q) => p - q);
    for (let h = 0; h + 1 < hits.length; h += 2) {
      if (hits[h + 1] - hits[h] < 0.6) continue;
      const at = (t: number): [number, number] => [dx * t - dy * s, dy * t + dx * s];
      out.push([at(hits[h]), at(hits[h + 1])]);
    }
  }
  return out;
}

/** Each pigment keeps one hatch direction; glazes of it offset their phase so
 * lines never sit on top of each other. */
function direction(color: string) {
  return (hash(color) % 180) / 180 * Math.PI;
}

function engraveLayer(step: PaintLayer, index: number): Drawing {
  switch (step.kind) {
    case 'wash': case 'glaze': {
      // Denser lines for more opaque paint: 5.5 units apart at the faintest, 1.4 at full strength.
      const spacing = 5.5 - 4.1 * Math.min(1, step.opacity / 230);
      return hatchPolygon(step.poly, direction(step.color) + (index % 3) * 0.35, spacing, index * 0.37);
    }
    case 'hatch':
      return hatchPolygon(step.poly, step.angle, step.spacing);
    case 'stroke':
      return [step.points];
    case 'dabs': {
      const dx = Math.cos(step.angle) * step.length / 2, dy = Math.sin(step.angle) * step.length / 2;
      return step.points.map(([x, y]) => [[x - dx, y - dy], [x + dx, y + dy]]);
    }
  }
}

/** Engrave a plan: strokes in painting order (colour under ink), with a pen colour per stroke. */
export function engrave(plan: PaintPlan): Engraving {
  const strokes: Drawing = [], colors: string[] = [];
  plan.steps.forEach((step, i) => {
    if (step.kind === 'dry') return;
    for (const line of engraveLayer(step, i)) { strokes.push(line); colors.push(step.color); }
  });
  return { strokes, colors };
}
