import type { Drawing, Point, Polyline } from '../fishdraw.ts';
import type { BodyFrame } from './types.ts';

/** Colour is engraved, not filled: every colour is a pen, and every tone is
 * hatching that a field has carved away. The colour pass owns its random
 * stream and noise field, so turning colour on never moves a line-work stroke. */

export interface Palette {
  back: string; belly: string; sheen: string; pigment: string;
  accent: string; fin: string; texture: string; ink: string;
}

type Tone = [lightness: number, chroma: number, hue: number];
interface PaletteFamily {
  id: number; key: string; label: string;
  back: Tone; belly: Tone; sheen: Tone; pigment: Tone; accent: Tone;
}

/** Few hues per species: a body hue family, one pigment, one structural sheen
 * and an optional complementary accent (OKLCH: lightness, chroma, hue°). */
export const paletteFamilies: readonly PaletteFamily[] = [
  { id: 0, key: 'silver', label: 'Silver · open water', back: [0.45, 0.05, 235], belly: [0.9, 0.02, 220], sheen: [0.74, 0.06, 205], pigment: [0.3, 0.03, 250], accent: [0.68, 0.13, 60] },
  { id: 1, key: 'bronze', label: 'Olive bronze · river', back: [0.48, 0.07, 110], belly: [0.88, 0.05, 95], sheen: [0.72, 0.09, 80], pigment: [0.3, 0.04, 70], accent: [0.6, 0.15, 30] },
  { id: 2, key: 'reef', label: 'Yellow & black · reef', back: [0.8, 0.15, 95], belly: [0.94, 0.06, 100], sheen: [0.86, 0.1, 85], pigment: [0.24, 0.02, 270], accent: [0.6, 0.15, 245] },
  { id: 3, key: 'ember', label: 'Red & orange', back: [0.58, 0.17, 35], belly: [0.86, 0.07, 60], sheen: [0.76, 0.12, 55], pigment: [0.33, 0.1, 25], accent: [0.62, 0.12, 200] },
  { id: 4, key: 'azure', label: 'Blue · structural', back: [0.5, 0.13, 250], belly: [0.88, 0.04, 220], sheen: [0.76, 0.1, 195], pigment: [0.27, 0.05, 265], accent: [0.8, 0.16, 85] },
  { id: 5, key: 'jade', label: 'Green & gold', back: [0.55, 0.11, 155], belly: [0.9, 0.06, 120], sheen: [0.8, 0.1, 100], pigment: [0.3, 0.05, 165], accent: [0.62, 0.17, 20] },
];

export const colorPatterns = [
  { id: 0, label: 'None · countershading only' },
  { id: 1, label: 'Spots' },
  { id: 2, label: 'Horizontal stripes' },
  { id: 3, label: 'Vertical bars' },
  { id: 4, label: 'Labyrinth' },
  { id: 5, label: 'Reticulated network' },
] as const;

/** Small xorshift stream; independent of the line-work generator. */
export function colorRandom(seed: number) {
  let state = seed || 0x5eed;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** Seeded colour genotype: weighted families, triangular amounts. */
export function colorParameters(seed: number) {
  const random = colorRandom(seed);
  const pick = <T>(entries: readonly T[], weights: readonly number[]) => {
    let r = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < entries.length; i++) if ((r -= weights[i]) <= 0) return entries[i];
    return entries.at(-1)!;
  };
  const tri = (a: number, b: number, c: number) => {
    const r = random();
    const f = (b - a) / (c - a);
    return r < f ? a + Math.sqrt(r * (c - a) * (b - a)) : c - Math.sqrt((1 - r) * (c - a) * (c - b));
  };
  return {
    color_palette: pick([0, 1, 2, 3, 4, 5], [4, 3, 2, 2, 2, 2]),
    color_pattern: pick([0, 1, 2, 3, 4, 5], [2, 3, 2, 3, 2, 1]),
    color_pattern_scale: tri(0.7, 1, 1.8),
    color_contrast: tri(0.2, 0.6, 1),
    color_hue_shift: tri(-18, 0, 18),
    color_fin_margin: pick([0, 1], [2, 1]),
    color_eye_bar: pick([0, 1], [4, 1]),
  };
}

function oklch([l, c, h]: Tone): string {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  return '#' + linear.map(v => {
    const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, s)) * 255).toString(16).padStart(2, '0');
  }).join('');
}

export function palette(id: number, hueShift = 0): Palette {
  const f = paletteFamilies.find(p => p.id === id) ?? paletteFamilies[0];
  const shift = ([l, c, h]: Tone, dl = 0, k = 1): Tone => [l + dl, c * k, h + hueShift];
  return {
    back: oklch(shift(f.back)), belly: oklch(shift(f.belly)), sheen: oklch(shift(f.sheen)),
    pigment: oklch(shift(f.pigment)), accent: oklch(f.accent),
    fin: oklch(shift(f.back, 0.12, 0.6)), texture: oklch(shift(f.pigment, 0.02, 0.8)),
    ink: '#000000',
  };
}

/** Pure hashed value noise: a seeded, continuous field that draws nothing from any RNG. */
function valueNoise(seed: number) {
  const hash = (x: number, y: number, z: number) => {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144269504) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const octave = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const layer = (k: number) => lerp(
      lerp(hash(xi, yi, k), hash(xi + 1, yi, k), u),
      lerp(hash(xi, yi + 1, k), hash(xi + 1, yi + 1, k), u), v);
    return lerp(layer(zi), layer(zi + 1), w);
  };
  return (x: number, y: number, z = 0) => (octave(x, y, z) * 0.57 + octave(x * 2, y * 2, z + 17) * 0.29 + octave(x * 4, y * 4, z + 31) * 0.14);
}

/** Pigment cells as a two-cell automaton (Young 1984): melanophores support
 * neighbours close by and suppress them further out, the short-range
 * attraction / long-range repulsion measured between zebrafish melanophores
 * and xanthophores. One number, the inhibition weight, moves the result
 * between labyrinths and spots; stretching the kernel along the body or
 * across it turns labyrinths into stripes or bars. Mid-run the sheet is
 * stretched, so marks split and new ones insert as the fish "grows" (as
 * Kondo & Asai observed in Pomacanthus). Returns a blurred 0..1 density. */
export function pigmentCells(cols: number, rows: number, mode: number, random: () => number): Float32Array {
  const settings: Record<number, { w: number; sx: number; sy: number; density: number }> = {
    1: { w: 0.42, sx: 1, sy: 1, density: 0.25 },
    2: { w: 0.26, sx: 0.45, sy: 1.25, density: 0.5 },
    3: { w: 0.26, sx: 1.25, sy: 0.45, density: 0.5 },
    4: { w: 0.3, sx: 1, sy: 1, density: 0.45 },
    5: { w: 0.5, sx: 1.1, sy: 1.1, density: 0.35 },
  };
  const { w, sx, sy, density } = settings[mode];
  const inner = 2.4, outer = 5.6;
  const kernel: [number, number, number][] = [];
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
    const d = Math.hypot(dx * sx, dy * sy);
    if (d < inner) kernel.push([dx, dy, 1]);
    else if (d < outer) kernel.push([dx, dy, -w]);
  }
  let width = Math.max(10, Math.round(cols * 0.6));
  let cells = new Uint8Array(width * rows).map(() => Number(random() < density));
  const iterate = (count: number) => {
    for (let it = 0; it < count; it++) {
      const next = new Uint8Array(cells.length);
      for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) {
        let sum = 0;
        for (const [dx, dy, weight] of kernel) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < rows && cells[ny * width + nx]) sum += weight;
        }
        next[y * width + x] = sum > 0 ? 1 : sum < 0 ? 0 : cells[y * width + x];
      }
      cells = next;
    }
  };
  iterate(4);
  const grown = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    // Stretching thins every mark; flipping a few cells lets new ones nucleate.
    const v = cells[y * width + Math.min(width - 1, Math.floor(x / cols * width))];
    grown[y * cols + x] = random() < 0.12 ? 1 - v : v;
  }
  cells = grown; width = cols;
  iterate(5);
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let sum = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) { sum += cells[ny * cols + nx]; n++; }
    }
    out[y * cols + x] = sum / n;
  }
  return out;
}

export interface ColorAnatomy {
  body: BodyFrame;
  outline: Polyline;
  head: Polyline;
  headMask: Polyline;
  eye: { x: number; y: number; r: number };
  pectoral: Polyline;
  fins: Polyline[];
}

export interface ColorSettings {
  color_palette: number; color_pattern: number; color_pattern_scale: number;
  color_contrast: number; color_hue_shift: number; color_fin_margin: number; color_eye_bar: number;
}

function inside(poly: Polyline, box: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number) {
  if (poly.length < 3 || x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) return false;
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
function region(poly: Polyline) {
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  return { poly, box, has: (x: number, y: number) => inside(poly, box, x, y) };
}
function edgeDistance(poly: Polyline, x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

/** Overfill a box with parallel hatching, then keep only the runs a predicate allows. */
function carve(box: { x0: number; y0: number; x1: number; y1: number }, angle: number, spacing: number, keep: (x: number, y: number) => boolean): Drawing {
  const out: Drawing = [];
  const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const half = Math.hypot(box.x1 - box.x0, box.y1 - box.y0) / 2 + spacing;
  for (let o = -half; o <= half; o += spacing) {
    let run: Polyline = [];
    for (let s = -half; s <= half; s += 1.5) {
      const x = cx + dx * s - dy * o, y = cy + dy * s + dx * o;
      if (keep(x, y)) run.push([x, y]);
      else { if (run.length > 1) out.push(run); run = []; }
    }
    if (run.length > 1) out.push(run);
  }
  return out;
}

/** Fields shared by the engraved and painted renderers: one seed, one pattern. */
function colorFields(anatomy: ColorAnatomy, settings: ColorSettings, seed: number) {
  const random = colorRandom(seed ^ 0x9e3779b9);
  const noise = valueNoise(seed);
  const pal = palette(settings.color_palette, settings.color_hue_shift);
  const contrast = settings.color_contrast;
  const { body, eye } = anatomy;
  const trunk = region(anatomy.outline);
  const head = region(anatomy.head);
  const headMask = region(anatomy.headMask);
  const pectoral = region(anatomy.pectoral);
  const x0 = body.top[0][0];

  const uv = (x: number, y: number): Point => {
    const u = (x - x0) / body.length;
    const top = body.point(u, -1)[1], bottom = body.point(u, 1)[1];
    return [u, 2 * (y - top) / Math.max(1, bottom - top) - 1];
  };
  const inEye = (x: number, y: number) => Math.hypot(x - eye.x, y - eye.y) < eye.r * 1.05;
  const onTrunk = (x: number, y: number) => trunk.has(x, y) && !headMask.has(x, y) && !pectoral.has(x, y);
  const onSkin = (x: number, y: number) => (onTrunk(x, y) || (head.has(x, y) && !pectoral.has(x, y))) && !inEye(x, y);
  const dither = (x: number, y: number, z: number) => noise(x * 0.09, y * 0.09, z);

  // Pigment sheet over u ∈ [uMin, 1.05], v ∈ [-1.1, 1.1].
  const uMin = Math.min(0, (head.box.x0 - x0) / body.length) - 0.02;
  const cell = 3 * settings.color_pattern_scale;
  let pigment = (_x: number, _y: number) => 0;
  if (settings.color_pattern) {
    const spanX = (1.05 - uMin) * body.length, spanY = Math.max(body.depth, 20) * 1.1;
    let cols = Math.max(12, Math.round(spanX / cell)), rows = Math.max(8, Math.round(spanY / cell));
    const limit = 9000;
    if (cols * rows > limit) { const k = Math.sqrt(limit / (cols * rows)); cols = Math.round(cols * k); rows = Math.round(rows * k); }
    const field = pigmentCells(cols, rows, settings.color_pattern, random);
    const invert = settings.color_pattern === 5;
    pigment = (x, y) => {
      const [u, v] = uv(x, y);
      const gx = Math.max(0, Math.min(cols - 1.001, (u - uMin) / (1.05 - uMin) * (cols - 1)));
      const gy = Math.max(0, Math.min(rows - 1.001, (v + 1.1) / 2.2 * (rows - 1)));
      const ix = Math.floor(gx), iy = Math.floor(gy), tx = gx - ix, ty = gy - iy;
      const at = (i: number, j: number) => field[j * cols + i];
      const m = (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty;
      return invert ? 1 - m : m;
    };
  }
  const eyeBar = (x: number, y: number) => settings.color_eye_bar !== 0
    && head.has(x, y) && Math.abs(x - eye.x + (y - eye.y) * 0.22) < eye.r * (1.05 + (noise(y * 0.05, 3, 7) - 0.5) * 0.6);

  const skinBox = {
    x0: Math.min(trunk.box.x0, head.box.x0), y0: Math.min(trunk.box.y0, head.box.y0),
    x1: Math.max(trunk.box.x1, head.box.x1), y1: Math.max(trunk.box.y1, head.box.y1),
  };
  const threshold = 0.5 - 0.12 * contrast;
  const mark = (x: number, y: number) => pigment(x, y) + (noise(x * 0.07, y * 0.07, 5) - 0.5) * 0.12;
  const backEdge = (x: number) => 0.15 + (noise(x * 0.012, 1.3, 2) - 0.5) * 0.7;
  const sheenCentre = (x: number) => 0.12 + (noise(x * 0.01, 4.4, 3) - 0.5) * 0.4;
  return { pal, contrast, body, eye, trunk, head, headMask, pectoral, x0, uv, onTrunk, onSkin, dither, noise, pigment, eyeBar, skinBox, threshold, mark, backEdge, sheenCentre };
}

export function colorize(anatomy: ColorAnatomy, settings: ColorSettings, seed: number): { strokes: Drawing; colors: string[]; palette: Palette } {
  const { pal, contrast, eye, trunk, headMask, uv, onSkin, dither, noise, eyeBar, skinBox, threshold, mark, backEdge, sheenCentre } = colorFields(anatomy, settings, seed);
  const layers: [string, Drawing][] = [];

  // Countershading: dark dorsum fading through a noise-bent boundary.
  layers.push([pal.back, carve(skinBox, -40, 2.6, (x, y) => {
    if (!onSkin(x, y)) return false;
    const [, v] = uv(x, y);
    const edge = backEdge(x);
    const t = Math.max(0, Math.min(1, (edge - v) / (edge + 1)));
    return dither(x, y, 1) < t ** 0.8 * (0.55 + 0.4 * contrast) + 0.08;
  })]);
  // Pale belly wash.
  layers.push([pal.belly, carve(skinBox, -40, 4.5, (x, y) => onSkin(x, y) && uv(x, y)[1] > 0.1 && dither(x, y, 2) < 0.45)]);
  // Iridophore band along the flank: diffuse, so it dissolves through gaps.
  layers.push([pal.sheen, carve(skinBox, 6, 2.3, (x, y) => {
    if (!onSkin(x, y)) return false;
    const [, v] = uv(x, y);
    const centre = sheenCentre(x);
    return dither(x, y, 3) < Math.exp(-(((v - centre) / 0.3) ** 2)) * 0.85;
  })]);
  // Melanophore pattern: sharp-edged, with a cross-hatched core for depth.
  layers.push([pal.pigment, carve(skinBox, 50, 1.9, (x, y) => onSkin(x, y) && (mark(x, y) > threshold || eyeBar(x, y)))]);
  layers.push([pal.pigment, carve(skinBox, -50, 2.4, (x, y) => onSkin(x, y) && mark(x, y) > threshold + 0.22)]);

  // Fins: translucent tint, colour concentrated at the margin.
  const margins: Drawing = [];
  for (const poly of anatomy.fins) {
    if (poly.length < 3) continue;
    const fin = region(poly);
    const isPectoral = poly === anatomy.pectoral;
    const onFin = (x: number, y: number) => fin.has(x, y) && (isPectoral || !trunk.has(x, y)) && !headMask.has(x, y);
    layers.push([pal.fin, carve(fin.box, 72, 3, (x, y) => onFin(x, y) && dither(x, y, 6) < 0.5)]);
    if (settings.color_fin_margin) {
      margins.push(...carve(fin.box, 72, 1.6, (x, y) => onFin(x, y)
        && edgeDistance(poly, x, y) < 3.5 + noise(x * 0.05, y * 0.05, 8) * 2
        && edgeDistance(anatomy.outline, x, y) > 8));
    }
  }
  if (margins.length) layers.push([pal.accent, margins]);

  // Iris ring.
  const eyeBox = { x0: eye.x - eye.r, y0: eye.y - eye.r, x1: eye.x + eye.r, y1: eye.y + eye.r };
  layers.push([pal.accent, carve(eyeBox, 30, 1.3, (x, y) => {
    const d = Math.hypot(x - eye.x, y - eye.y);
    return d > eye.r * 0.45 && d < eye.r * 0.95;
  })]);

  const strokes: Drawing = [];
  const colors: string[] = [];
  for (const [color, lines] of layers) for (const line of lines) { strokes.push(line); colors.push(color); }
  return { strokes, colors, palette: pal };
}

/** Closed iso-contours of a scalar field (marching squares with segment chaining). */
export function contours(box: { x0: number; y0: number; x1: number; y1: number }, step: number, value: (x: number, y: number) => number, level: number): Polyline[] {
  const cols = Math.ceil((box.x1 - box.x0) / step) + 3, rows = Math.ceil((box.y1 - box.y0) / step) + 3;
  const ox = box.x0 - step, oy = box.y0 - step;
  const grid = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    // The outer ring is forced below the level so every contour closes.
    grid[j * cols + i] = i === 0 || j === 0 || i === cols - 1 || j === rows - 1 ? -1 : value(ox + i * step, oy + j * step);
  }
  const key = (a: Point) => `${a[0].toFixed(3)},${a[1].toFixed(3)}`;
  const cross = (i0: number, j0: number, i1: number, j1: number): Point => {
    const a = grid[j0 * cols + i0], b = grid[j1 * cols + i1], t = (level - a) / (b - a);
    return [ox + (i0 + (i1 - i0) * t) * step, oy + (j0 + (j1 - j0) * t) * step];
  };
  const next = new Map<string, Point>();
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const tl = grid[j * cols + i] > level, tr = grid[j * cols + i + 1] > level;
    const br = grid[(j + 1) * cols + i + 1] > level, bl = grid[(j + 1) * cols + i] > level;
    const top = () => cross(i, j, i + 1, j), right = () => cross(i + 1, j, i + 1, j + 1);
    const bottom = () => cross(i, j + 1, i + 1, j + 1), left = () => cross(i, j, i, j + 1);
    // Oriented so the inside stays on one side; saddles split consistently.
    const cases: Record<number, [() => Point, () => Point][]> = {
      1: [[bottom, left]], 2: [[right, bottom]], 3: [[right, left]], 4: [[top, right]],
      5: [[top, left], [bottom, right]], 6: [[top, bottom]], 7: [[top, left]], 8: [[left, top]],
      9: [[bottom, top]], 10: [[left, bottom], [right, top]], 11: [[right, top]], 12: [[left, right]],
      13: [[bottom, right]], 14: [[left, bottom]],
    };
    const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    for (const [from, to] of cases[code] ?? []) {
      const a = from(), b = to();
      next.set(key(a), b);
    }
  }
  const loops: Polyline[] = [];
  const seen = new Set<string>();
  for (const [startKey, startPoint] of next) {
    if (seen.has(startKey)) continue;
    const loop: Polyline = [];
    let k = startKey, p: Point | undefined = startPoint;
    while (p && !seen.has(k)) {
      seen.add(k);
      loop.push(p);
      k = key(p);
      p = next.get(k);
    }
    if (loop.length > 5) loops.push(loop);
  }
  return loops;
}

export interface Wash { poly: Polyline; color: string; opacity: number; bleed: number; texture: number }
export interface Mark { points: Polyline; color: string; weight: number }
export interface PaintPlan { washes: Wash[]; marks: Mark[]; palette: Palette }

/** Watercolour plan for p5.brush: the same fields, now as wash polygons. The
 * pigment pattern is contoured, so each blob is a wash whose shape still comes
 * from the cell simulation, and each wash then dries with its own bleed. */
export function paintPlan(anatomy: ColorAnatomy, settings: ColorSettings, seed: number): PaintPlan {
  const f = colorFields(anatomy, settings, seed);
  const { pal, body, eye, contrast } = f;
  const washes: Wash[] = [];
  const marks: Mark[] = [];
  const along = (from: number, count: number, v: (u: number, x: number) => number): Polyline =>
    Array.from({ length: count }, (_, i) => {
      const u = from + (1 - from) * i / (count - 1);
      const x = body.point(u, 0)[0];
      return body.point(u, v(u, x));
    });
  const rearOfHead = Math.max(0, (f.head.box.x1 - f.x0) / body.length - 0.04);
  const top = along(rearOfHead, 40, () => -1);
  const edge = along(rearOfHead, 40, (_, x) => f.backEdge(x));
  washes.push({ poly: [...along(rearOfHead, 40, () => 1), ...edge.slice().reverse()], color: pal.belly, opacity: 70, bleed: 0.12, texture: 0.3 });
  washes.push({ poly: [...top, ...edge.slice().reverse()], color: pal.back, opacity: 80 + 70 * contrast, bleed: 0.2, texture: 0.5 });
  const sheenTop = along(rearOfHead, 40, (_, x) => f.sheenCentre(x) - 0.22);
  const sheenBottom = along(rearOfHead, 40, (_, x) => f.sheenCentre(x) + 0.22);
  washes.push({ poly: [...sheenTop, ...sheenBottom.reverse()], color: pal.sheen, opacity: 60, bleed: 0.3, texture: 0.2 });
  washes.push({ poly: anatomy.head, color: pal.back, opacity: 55 + 40 * contrast, bleed: 0.1, texture: 0.4 });
  for (const poly of contours(f.skinBox, 2.5, (x, y) => f.onSkin(x, y) ? Math.max(f.mark(x, y), f.eyeBar(x, y) ? 1 : 0) : 0, f.threshold)) {
    washes.push({ poly, color: pal.pigment, opacity: 120 + 80 * contrast, bleed: 0.08, texture: 0.6 });
  }
  for (const poly of anatomy.fins) {
    if (poly.length < 3) continue;
    washes.push({ poly, color: pal.fin, opacity: 45, bleed: 0.25, texture: 0.3 });
    if (!settings.color_fin_margin) continue;
    // Margins: the stretches of fin outline that stand clear of the body.
    let run: Polyline = [];
    for (const p of [...poly, poly[0]]) {
      const free = edgeDistance(anatomy.outline, p[0], p[1]) > 8 && !f.headMask.has(p[0], p[1]);
      if (free) run.push(p);
      else { if (run.length > 3) marks.push({ points: run, color: pal.accent, weight: 1.6 }); run = []; }
    }
    if (run.length > 3) marks.push({ points: run, color: pal.accent, weight: 1.6 });
  }
  const iris = Array.from({ length: 24 }, (_, i): Point => [eye.x + Math.cos(i / 24 * Math.PI * 2) * eye.r * 0.95, eye.y + Math.sin(i / 24 * Math.PI * 2) * eye.r * 0.95]);
  washes.push({ poly: iris, color: pal.accent, opacity: 170, bleed: 0.05, texture: 0.2 });
  return { washes, marks, palette: pal };
}
