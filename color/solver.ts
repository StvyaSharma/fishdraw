import type { Anatomy } from './anatomy.ts';
import { contains, distanceToPath } from './anatomy.ts';
import type { ColorSettings } from './settings.ts';
import { clamp, hash, seedNumber } from './noise.ts';

export interface Field {
  width: number; height: number; cell: number;
  domain: Int16Array; values: Float32Array; amplitude: number;
}
/** Visible anatomical atlas. Free edges and the eye have no-flux boundaries. */
export function anatomicalDomain(anatomy: Anatomy, cell: number): Omit<Field, 'values' | 'amplitude'> {
  const width = Math.ceil(520 / cell), height = Math.ceil(320 / cell);
  const domain = new Int16Array(width * height).fill(-1);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const px = (x + 0.5) * cell, py = (y + 0.5) * cell;
    if (contains(anatomy.eye, px, py)) continue;
    for (let r = 0; r < anatomy.regions.length; r++) if (contains(anatomy.regions[r].outline, px, py)) domain[y * width + x] = r;
  }
  return { width, height, cell, domain };
}
/** Exchange is allowed only across actual attachment seams, not arbitrary overlap. */
export function seamConductance(anatomy: Anatomy, a: number, b: number, x: number, y: number, cell: number, settings: ColorSettings): number {
  if (a < 0 || b < 0) return 0;
  if (a === b) return 1;
  const ar = anatomy.regions[a], br = anatomy.regions[b];
  const rooted = [ar, br].filter(r => r.id !== 'body');
  if (!rooted.length) return 0;
  const near = rooted.every(r => distanceToPath([x, y], r.root) <= cell * 2);
  return near ? settings.anatomyCoupling * Math.min(settings.regions[ar.id].coupling, settings.regions[br.id].coupling) : 0;
}

const cache = new Map<string, Field>();
/** A bounded, synchronous explicit solver. No periodic wrapping; all updates use
 * the previous arrays. Schnakenberg has a diffusion-driven instability at the
 * chosen a=.1,b=.9,Du=.045,Dv=.65; Gray–Scott is an artistic alternative. */
export function reactionField(anatomy: Anatomy, settings: ColorSettings): Field {
  const key = JSON.stringify([anatomy, settings.seed, settings.solver, settings.frequency, settings.iterations, settings.feed, settings.kill, settings.anisotropy, settings.anatomyCoupling, Object.values(settings.regions).map(r => r.coupling)]);
  const cached = cache.get(key);
  if (cached) return cached;
  const cell = clamp(30 / settings.frequency, 3, 8);
  const atlas = anatomicalDomain(anatomy, cell);
  const { width: w, height: h, domain } = atlas;
  const n = w * h, seed = seedNumber(settings.seed);
  let u = new Float32Array(n), v = new Float32Array(n), nu = new Float32Array(n), nv = new Float32Array(n);
  const right = new Float32Array(n), down = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (domain[i] < 0) continue;
    if (settings.solver === 'turing') {
      u[i] = 1 + (hash(x, y, seed) - 0.5) * 0.08;
      v[i] = 0.9 + (hash(x, y, seed + 1) - 0.5) * 0.08;
    } else {
      const patch = hash(Math.floor(x / 3), Math.floor(y / 3), seed) < 0.14;
      u[i] = patch ? 0.5 : 1; v[i] = patch ? 0.25 + hash(x, y, seed) * 0.05 : 0;
    }
    if (x + 1 < w) right[i] = seamConductance(anatomy, domain[i], domain[i + 1], (x + 1) * cell, (y + 0.5) * cell, cell, settings);
    if (y + 1 < h) down[i] = seamConductance(anatomy, domain[i], domain[i + w], (x + 0.5) * cell, (y + 1) * cell, cell, settings);
  }
  const dx = 1 + settings.anisotropy * 0.8, dy = 1 - settings.anisotropy * 0.8;
  const turing = settings.solver === 'turing', dt = turing ? 0.18 : 0.8;
  const iterations = Math.round(settings.iterations);
  for (let step = 0; step < iterations; step++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (domain[i] < 0) continue;
      let lu = 0, lv = 0;
      // Equal and opposite face conductances implement conservative diffusion.
      if (x + 1 < w) { const c = right[i] * dx; lu += c * (u[i + 1] - u[i]); lv += c * (v[i + 1] - v[i]); }
      if (x > 0) { const c = right[i - 1] * dx; lu += c * (u[i - 1] - u[i]); lv += c * (v[i - 1] - v[i]); }
      if (y + 1 < h) { const c = down[i] * dy; lu += c * (u[i + w] - u[i]); lv += c * (v[i + w] - v[i]); }
      if (y > 0) { const c = down[i - w] * dy; lu += c * (u[i - w] - u[i]); lv += c * (v[i - w] - v[i]); }
      const reaction = u[i] * u[i] * v[i];
      if (turing) {
        nu[i] = clamp(u[i] + dt * (0.045 * lu + 0.1 - u[i] + reaction), 0, 4);
        nv[i] = clamp(v[i] + dt * (0.65 * lv + 0.9 - reaction), 0, 4);
      } else {
        const uvv = u[i] * v[i] * v[i];
        nu[i] = clamp(u[i] + dt * (0.16 * lu - uvv + settings.feed * (1 - u[i])));
        nv[i] = clamp(v[i] + dt * (0.08 * lv + uvv - (settings.feed + settings.kill) * v[i]));
      }
    }
    [u, nu] = [nu, u]; [v, nv] = [nv, v];
  }
  let min = Infinity, max = -Infinity;
  const source = turing ? u : v;
  for (let i = 0; i < n; i++) if (domain[i] >= 0) { min = Math.min(min, source[i]); max = Math.max(max, source[i]); }
  const values = new Float32Array(n);
  for (let i = 0; i < n; i++) if (domain[i] >= 0) values[i] = clamp((source[i] - min) / Math.max(0.001, max - min));
  const field = { ...atlas, values, amplitude: max - min };
  cache.set(key, field);
  if (cache.size > 4) cache.delete(cache.keys().next().value!);
  return field;
}
export function sampleField(field: Field, x: number, y: number): number {
  const ix = clamp(Math.floor(x / field.cell), 0, field.width - 1), iy = clamp(Math.floor(y / field.cell), 0, field.height - 1);
  const i = iy * field.width + ix;
  if (field.domain[i] >= 0) {
    const gx = x / field.cell - 0.5, gy = y / field.cell - 0.5;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    let value = 0, weight = 0;
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
      const nx = x0 + dx, ny = y0 + dy;
      if (nx < 0 || ny < 0 || nx >= field.width || ny >= field.height) continue;
      const ni = ny * field.width + nx;
      // Do not interpolate through an isolated anatomical seam or eye hole.
      if (field.domain[ni] !== field.domain[i]) continue;
      const w = (dx ? gx - x0 : 1 - gx + x0) * (dy ? gy - y0 : 1 - gy + y0);
      value += field.values[ni] * w; weight += w;
    }
    return weight > 0 ? value / weight : field.values[i];
  }
  // Subpixel anatomical boundaries may lie just outside the raster domain.
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nx = ix + dx, ny = iy + dy;
    if (nx >= 0 && ny >= 0 && nx < field.width && ny < field.height && field.domain[ny * field.width + nx] >= 0) return field.values[ny * field.width + nx];
  }
  return 0;
}
