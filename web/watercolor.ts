import { seedNumber } from '../color/noise.ts';
import { pathData, type PaintPlan } from '../color/plan.ts';
import { eyeSvg, inkSvg } from '../color/svg.ts';

function canvas() {
  const c = document.createElement('canvas'); c.width = 520; c.height = 320;
  return c;
}
function context(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  return ctx;
}
let runtime: Promise<{ brush: typeof import('p5.brush/standalone'); surface: HTMLCanvasElement }> | undefined;
function loadRuntime() {
  return runtime ??= (async () => {
    const surface = canvas();
    if (!surface.getContext('webgl2', { preserveDrawingBuffer: true })) throw new Error('Watercolor needs WebGL2. Use Vector color on this device.');
    const brush = await import('p5.brush/standalone');
    brush.load(surface);
    return { brush, surface };
  })().catch(error => { runtime = undefined; throw error; });
}
let queue: Promise<unknown> = Promise.resolve();
export class CancelledPaint extends Error {}
const yieldFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

/** One reusable official standalone brush runtime, serialized across React
 * updates. Six pigment textures are painted, then masked per anatomical layer.
 * No global p5 constructor, animation loop, or visible canvas is introduced. */
export function paintWatercolor(plan: PaintPlan, cancelled: () => boolean): Promise<string> {
  const work = queue.catch(() => {}).then(async () => {
    if (cancelled()) throw new CancelledPaint();
    const { brush, surface } = await loadRuntime();
    const textures = new Map<string, HTMLCanvasElement>();
    const output = canvas(), out = context(output), mask = canvas(), m = context(mask), layerCanvas = canvas(), layer = context(layerCanvas);
    const colors = new Set(plan.regions.flatMap(region => region.layers.map(layer => layer.color)));
    for (const color of colors) {
      if (cancelled()) throw new CancelledPaint();
      brush.clear();
      brush.seed(seedNumber(`${plan.settings.seed}:${color}`)); brush.noiseSeed(seedNumber(plan.settings.seed));
      brush.push(); brush.translate(-260, -160);
      brush.noStroke(); brush.noHatch(); brush.noWash();
      brush.fillBleed(plan.settings.bleed, 'in', 0);
      brush.fillTexture(plan.settings.grain, plan.settings.pooling, true, 0.12);
      // Use all anatomy as a paint substrate; final per-region coverage and
      // eye exclusion happen after brush.render(), including outward spill.
      brush.fill(color, 230);
      for (const { region } of plan.regions) brush.polygon(region.outline);
      brush.pop(); brush.render();
      const texture = canvas(); context(texture).drawImage(surface, 0, 0);
      textures.set(color, texture);
      await yieldFrame();
    }
    out.fillStyle = 'floralwhite'; out.fillRect(0, 0, 520, 320);
    out.strokeStyle = 'black'; out.strokeRect(10, 10, 500, 300);
    const skin = new Path2D(); skin.rect(0, 0, 520, 320); skin.addPath(new Path2D(pathData(plan.scene.anatomy.eye)));
    for (const region of plan.regions) {
      for (const pigment of region.layers) {
        m.clearRect(0, 0, 520, 320); m.save();
        m.clip(new Path2D(pathData(region.region.outline)), 'evenodd');
        m.clip(skin, 'evenodd'); m.fillStyle = 'white';
        if (pigment.id !== 'base') m.filter = 'blur(0.65px)';
        for (const band of pigment.bands) { m.globalAlpha = band.opacity; m.fill(new Path2D(band.path)); }
        m.restore();
        layer.clearRect(0, 0, 520, 320);
        layer.globalCompositeOperation = 'source-over'; layer.drawImage(textures.get(pigment.color)!, 0, 0);
        layer.globalCompositeOperation = 'destination-in'; layer.drawImage(mask, 0, 0);
        layer.globalCompositeOperation = 'source-over'; out.drawImage(layerCanvas, 0, 0);
      }
    }
    // Original pen strokes and the independently protected iris remain crisp.
    const lateral = plan.scene.anatomy.lateralLine.map(line => `<path d="${pathData(line, false)}" fill="none" stroke="${plan.palette.reflective}" stroke-width="1.2" opacity="${plan.settings.lateral}"/>`).join('');
    const overlay = new Image();
    overlay.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320">${lateral}${eyeSvg(plan)}${inkSvg(plan.scene, plan.settings.ink)}</svg>`)}`;
    await overlay.decode();
    if (cancelled()) throw new CancelledPaint();
    out.drawImage(overlay, 0, 0);
    return output.toDataURL('image/png');
  });
  queue = work;
  return work;
}
