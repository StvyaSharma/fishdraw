import * as brush from 'p5.brush/standalone';
import type { generate } from '../fishdraw.ts';

type Fish = ReturnType<typeof generate>;
const PAPER = '#fffaf0';
/** The SVG output offsets the 500×300 drawing by 10 units inside a 520×320
 * sheet; p5.brush, like p5's WEBGL mode, puts the origin at the centre. */
const OX = 10 - 260, OY = 10 - 160;

let canvas: HTMLCanvasElement | null = null;

/** One shared WebGL2 canvas; p5.brush keeps a single active target. */
export function paintCanvas(parent: HTMLElement): HTMLCanvasElement {
  if (!canvas) {
    canvas = brush.createCanvas(520, 320, { pixelDensity: 2, parent: null, id: 'fish-painting' });
    canvas.setAttribute('role', 'img');
    brush.scaleBrushes(1.1);
  }
  if (canvas.parentElement !== parent) parent.append(canvas);
  return canvas;
}

function path(points: [number, number][], curvature: number, close: boolean) {
  brush.beginShape(curvature);
  for (const [x, y] of points) brush.vertex(x + OX, y + OY);
  brush.endShape(close);
}

/** Watercolour washes first (they dry together), then marks, then the engraved ink on top. */
export function paint(fish: Fish, seedValue: string) {
  if (!canvas || !fish.paint) return;
  brush.load(canvas);
  brush.seed(seedValue);
  brush.noiseSeed(seedValue);
  brush.clear(PAPER);
  brush.noHatch();
  brush.noStroke();
  for (const wash of fish.paint.washes) {
    brush.fill(wash.color, wash.opacity);
    brush.fillBleed(wash.bleed, 'out');
    brush.fillTexture(wash.texture, 0.45);
    path(wash.poly, 0, true);
  }
  brush.noFill();
  brush.render();
  for (const mark of fish.paint.marks) {
    brush.set('marker', mark.color, mark.weight);
    path(mark.points, 0.2, false);
  }
  fish.polylines.forEach((line, i) => {
    brush.set('rotring', fish.colors?.[i] ?? '#000000', 0.7);
    path(line, 0, false);
  });
  brush.set('rotring', '#000000', 0.6);
  brush.rect(OX, OY, 500, 300);
  brush.render();
}
