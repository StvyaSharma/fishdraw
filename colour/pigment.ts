import type { Random } from './random.ts';

/** Pigment cells as a two-cell automaton (Young 1984). Melanophores support
 * neighbours close by and suppress them further out — the short-range
 * attraction and long-range repulsion measured between zebrafish melanophores
 * and xanthophores (Nakamasu et al. 2009). One number, the inhibition weight,
 * moves the result between labyrinths and spots; stretching the kernel along
 * or across the body turns labyrinths into stripes or bars. Midway the sheet
 * is stretched, so marks split and new ones insert as the fish grows, as Kondo
 * & Asai (1995) observed in Pomacanthus. Returns a blurred density in 0..1. */

export interface CellRule {
  /** Long-range inhibition weight. */ w: number;
  /** Kernel stretch along (sx) and across (sy) the body. */ sx: number; sy: number;
  /** Starting fraction of melanophores. */ density: number;
}

export const cellRules = {
  spots: { w: 0.42, sx: 1, sy: 1, density: 0.25 },
  stripes: { w: 0.26, sx: 0.45, sy: 1.25, density: 0.5 },
  bars: { w: 0.26, sx: 1.25, sy: 0.45, density: 0.5 },
  labyrinth: { w: 0.3, sx: 1, sy: 1, density: 0.45 },
  network: { w: 0.5, sx: 1.1, sy: 1.1, density: 0.35 },
} satisfies Record<string, CellRule>;

export function pigmentCells(cols: number, rows: number, rule: CellRule, random: Random): Float32Array {
  const { w, sx, sy, density } = rule;
  const inner = 2.4, outer = 5.6;
  const kernel: [number, number, number][] = [];
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
    const d = Math.hypot(dx * sx, dy * sy);
    if (d < inner) kernel.push([dx, dy, 1]);
    else if (d < outer) kernel.push([dx, dy, -w]);
  }
  let width = Math.max(10, Math.round(cols * 0.6));
  let cells = new Uint8Array(width * rows).map(() => Number(random.next() < density));
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
    grown[y * cols + x] = random.next() < 0.12 ? 1 - v : v;
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
