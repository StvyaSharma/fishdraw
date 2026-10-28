import type { RegionId } from './anatomy.ts';

export const motifs = ['stripes', 'bars', 'spots', 'rings', 'reticulation', 'labyrinth'] as const;
export type Motif = typeof motifs[number];
export type Solver = 'procedural' | 'turing' | 'gray-scott';
export interface Palette { base: string; dark: string; yellow: string; red: string; reflective: string; white: string; iris: string }
export const palettes = {
  silver: { label: 'Silver · countershaded', base: '#94afa6', dark: '#243f47', yellow: '#c8b576', red: '#b65749', reflective: '#b9dfdf', white: '#f5eee1', iris: '#d8ac4a' },
  gold: { label: 'Golden · warm pigments', base: '#d7af62', dark: '#594136', yellow: '#edbf43', red: '#c44f35', reflective: '#dce3b6', white: '#f7e9c6', iris: '#9b6e24' },
  reef: { label: 'Reef · blue and yellow', base: '#58aab7', dark: '#193f72', yellow: '#f2c541', red: '#ed7856', reflective: '#b8e8dd', white: '#fbf0cf', iris: '#e8b859' },
  koi: { label: 'Red and white patches', base: '#e8dfd0', dark: '#343637', yellow: '#e9b477', red: '#d64d36', reflective: '#cedde0', white: '#fff6df', iris: '#a0914a' },
  trout: { label: 'Trout · olive and rose', base: '#9da87c', dark: '#35443a', yellow: '#c9b35d', red: '#d7818d', reflective: '#c7e0d4', white: '#f4e8d3', iris: '#bd9745' },
  mackerel: { label: 'Mackerel · silver and blue', base: '#7aafa9', dark: '#164955', yellow: '#b1b78a', red: '#b08b77', reflective: '#c9e3e2', white: '#f0eddd', iris: '#bca54b' },
  zebra: { label: 'Danio · dark and gold', base: '#c5be7f', dark: '#293f59', yellow: '#dcc365', red: '#c8784f', reflective: '#d1e6d9', white: '#f6edcd', iris: '#d6bd5d' },
  mandarin: { label: 'Mandarin · blue and orange', base: '#369a9b', dark: '#254479', yellow: '#eec349', red: '#e77d32', reflective: '#68d1c3', white: '#e5e5b2', iris: '#cc9834' },
} satisfies Record<string, Palette & { label: string }>;
export type PaletteId = keyof typeof palettes;
export interface RegionStyle {
  palette: PaletteId | 'inherit';
  opacity: number; scale: number; phase: number; coupling: number;
  melanin: number; yellow: number; red: number; reflective: number; white: number;
  rim: number; rays: number;
}
export interface ColorSettings {
  enabled: boolean;
  medium: 'flat' | 'watercolor';
  seed: string;
  palette: PaletteId;
  motif: Motif;
  solver: Solver;
  frequency: number;
  warp: number;
  coverage: number;
  orientation: number;
  anatomyCoupling: number;
  pigmentCoupling: number;
  countershade: number;
  melanin: number; yellow: number; red: number; reflective: number; white: number;
  light: number;
  finTransparency: number;
  cheek: number;
  lateral: number;
  ocellus: number;
  ink: number;
  bleed: number;
  grain: number;
  pooling: number;
  iterations: number;
  feed: number;
  kill: number;
  anisotropy: number;
  regions: Record<RegionId, RegionStyle>;
}
export const regionIds: RegionId[] = ['body', 'head', 'dorsal', 'pectoral', 'pelvic', 'anal', 'caudal', 'finlets', 'jaw'];
export function defaultColorSettings(): ColorSettings {
  const region = (fin: boolean): RegionStyle => ({ palette: 'inherit', opacity: 1, scale: 1, phase: 0, coupling: 1,
    melanin: fin ? 0.7 : 1, yellow: 1, red: 1, reflective: fin ? 0.4 : 1, white: 1,
    rim: fin ? 0.55 : 0, rays: fin ? 0.35 : 0 });
  return {
    enabled: false, medium: 'watercolor', seed: 'pigment', palette: 'silver', motif: 'stripes', solver: 'procedural',
    frequency: 6, warp: 0.45, coverage: 0.4, orientation: 0,
    anatomyCoupling: 0.75, pigmentCoupling: 0.65, countershade: 0.7,
    melanin: 0.65, yellow: 0.3, red: 0.1, reflective: 0.45, white: 0.35,
    light: 0.35, finTransparency: 0.3, cheek: 0.25, lateral: 0.25, ocellus: 1, ink: 0.8,
    bleed: 0.2, grain: 0.4, pooling: 0.25,
    iterations: 600, feed: 0.0367, kill: 0.0649, anisotropy: 0.25,
    regions: Object.fromEntries(regionIds.map(id => [id, region(!['body', 'head', 'jaw'].includes(id))])) as Record<RegionId, RegionStyle>,
  };
}

/** Reject invalid public input before allocating grids or emitting SVG attributes. */
export function validateColorSettings(s: ColorSettings): void {
  if (!Object.hasOwn(palettes, s.palette) || !motifs.includes(s.motif) || !['procedural', 'turing', 'gray-scott'].includes(s.solver) || !['flat', 'watercolor'].includes(s.medium)) throw new Error('Unknown color option.');
  if (typeof s.seed !== 'string' || s.seed.length > 1024) throw new Error('Invalid color seed.');
  const range = (value: number, min: number, max: number) => { if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Color parameter must be between ${min} and ${max}.`); };
  for (const key of ['warp', 'coverage', 'anatomyCoupling', 'pigmentCoupling', 'countershade', 'melanin', 'yellow', 'red', 'reflective', 'white', 'light', 'finTransparency', 'cheek', 'lateral', 'ocellus', 'ink', 'bleed', 'grain', 'pooling', 'anisotropy'] as const) range(s[key], 0, 1);
  range(s.frequency, 2, 16); range(s.orientation, -90, 90); range(s.iterations, 100, 1000); range(s.feed, 0.01, 0.08); range(s.kill, 0.03, 0.08);
  for (const id of regionIds) {
    const r = s.regions[id];
    if (!r) throw new Error(`Missing color region: ${id}.`);
    if (r.palette !== 'inherit' && !Object.hasOwn(palettes, r.palette)) throw new Error('Unknown regional palette.');
    for (const key of ['opacity', 'coupling', 'melanin', 'yellow', 'red', 'reflective', 'white', 'rim', 'rays'] as const) range(r[key], 0, 1);
    range(r.scale, 0.5, 2); range(r.phase, 0, 1);
  }
}
