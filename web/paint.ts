import * as brush from 'p5.brush/standalone';
import type { Polyline } from '../fishdraw.ts';
import type { PaintLayer, PaintPlan } from '../colour/index.ts';

/** The only module that talks to p5.brush: it replays a plain-data paint plan.
 * The plan uses the SVG's 500×300 drawing inside a 520×320 sheet; p5.brush
 * puts the origin at the centre of the canvas. */
const OX = 10 - 260, OY = 10 - 160;

let canvas: HTMLCanvasElement | null = null;

/** One shared WebGL2 canvas: p5.brush keeps a single active target. */
export function paintCanvas(parent: HTMLElement): HTMLCanvasElement {
  if (!canvas) {
    canvas = brush.createCanvas(520, 320, { pixelDensity: 2, parent: null, id: 'fish-painting' });
    canvas.setAttribute('role', 'img');
    brush.angleMode(brush.RADIANS);
    brush.scaleBrushes(1.1);
    // A technical pen whose line swells a little mid-stroke, and a finer one for scales.
    brush.add('fish-ink', { type: 'default', weight: 0.2, scatter: 0.04, sharpness: 0.75, grain: 0.9, opacity: 220, spacing: 0.1, pressure: [0.85, 1.15, 0.8], noise: 0.15 });
    brush.add('fish-fine', { type: 'default', weight: 0.14, scatter: 0.05, sharpness: 0.6, grain: 0.8, opacity: 150, spacing: 0.1, pressure: [0.7, 1.1, 0.6], noise: 0.3 });
  }
  if (canvas.parentElement !== parent) parent.append(canvas);
  return canvas;
}

function shape(points: Polyline, curvature: number, close: boolean) {
  brush.beginShape(curvature);
  for (const [x, y] of points) brush.vertex(x + OX, y + OY);
  brush.endShape(close);
}

function layer(step: PaintLayer) {
  switch (step.kind) {
    case 'wash':
      brush.noStroke(); brush.noHatch(); brush.noWash();
      brush.fill(step.color, step.opacity);
      brush.fillBleed(step.bleed, 'out');
      brush.fillTexture(step.texture, step.border, true, step.split ?? 0.15);
      shape(step.poly, 0.3, true);
      brush.noFill();
      return;
    case 'glaze':
      brush.noStroke(); brush.noHatch(); brush.noFill();
      brush.wash(step.color, step.opacity);
      shape(step.poly, 0.3, true);
      brush.noWash();
      return;
    case 'stroke':
      brush.noFill(); brush.noWash(); brush.noHatch();
      if (step.wiggle) brush.wiggle(step.wiggle); else brush.noField();
      brush.set(step.brush, step.color, step.weight);
      shape(step.points, step.curvature ?? 0, false);
      return;
    case 'hatch':
      brush.noFill(); brush.noWash(); brush.noStroke(); brush.noField();
      brush.hatchStyle(step.brush, step.color, step.weight);
      brush.hatch(step.spacing, step.angle, { rand: step.rand, gradient: step.gradient });
      shape(step.poly, 0, true);
      brush.noHatch();
      return;
    case 'dabs': {
      brush.noFill(); brush.noWash(); brush.noHatch(); brush.noField();
      brush.set(step.brush, step.color, step.weight);
      const dx = Math.cos(step.angle) * step.length / 2, dy = Math.sin(step.angle) * step.length / 2;
      for (const [x, y] of step.points) brush.line(x + OX - dx, y + OY - dy, x + OX + dx, y + OY + dy);
      return;
    }
  }
}

/** Paint a plan onto the shared canvas. The same plan and seed paint the same picture. */
export function paint(plan: PaintPlan, seed: string) {
  if (!canvas) return;
  brush.load(canvas);
  brush.seed(seed);
  brush.noiseSeed(seed);
  brush.clear(plan.paper);
  for (const step of plan.steps) {
    if (step.kind === 'dry') brush.render();
    else layer(step);
  }
  brush.noField();
  brush.set('fish-ink', plan.palette.ink, 0.6);
  brush.rect(OX, OY, 500, 300);
  brush.render();
}
