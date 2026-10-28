export { generate_scene, type FishScene } from '../fishdraw.ts';
export { defaultColorSettings, palettes, motifs, regionIds, validateColorSettings } from './settings.ts';
export type { ColorSettings, RegionStyle, Palette, PaletteId, Motif, Solver } from './settings.ts';
export type { Anatomy, Region, RegionId } from './anatomy.ts';
export { createPaintPlan } from './plan.ts';
export type { PaintPlan, PigmentLayer, RegionPaint, CoverageBand } from './plan.ts';
export { draw_colored_svg, planSvg } from './svg.ts';
