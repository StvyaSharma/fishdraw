import { bodyShapes } from './shapes.ts';
import { surfaceTextures } from './textures.ts';
import { bodyMarkings } from './markings.ts';
import { tailShapes } from './tails.ts';
import type { FishTraitExtensions } from './types.ts';

export { bodyShapes, surfaceTextures, bodyMarkings, tailShapes };
export type { BodyFrame, TraitContext, ShapeContext, ShapeTrait, SurfaceTrait, TailTrait, FishTraitExtensions } from './types.ts';

/** Shared catalog for render dispatch, controls, CLI validation, and tests. */
export const fishTraits = {
  shapes: bodyShapes,
  textures: surfaceTextures,
  markings: bodyMarkings,
  tails: tailShapes,
};

export function resolveTraits(extensions: FishTraitExtensions = {}) {
  function merge<T extends { id: number; key: string; label: string; render?: unknown }>(base: readonly T[], extra: readonly T[] = []): readonly T[] {
    const result = [...base];
    for (const entry of extra) {
      if (!Number.isInteger(entry.id) || entry.id < 0 || !entry.key || !entry.label || typeof entry.render !== 'function') {
        throw new Error('An extension needs a nonnegative integer ID, key, label, and renderer.');
      }
      if (result.some(t => t.id === entry.id || t.key === entry.key)) {
        throw new Error(`Trait ID or key already registered: ${entry.key} (${entry.id}).`);
      }
      result.push(entry);
    }
    return result;
  }
  return {
    shapes: merge(bodyShapes, extensions.shapes),
    textures: merge(surfaceTextures, extensions.textures),
    markings: merge(bodyMarkings, extensions.markings),
    tails: merge(tailShapes, extensions.tails),
  };
}

export function traitById<T extends { id: number }>(entries: readonly T[], id: number): T {
  const entry = entries.find(t => t.id === id);
  if (!entry) throw new Error(`Unknown trait ID: ${id}.`);
  return entry;
}

export function traitOptions(entries: readonly { id: number; label: string }[]) {
  return entries.map(({ id, label }) => ({ value: String(id), label }));
}
