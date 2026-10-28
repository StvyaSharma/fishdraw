export const clamp = (x: number, low = 0, high = 1) => Math.max(low, Math.min(high, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function hash(x: number, y: number, seed: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function seedNumber(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const sx = x - ix, sy = y - iy;
  const u = sx * sx * (3 - 2 * sx), v = sy * sy * (3 - 2 * sy);
  return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), u), mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), u), v);
}
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a || 1)); return t * t * (3 - 2 * t); };
