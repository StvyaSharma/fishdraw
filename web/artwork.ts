import { generate, type Drawing, type FishParams } from '../fishdraw.ts';
import { colourPlan, type Genes, type PaintPlan } from '../colour/index.ts';
import { engrave } from '../colour/engrave.ts';
import { serialize } from '../formats.ts';
import type { View } from './view.ts';

export interface ArtworkRequest { seed: string; params: FishParams; genes: Genes; view: View }
export type Artwork =
  | { kind: 'painting'; plan: PaintPlan }
  | { kind: 'svg'; svg: string; drawing: Drawing; colors?: string[] };

// Colour edits do not change the fish: keep the last one instead of regenerating it.
let last: { key: string; fish: ReturnType<typeof generate> } | null = null;
function fishFor(seed: string, params: FishParams) {
  const key = JSON.stringify([seed, params]);
  if (last?.key !== key) last = { key, fish: generate(seed, params) };
  return last.fish;
}

/** Everything the editor shows, computed from plain data so it can run in a worker. */
export function artwork({ seed, params, genes, view }: ArtworkRequest): Artwork {
  const fish = fishFor(seed, params);
  if (view === 'lines') return { kind: 'svg', svg: serialize(fish.polylines, 'svg'), drawing: fish.polylines };
  const plan = colourPlan(fish, genes, seed);
  if (view === 'watercolour') return { kind: 'painting', plan };
  const { strokes, colors } = engrave(plan);
  return { kind: 'svg', svg: serialize(strokes, 'svg', 1, colors), drawing: strokes, colors };
}
