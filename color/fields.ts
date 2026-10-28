import type { Anatomy, Region } from './anatomy.ts';
import { bodyCoordinates, bounds, distanceToPath } from './anatomy.ts';
import type { ColorSettings, Motif } from './settings.ts';
import { clamp, hash, mix, noise, seedNumber, smooth } from './noise.ts';
import { reactionField, sampleField } from './solver.ts';

export type Pigment = 'base' | 'shade' | 'yellow' | 'red' | 'melanin' | 'reflective' | 'white' | 'rim' | 'rays' | 'operculum';
export type Coverage = Record<Pigment, number>;

/** Procedural motifs are visual constructions, not developmental models. */
export function proceduralPattern(u: number, v: number, motif: Motif, frequency: number, warp: number, angle: number, seed: number): number {
  const a = angle * Math.PI / 180;
  let x = (u * 3.2 * Math.cos(a) - v * Math.sin(a)) * frequency;
  let y = (u * 3.2 * Math.sin(a) + v * Math.cos(a)) * frequency;
  const wx = noise(x * 0.35, y * 0.35, seed) - 0.5;
  const wy = noise(x * 0.35 + 11, y * 0.35 - 7, seed + 5) - 0.5;
  x += wx * warp * 3; y += wy * warp * 3;
  if (motif === 'stripes') return (Math.sin(y * Math.PI) + 1) / 2;
  if (motif === 'bars') return (Math.sin(x * Math.PI) + 1) / 2;
  if (motif === 'labyrinth') return (Math.sin(noise(x * 0.25, y * 0.25, seed + 9) * 22) + 1) / 2;
  let first = Infinity, second = Infinity;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = Math.floor(x) + i, cy = Math.floor(y) + j;
    const dx = cx + hash(cx, cy, seed) - x, dy = cy + hash(cx, cy, seed + 1) - y;
    const distance = Math.hypot(dx, dy);
    if (distance < first) { second = first; first = distance; } else if (distance < second) second = distance;
  }
  if (motif === 'spots') return 1 - smooth(0.05, 0.65, first);
  if (motif === 'rings') return 1 - smooth(0.02, 0.25, Math.abs(first - 0.36));
  return 1 - smooth(0.01, 0.3, second - first);
}

export function createPigmentSampler(anatomy: Anatomy, s: ColorSettings) {
  const seed = seedNumber(s.seed), field = s.solver === 'procedural' ? null : reactionField(anatomy, s);
  const spot = anatomy.ocellus.length ? bounds(anatomy.ocellus) : null;
  const regionBounds = new Map(anatomy.regions.map(r => [r, bounds(r.outline)]));
  return (region: Region, x: number, y: number): Coverage => {
    const style = s.regions[region.id], box = regionBounds.get(region)!;
    const [u, v] = bodyCoordinates(anatomy, x, y);
    const lu = (x - box.x) / Math.max(1, box.right - box.x), lv = (y - box.y) / Math.max(1, box.bottom - box.y);
    const fin = !['body', 'head', 'jaw'].includes(region.id);
    const localSeed = seed + seedNumber(region.id);
    const local = proceduralPattern(lu + style.phase, lv, s.motif, s.frequency * style.scale, s.warp, s.orientation, localSeed);
    const shared = field ? sampleField(field, x, y) : proceduralPattern(u + style.phase, v, s.motif, s.frequency * style.scale, s.warp, s.orientation, seed);
    const rootDistance = region.root.length ? distanceToPath([x, y], region.root) : 0;
    const fade = fin ? 1 - 0.75 * smooth(0, Math.max(10, (box.bottom - box.y + box.right - box.x) * 0.35), rootDistance) : 1;
    const correlation = region.id === 'body' ? style.coupling : s.anatomyCoupling * style.coupling * fade;
    // A PDE supplies the shared field; local analytic modulation is explicitly
    // spatial correlation, distinct from conservative exchange in solver.ts.
    const signal = field
      // A disconnected PDE region still owns a simulated field. Zero seam
      // exchange must not silently switch its renderer back to analytic noise.
      ? mix(shared, local, (1 - style.coupling) * 0.35)
      : mix(local, shared, correlation);
    const edge = 1 - s.coverage;
    const spotRadius = spot ? Math.hypot((x - (spot.x + spot.right) / 2) / ((spot.right - spot.x) / 2), (y - (spot.y + spot.bottom) / 2) / ((spot.bottom - spot.y) / 2)) : Infinity;
    const inSpot = region.id === 'body' && spotRadius < 1;
    const spotCenter = inSpot ? (1 - smooth(0.55, 0.7, spotRadius)) * s.ocellus : 0;
    const spotRing = inSpot ? smooth(0.55, 0.75, spotRadius) * s.ocellus : 0;
    const mark = mix(smooth(edge - 0.08, edge + 0.08, signal), spotCenter, inSpot ? s.ocellus : 0);
    const ownWarm = noise(u * 10 + 21, v * 6, seed + 37);
    const ownRed = smooth(0.35, 0.7, noise(u * 6 - 2, v * 4 + 4, seed + 71));
    // Evaluate all uncoupled channels first, then use frozen coverages. This is
    // artistic pigment occupancy, not a simulation of chromatophore chemistry.
    const warm = mix(ownWarm, 1 - mark, s.pigmentCoupling);
    const red = mix(ownRed, ownRed * (1 - mark), s.pigmentCoupling);
    const dorsal = 1 - smooth(0.05, 0.85, v);
    const ventral = smooth(0.48, 1, v);
    const sheen = Math.exp(-(((v - (0.23 + s.light * 0.35)) / 0.16) ** 2));
    const glint = smooth(0.62, 0.85, noise(u * 110, v * 35, seed + 90));
    const rim = fin ? 1 - smooth(0.5, 2.7, distanceToPath([x, y], [...region.outline, region.outline[0]])) : 0;
    const root = region.root[Math.floor(region.root.length / 2)] ?? [box.x, (box.y + box.bottom) / 2];
    const rayAngle = Math.atan2(y - root[1], x - root[0]);
    const ray = fin ? smooth(0.75, 0.98, (Math.cos(rayAngle * 32) + 1) / 2) * smooth(2, 12, rootDistance) : 0;
    const opacity = style.opacity * (fin ? 1 - s.finTransparency : 1);
    return {
      base: opacity,
      shade: opacity * s.countershade * dorsal * 0.55,
      melanin: opacity * s.melanin * style.melanin * mark * (1 - s.countershade * ventral * 0.65),
      yellow: opacity * s.yellow * style.yellow * warm * (0.4 + dorsal * 0.6),
      red: opacity * s.red * style.red * red,
      reflective: opacity * s.reflective * style.reflective * (sheen * 0.55 + glint * 0.35) * (1 - mark * s.pigmentCoupling * 0.8),
      white: opacity * Math.max(spotRing, s.white * style.white * ventral * (0.55 + 0.45 * (1 - mark))),
      rim: opacity * style.rim * rim,
      rays: opacity * style.rays * ray * 0.6,
      operculum: region.id === 'head' ? opacity * s.cheek * Math.exp(-((distanceToPath([x, y], anatomy.gill) / Math.max(3, (box.right - box.x) * 0.16)) ** 2)) * smooth(0.25, 0.9, lv) : 0,
    };
  };
}
