import type { FishAnatomy, Polyline, StrokeTag } from '../fishdraw.ts';
import { colourAnatomy } from './anatomy.ts';
import { inkStyles, palette, paletteFamilies } from './palette.ts';
import { hash, stream, valueNoise } from './random.ts';
import { Stage, type ColourEffect, type GeneSpec, type Genes, type PaintPlan, type PlanStep, type StagedLayers } from './types.ts';
import { ground } from './effects/ground.ts';
import { countershade } from './effects/countershade.ts';
import { blush } from './effects/blush.ts';
import { sheen } from './effects/sheen.ts';
import { pigment } from './effects/pigment.ts';
import { eyeBar } from './effects/eyebar.ts';
import { fins } from './effects/fins.ts';
import { eye } from './effects/eye.ts';
import { speckle } from './effects/speckle.ts';
import { ink } from './effects/ink.ts';

export type { ColourEffect, GeneSpec, Genes, PaintLayer, PaintPlan, PlanStep } from './types.ts';
export { paletteFamilies } from './palette.ts';

/** Painting order is set by each layer's stage, not by this list; the list only
 * decides which effects exist. Add an effect by appending it here (or passing
 * your own list) — no other module needs to change. */
export const colourEffects: readonly ColourEffect[] = [ground, countershade, blush, sheen, pigment, eyeBar, fins, eye, speckle, ink];

export const PAPER = '#fffaf0';

/** Genes every effect shares: the palette, and how the paint behaves. */
export const paletteGenes: readonly GeneSpec[] = [
  { key: 'family', label: 'Palette', kind: 'choice', options: paletteFamilies, sample: r => r.pick(paletteFamilies.map(f => f.id), [4, 3, 2, 2, 2, 2, 2, 1]) },
  { key: 'hueShift', label: 'Hue shift', kind: 'range', min: -30, max: 30, step: 1, sample: r => Math.round(r.tri(-20, 0, 20)) },
  { key: 'saturation', label: 'Saturation', kind: 'range', min: 0.3, max: 1.6, step: 0.05, sample: r => r.tri(0.55, 1, 1.4) },
  { key: 'depth', label: 'Depth of tone', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0, 0.35, 1) },
  { key: 'ink', label: 'Ink', kind: 'choice', options: inkStyles, sample: r => r.pick([0, 1, 2, 3], [3, 2, 1, 2]) },
];
export const styleGenes: readonly GeneSpec[] = [
  { key: 'contrast', label: 'Contrast', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.2, 0.6, 1) },
  { key: 'wetness', label: 'Wetness', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.1, 0.45, 0.95) },
  { key: 'granulation', label: 'Granulation', kind: 'range', min: 0, max: 1, step: 0.05, sample: r => r.tri(0.1, 0.5, 1) },
];

export interface GeneGroup { key: string; label: string; genes: readonly GeneSpec[] }

export function geneGroups(effects: readonly ColourEffect[] = colourEffects): GeneGroup[] {
  return [
    { key: 'palette', label: 'Palette', genes: paletteGenes },
    { key: 'style', label: 'Paint', genes: styleGenes },
    ...effects.filter(e => e.genes.length).map(e => ({ key: e.key, label: e.label, genes: e.genes })),
  ];
}

/** A seed's colour genotype. Each group samples from its own stream, so adding
 * an effect never changes the genes of the others. */
export function colourGenes(seed: string, effects: readonly ColourEffect[] = colourEffects): Genes {
  const genes: Genes = {};
  for (const group of geneGroups(effects)) {
    const random = stream(seed, `genes:${group.key}`);
    for (const gene of group.genes) genes[`${group.key}.${gene.key}`] = gene.sample(random);
  }
  return genes;
}

function scoped(genes: Genes, group: string, specs: readonly GeneSpec[]) {
  const random = stream('defaults', group);
  return Object.fromEntries(specs.map(g => [g.key, genes[`${group}.${g.key}`] ?? g.sample(random)]));
}

export interface ColourInput { anatomy: FishAnatomy; polylines: Polyline[]; tags: StrokeTag[] }

/** The complete painting as plain data: ordered layers with dry steps between stages. */
export function colourPlan(fish: ColourInput, genes: Genes, seed: string, effects: readonly ColourEffect[] = colourEffects): PaintPlan {
  const anatomy = colourAnatomy(fish.anatomy);
  const pg = scoped(genes, 'palette', paletteGenes);
  const style = scoped(genes, 'style', styleGenes) as EffectStyle;
  const pal = palette({ family: pg.family, hueShift: pg.hueShift, saturation: pg.saturation, depth: pg.depth, ink: pg.ink });
  const staged: StagedLayers[] = [];
  for (const effect of effects) {
    const own = scoped(genes, effect.key, effect.genes);
    if (effect.active && !effect.active(own)) continue;
    staged.push(...effect.paint({
      anatomy, palette: pal, genes: own, style,
      random: stream(seed, `paint:${effect.key}`), noise: valueNoise(hash(`${seed}\u0000noise:${effect.key}`)),
      ink: { polylines: fish.polylines, tags: fish.tags },
    }));
  }
  // Stable sort keeps each effect's layers in the order it gave them.
  const ordered = staged.map((s, i) => ({ ...s, i })).sort((a, b) => a.stage - b.stage || a.i - b.i);
  // Wet paper lets the shading run into the ground wash, and very wet paper
  // lets the pattern feather into both.
  const wetInto = (from: number, to: number) =>
    (from === Stage.ground && to === Stage.shade && style.wetness > 0.5)
    || (from === Stage.shade && to === Stage.pattern && style.wetness > 0.8);
  const steps: PlanStep[] = [];
  let last: number | null = null;
  for (const { stage, layers } of ordered) {
    if (!layers.length) continue;
    if (last !== null && last !== stage && !wetInto(last, stage)) steps.push({ kind: 'dry' });
    steps.push(...layers);
    last = stage;
  }
  return { steps, palette: pal, paper: PAPER };
}

type EffectStyle = { contrast: number; wetness: number; granulation: number };
