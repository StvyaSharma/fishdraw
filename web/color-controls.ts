import type { DialConfig, ResolvedValues } from 'dialkit';
import { defaultColorSettings, palettes, motifs, regionIds, validateColorSettings, type ColorSettings, type RegionStyle, type PaletteId, type Motif, type Solver } from '../color/settings.ts';

const paletteOptions = Object.entries(palettes).map(([value, p]) => ({ value, label: p.label }));
function regionConfig(r: RegionStyle) {
  return {
    _collapsed: true,
    palette: { type: 'select', options: [{ value: 'inherit', label: 'Shared palette' }, ...paletteOptions], default: r.palette },
    opacity: [r.opacity, 0, 1, 0.05],
    scale: [r.scale, 0.5, 2, 0.05],
    phase: [r.phase, 0, 1, 0.05],
    coupling: [r.coupling, 0, 1, 0.05],
    melanin: [r.melanin, 0, 1, 0.05], yellow: [r.yellow, 0, 1, 0.05], red: [r.red, 0, 1, 0.05],
    reflective: [r.reflective, 0, 1, 0.05], white: [r.white, 0, 1, 0.05],
    rim: [r.rim, 0, 1, 0.05], rays: [r.rays, 0, 1, 0.05],
  } satisfies DialConfig;
}
export function colorConfig() {
  const s = defaultColorSettings();
  return {
    _collapsed: true,
    enabled: s.enabled,
    medium: { type: 'select', options: [{ value: 'flat', label: 'Vector color' }, { value: 'watercolor', label: 'p5.brush watercolor' }], default: s.medium },
    palette: { type: 'select', options: paletteOptions, default: s.palette },
    colorSeed: { type: 'text', default: s.seed },
    pattern: {
      _collapsed: true,
      motif: { type: 'select', options: [...motifs], default: s.motif },
      solver: { type: 'select', options: [
        { value: 'procedural', label: 'Procedural motifs' }, { value: 'turing', label: 'Turing · Schnakenberg' }, { value: 'gray-scott', label: 'Gray–Scott · reaction–diffusion' },
      ], default: s.solver },
      frequency: [s.frequency, 2, 16, 0.5], warp: [s.warp, 0, 1, 0.05], coverage: [s.coverage, 0, 1, 0.05],
      orientation: [s.orientation, -90, 90, 5],
      anatomyCoupling: [s.anatomyCoupling, 0, 1, 0.05], pigmentCoupling: [s.pigmentCoupling, 0, 1, 0.05],
    },
    pigments: {
      _collapsed: true,
      countershade: [s.countershade, 0, 1, 0.05], melanin: [s.melanin, 0, 1, 0.05], yellow: [s.yellow, 0, 1, 0.05],
      red: [s.red, 0, 1, 0.05], reflective: [s.reflective, 0, 1, 0.05], white: [s.white, 0, 1, 0.05],
      light: [s.light, 0, 1, 0.05], finTransparency: [s.finTransparency, 0, 1, 0.05], cheek: [s.cheek, 0, 1, 0.05], lateral: [s.lateral, 0, 1, 0.05], ocellus: [s.ocellus, 0, 1, 0.05],
    },
    regions: {
      _collapsed: true,
      ...Object.fromEntries(regionIds.map(id => [id, regionConfig(s.regions[id])])) as Record<typeof regionIds[number], ReturnType<typeof regionConfig>>,
    },
    paint: {
      _collapsed: true,
      ink: [s.ink, 0, 1, 0.05], bleed: [s.bleed, 0, 1, 0.05], grain: [s.grain, 0, 1, 0.05], pooling: [s.pooling, 0, 1, 0.05],
    },
    reactionDiffusion: {
      _collapsed: true,
      iterations: [s.iterations, 100, 1000, 50], feed: [s.feed, 0.01, 0.08, 0.001], kill: [s.kill, 0.03, 0.08, 0.001], anisotropy: [s.anisotropy, 0, 1, 0.05],
    },
  } satisfies DialConfig;
}
export type ColorControls = ResolvedValues<ReturnType<typeof colorConfig>>;
export function colorSettings(v: ColorControls): ColorSettings {
  const regions = defaultColorSettings().regions;
  for (const id of regionIds) regions[id] = { ...v.regions[id], palette: v.regions[id].palette as RegionStyle['palette'] };
  const s: ColorSettings = {
    ...defaultColorSettings(), enabled: v.enabled, medium: v.medium as ColorSettings['medium'], palette: v.palette as PaletteId, seed: v.colorSeed,
    ...v.pattern, motif: v.pattern.motif as Motif, solver: v.pattern.solver as Solver,
    ...v.pigments, ...v.paint, ...v.reactionDiffusion,
    regions,
  };
  validateColorSettings(s);
  return s;
}
