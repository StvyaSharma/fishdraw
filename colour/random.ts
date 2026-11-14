/** Seeded randomness for the colour system. Every gene group and every effect
 * draws from its own named stream, so adding, removing or reordering one never
 * shifts another — and none of them touch the line-work generator. */

/** FNV-1a: a stable 32-bit hash of a string. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Random {
  private state: number;
  constructor(seed: number) {
    // Mix once so nearby seeds diverge immediately.
    let s = (seed ^ 0x9e3779b9) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
    this.state = ((s ^ (s >>> 16)) >>> 0) || 0x5eed;
  }
  /** Uniform in [0, 1). xorshift32. */
  next(): number {
    let s = this.state;
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    this.state = s >>> 0;
    return this.state / 4294967296;
  }
  range(min: number, max: number) { return min + (max - min) * this.next(); }
  chance(p: number) { return this.next() < p; }
  /** Triangular distribution: values cluster around the mode, never leave [min, max]. */
  tri(min: number, mode: number, max: number) {
    const r = this.next(), f = (mode - min) / (max - min);
    return r < f ? min + Math.sqrt(r * (max - min) * (mode - min)) : max - Math.sqrt((1 - r) * (max - min) * (max - mode));
  }
  /** Weighted choice; equal weights when none are given. */
  pick<T>(entries: readonly T[], weights?: readonly number[]): T {
    const w = weights ?? entries.map(() => 1);
    let r = this.next() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < entries.length; i++) if ((r -= w[i]) <= 0) return entries[i];
    return entries[entries.length - 1];
  }
}

/** The stream for one named channel of a seed, e.g. `stream(seed, 'genes:pigment')`. */
export function stream(seed: string, channel: string) {
  return new Random(hash(`${seed}\u0000${channel}`));
}

export type Noise = (x: number, y: number, z?: number) => number;

/** Hashed value noise in [0, 1): continuous, seeded, and stateless. */
export function valueNoise(seed: number): Noise {
  const lattice = (x: number, y: number, z: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + Math.imul(seed, 144269504)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const octave = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    const layer = (k: number) => lerp(
      lerp(lattice(xi, yi, k), lattice(xi + 1, yi, k), u),
      lerp(lattice(xi, yi + 1, k), lattice(xi + 1, yi + 1, k), u), v);
    return lerp(layer(zi), layer(zi + 1), w);
  };
  return (x, y, z = 0) => octave(x, y, z) * 0.57 + octave(x * 2, y * 2, z + 17) * 0.29 + octave(x * 4, y * 4, z + 31) * 0.14;
}
