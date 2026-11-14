import type { FishAnatomy, Point, Polyline } from '../fishdraw.ts';
import { bodyFrame, type BodyFrame } from '../traits/types.ts';

/** The fish rasterised once into region masks and body coordinates. Effects
 * describe colour as scalar fields over this grid and contour them into wash
 * shapes, so every shape is clipped to the anatomy by construction. */

export const finNames = ['dorsal', 'pectoral', 'pelvic', 'anal', 'tail', 'accessory'] as const;
export type FinName = (typeof finNames)[number];

export interface Box { x0: number; y0: number; x1: number; y1: number }

function bounds(polys: Polyline[]): Box {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const poly of polys) for (const [x, y] of poly) {
    box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
  }
  return box;
}

/** Even-odd point-in-polygon, with a bounding-box early out. */
export function polygonTest(poly: Polyline) {
  if (poly.length < 3) return () => false;
  const box = bounds([poly]);
  return (x: number, y: number) => {
    if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) return false;
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
}

/** Shoelace area; positive for counter-clockwise loops in y-down space. */
export function signedArea(poly: Polyline) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
  return a / 2;
}

/** One pass of Chaikin corner cutting: softens marching-squares stair steps. */
function chaikin(loop: Polyline): Polyline {
  const out: Polyline = [];
  for (let i = 0; i < loop.length; i++) {
    const [ax, ay] = loop[i], [bx, by] = loop[(i + 1) % loop.length];
    out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
  }
  return out;
}

/** Keep every k-th point so long smooth loops stay cheap to paint. */
function thin(loop: Polyline, spacing: number): Polyline {
  const out: Polyline = [loop[0]];
  for (const p of loop) {
    const q = out[out.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= spacing) out.push(p);
  }
  return out.length >= 3 ? out : loop;
}

export interface Contours { outer: Polyline[]; holes: Polyline[] }

export class Raster {
  readonly cols: number;
  readonly rows: number;
  constructor(readonly box: Box, readonly step: number) {
    this.cols = Math.ceil((box.x1 - box.x0) / step) + 1;
    this.rows = Math.ceil((box.y1 - box.y0) / step) + 1;
  }
  get size() { return this.cols * this.rows; }
  x(i: number) { return this.box.x0 + i * this.step; }
  y(j: number) { return this.box.y0 + j * this.step; }
  mask(test: (x: number, y: number) => boolean) {
    const m = new Uint8Array(this.size);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) m[j * this.cols + i] = Number(test(this.x(i), this.y(j)));
    return m;
  }
  /** Sample a field at every cell; `k` is the flat cell index for looking up other grids. */
  field(value: (x: number, y: number, k: number) => number) {
    const f = new Float32Array(this.size);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const k = j * this.cols + i;
      f[k] = value(this.x(i), this.y(j), k);
    }
    return f;
  }
  /** Bilinear lookup of a grid at a point. */
  sample(grid: ArrayLike<number>, x: number, y: number) {
    const gx = Math.max(0, Math.min(this.cols - 1.001, (x - this.box.x0) / this.step));
    const gy = Math.max(0, Math.min(this.rows - 1.001, (y - this.box.y0) / this.step));
    const i = Math.floor(gx), j = Math.floor(gy), tx = gx - i, ty = gy - j, c = this.cols;
    return (grid[j * c + i] * (1 - tx) + grid[j * c + i + 1] * tx) * (1 - ty)
      + (grid[(j + 1) * c + i] * (1 - tx) + grid[(j + 1) * c + i + 1] * tx) * ty;
  }
  /** Chamfer (3-4) distance from each cell inside `mask` to the nearest cell outside, in drawing units. */
  distance(mask: Uint8Array) {
    const { cols, rows } = this, d = new Float32Array(this.size);
    const BIG = 1e9;
    for (let k = 0; k < d.length; k++) d[k] = mask[k] ? BIG : 0;
    const relax = (k: number, n: number, w: number) => { if (d[n] + w < d[k]) d[k] = d[n] + w; };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (!d[k]) continue;
      if (i === 0 || j === 0 || i === cols - 1 || j === rows - 1) { d[k] = 3; continue; }
      relax(k, k - 1, 3); relax(k, k - cols, 3); relax(k, k - cols - 1, 4); relax(k, k - cols + 1, 4);
    }
    for (let j = rows - 1; j >= 0; j--) for (let i = cols - 1; i >= 0; i--) {
      const k = j * cols + i;
      if (!d[k] || i === 0 || j === 0 || i === cols - 1 || j === rows - 1) continue;
      relax(k, k + 1, 3); relax(k, k + cols, 3); relax(k, k + cols + 1, 4); relax(k, k + cols - 1, 4);
    }
    for (let k = 0; k < d.length; k++) d[k] = d[k] / 3 * this.step;
    return d;
  }
  /** Closed iso-contours of a field (marching squares), smoothed. Loops smaller
   * than `minArea` square units are dropped. Holes are returned separately,
   * because a wash painted over a hole would fill it. */
  contours(field: Float32Array, level: number, minArea = 6): Contours {
    // Only march the window where the field rises above the level.
    let i0 = Infinity, j0 = Infinity, i1 = -1, j1 = -1;
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) if (field[j * this.cols + i] > level) {
      i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j);
    }
    if (i1 < 0) return { outer: [], holes: [] };
    const cols = i1 - i0 + 3, rows = j1 - j0 + 3, step = this.step;
    const ox = this.x(i0) - step, oy = this.y(j0) - step;
    // Pad with a ring below the level so every contour closes.
    const grid = new Float32Array(cols * rows).fill(level - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid[(j - j0 + 1) * cols + i - i0 + 1] = field[j * this.cols + i];
    const cross = (i0: number, j0: number, i1: number, j1: number): Point => {
      const a = grid[j0 * cols + i0], b = grid[j1 * cols + i1], t = (level - a) / (b - a);
      return [ox + (i0 + (i1 - i0) * t) * step, oy + (j0 + (j1 - j0) * t) * step];
    };
    // Edges are keyed by the cell edge they cross, so chaining needs no float matching.
    const edgeKey = (i0: number, j0: number, i1: number, j1: number) => (j0 * cols + i0) * 2 + (i1 !== i0 ? 0 : 1);
    type Edge = [number, number, number, number];
    const next = new Map<number, { to: number; p: Point }>();
    const points = new Map<number, Point>();
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const tl = grid[j * cols + i] > level, tr = grid[j * cols + i + 1] > level;
      const br = grid[(j + 1) * cols + i + 1] > level, bl = grid[(j + 1) * cols + i] > level;
      const top: Edge = [i, j, i + 1, j], right: Edge = [i + 1, j, i + 1, j + 1];
      const bottom: Edge = [i, j + 1, i + 1, j + 1], left: Edge = [i, j, i, j + 1];
      // Oriented so the inside is always on the same side; saddles split consistently.
      const cases: Record<number, [Edge, Edge][]> = {
        1: [[bottom, left]], 2: [[right, bottom]], 3: [[right, left]], 4: [[top, right]],
        5: [[top, left], [bottom, right]], 6: [[top, bottom]], 7: [[top, left]], 8: [[left, top]],
        9: [[bottom, top]], 10: [[left, bottom], [right, top]], 11: [[right, top]], 12: [[left, right]],
        13: [[bottom, right]], 14: [[left, bottom]],
      };
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      for (const [from, to] of cases[code] ?? []) {
        const a = edgeKey(...from), b = edgeKey(...to);
        if (!points.has(a)) points.set(a, cross(...from));
        if (!points.has(b)) points.set(b, cross(...to));
        next.set(a, { to: b, p: points.get(b)! });
      }
    }
    const outer: Polyline[] = [], holes: Polyline[] = [];
    const seen = new Set<number>();
    for (const start of next.keys()) {
      if (seen.has(start)) continue;
      const loop: Polyline = [];
      let k: number | undefined = start;
      while (k !== undefined && !seen.has(k)) {
        seen.add(k);
        loop.push(points.get(k)!);
        k = next.get(k)?.to;
      }
      if (loop.length < 4) continue;
      const area = signedArea(loop);
      if (Math.abs(area) < minArea) continue;
      const smooth = thin(chaikin(loop), step * 0.75);
      // Outer loops and holes wind in opposite directions.
      (area < 0 ? outer : holes).push(smooth);
    }
    return { outer, holes };
  }
}

export interface ColourAnatomy {
  source: FishAnatomy;
  body: BodyFrame;
  raster: Raster;
  trunk: Uint8Array;
  head: Uint8Array;
  eye: Uint8Array;
  /** Trunk or head, minus the eye: everywhere the body's own pigment can go. */
  skin: Uint8Array;
  fins: Record<FinName, Uint8Array>;
  /** Snout (0) to tail base (1), for skin cells. */
  u: Float32Array;
  /** Dorsal edge (-1) to ventral edge (+1), measured in each column of skin. */
  v: Float32Array;
  /** Distance inside the skin to its edge, in drawing units. */
  skinDepth: Float32Array;
}

/** Rasterise once per fish; `step` is the cell size in drawing units. */
export function colourAnatomy(source: FishAnatomy, step = 2): ColourAnatomy {
  const finPolys = finNames.map(name => source.fins[name]);
  const box = bounds([source.outline, source.head, ...finPolys.filter(p => p.length)]);
  const pad = step * 2;
  const raster = new Raster({ x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad }, step);
  const inTrunk = polygonTest(source.outline), inHead = polygonTest(source.head), inHeadMask = polygonTest(source.headMask);
  const { eye: e } = source;
  const trunk = raster.mask((x, y) => inTrunk(x, y) && !inHeadMask(x, y));
  const head = raster.mask((x, y) => inHead(x, y));
  const eye = raster.mask((x, y) => Math.hypot(x - e.x, y - e.y) < e.r * 1.02);
  const skin = new Uint8Array(raster.size);
  for (let k = 0; k < skin.length; k++) skin[k] = Number((trunk[k] || head[k]) && !eye[k]);
  const skinAll = new Uint8Array(raster.size);
  for (let k = 0; k < skin.length; k++) skinAll[k] = Number(trunk[k] || head[k]);
  const fins = Object.fromEntries(finNames.map((name, n) => {
    const test = polygonTest(finPolys[n]);
    // The pectoral lies over the flank; median fins and the tail stop at the body.
    return [name, raster.mask((x, y) => test(x, y) && (name === 'pectoral' || !(inTrunk(x, y) || inHead(x, y))))];
  })) as Record<FinName, Uint8Array>;

  // Body coordinates. v comes from each column's own extent of skin, smoothed
  // along the body so the head-trunk junction does not step.
  const { cols, rows } = raster;
  const top = new Float32Array(cols).fill(NaN), bottom = new Float32Array(cols).fill(NaN);
  let xMin = Infinity, xMax = -Infinity;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (skinAll[j * cols + i]) {
    if (Number.isNaN(top[i])) top[i] = j;
    bottom[i] = j;
    xMin = Math.min(xMin, i); xMax = Math.max(xMax, i);
  }
  const smoothCols = (a: Float32Array) => a.map((_, i) => {
    let sum = 0, n = 0;
    for (let d = -3; d <= 3; d++) if (i + d >= 0 && i + d < cols && !Number.isNaN(a[i + d])) { sum += a[i + d]; n++; }
    return n ? sum / n : NaN;
  });
  const t = smoothCols(top), b = smoothCols(bottom);
  const u = new Float32Array(raster.size), v = new Float32Array(raster.size);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    u[k] = (i - xMin) / Math.max(1, xMax - xMin);
    v[k] = Number.isNaN(t[i]) ? 0 : Math.max(-1.2, Math.min(1.2, 2 * (j - t[i]) / Math.max(1, b[i] - t[i]) - 1));
  }
  return {
    source, body: bodyFrame(source.body.top, source.body.bottom), raster,
    trunk, head, eye, skin, fins, u, v, skinDepth: raster.distance(skinAll),
  };
}
