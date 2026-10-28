import type { FishScene, Polyline } from '../fishdraw.ts';
import { bounds, contains, type Region } from './anatomy.ts';
import { createPigmentSampler, type Pigment } from './fields.ts';
import { palettes, validateColorSettings, type ColorSettings, type Palette } from './settings.ts';

export interface CoverageBand { opacity: number; path: string }
export interface PigmentLayer { id: Pigment; color: string; bands: CoverageBand[] }
export interface RegionPaint { region: Region; layers: PigmentLayer[] }
export interface PaintPlan { regions: RegionPaint[]; palette: Palette; settings: ColorSettings; scene: FishScene }
export const layerOrder: Pigment[] = ['base', 'shade', 'yellow', 'red', 'melanin', 'reflective', 'white', 'operculum', 'rim', 'rays'];
export const pathData = (line: Polyline, close = true) => line.length ? `M${line.map(p => p.map(n => Number(n.toFixed(3))).join(',')).join('L')}${close ? 'Z' : ''}` : '';

/** Quantized coverage masks with horizontal run merging: compact vector output
 * and identical pigment masks for SVG and watercolor compositing. */
export function createPaintPlan(scene: FishScene, settings: ColorSettings): PaintPlan {
  validateColorSettings(settings);
  const palette = palettes[settings.palette];
  const sample = createPigmentSampler(scene.anatomy, settings);
  const layerColors = (palette: Palette): Record<Pigment, string> => ({ base: palette.base, shade: palette.dark, melanin: palette.dark,
    yellow: palette.yellow, red: palette.red, reflective: palette.reflective, white: palette.white,
    rim: palette.dark, rays: palette.white, operculum: palette.red });
  const cell = 2.5, levels = 12;
  const regions = scene.anatomy.regions.map(region => {
    const colors = layerColors(settings.regions[region.id].palette === 'inherit' ? palette : palettes[settings.regions[region.id].palette as keyof typeof palettes]);
    const b = bounds(region.outline);
    const bins = Object.fromEntries(layerOrder.map(id => [id, Array.from({ length: levels + 1 }, () => '')])) as Record<Pigment, string[]>;
    const minX = Math.floor(b.x / cell), minY = Math.floor(b.y / cell);
    const maxX = Math.ceil(b.right / cell), maxY = Math.ceil(b.bottom / cell);
    for (let y = minY; y < maxY; y++) {
      const row = new Map<Pigment, { level: number; start: number }>();
      for (let x = minX; x <= maxX; x++) {
        const px = (x + 0.5) * cell, py = (y + 0.5) * cell;
        const coverage = x < maxX && contains(region.outline, px, py) ? sample(region, px, py) : null;
        for (const id of layerOrder) {
          if (id === 'base') continue;
          const level = coverage ? Math.round(coverage[id] * levels) : 0;
          const previous = row.get(id);
          if (previous && previous.level !== level) {
            if (previous.level > 0) bins[id][previous.level] += `M${previous.start * cell},${y * cell}h${(x - previous.start) * cell}v${cell}h${-(x - previous.start) * cell}Z`;
            row.set(id, { level, start: x });
          } else if (!previous) row.set(id, { level, start: x });
        }
      }
    }
    const fin = !['body', 'head', 'jaw'].includes(region.id);
    const layers = layerOrder.map(id => ({ id, color: colors[id], bands: id === 'base'
      ? [{ opacity: settings.regions[region.id].opacity * (fin ? 1 - settings.finTransparency : 1), path: pathData(region.outline) }]
      : bins[id].flatMap((path, level) => path ? [{ opacity: level / levels, path }] : []) }));
    return { region, layers: layers.filter(layer => layer.bands.some(band => band.opacity > 0)) };
  });
  return { regions, palette, settings, scene };
}
