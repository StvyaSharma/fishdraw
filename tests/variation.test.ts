import { expect, test } from 'bun:test';
import { default_params, fish, parameters_for_seed, str_to_seed } from '../fishdraw.ts';
import { fishPresets, parameters_for_preset } from '../presets.ts';
import { fishTraits, type TraitContext } from '../traits/index.ts';
import { bodyFrame } from '../traits/types.ts';
import { lateralLine } from '../traits/markings.ts';
import { ribbonFin } from '../traits/anatomy.ts';

function context(seed: string): TraitContext {
  let state = str_to_seed(seed);
  const phase = (state >>> 0) / 4294967296 * Math.PI * 2;
  return {
    params: { ...default_params(), lateral_line_type: 1 },
    body: bodyFrame([[0, 100], [180, 80], [360, 130]], [[0, 200], [180, 220], [360, 170]]),
    random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; },
    noise(x, y = 0, z = 0) { return 0.5 + Math.sin(x * 1.3 + phase + z) * Math.cos(y * 0.8 + phase) * 0.3; },
  };
}

// Fix the body and parameters: head noise elsewhere in a complete fish must not
// hide a renderer that stamps out exactly the same geometry for every seed.
for (const category of ['textures', 'markings', 'tails'] as const) {
  for (const trait of fishTraits[category]) {
    if (!trait.render || trait.key === 'smooth') continue;
    test(`${category}/${trait.key} has its own repeatable seeded variation`, () => {
      const first = trait.render!(context('River specimen'));
      expect(trait.render!(context('River specimen'))).toEqual(first);
      expect(trait.render!(context('Reef specimen'))).not.toEqual(first);
    });
  }
}
for (const [name, render] of [['lateral line', lateralLine], ['ribbon fins', ribbonFin]] as const) {
  test(`${name} varies on a fixed body`, () => {
    expect(render(context('River specimen'))).not.toEqual(render(context('Reef specimen')));
    expect(render(context('River specimen'))).toEqual(render(context('River specimen')));
  });
}
for (const shape of fishTraits.shapes.filter(s => s.id >= 2)) {
  test(`${shape.key} varies its silhouette at fixed dimensions`, () => {
    const silhouettes = Array.from({ length: 12 }, (_, i) => shape.render(context(`Outline ${i}`)));
    const depths = silhouettes.map(([top, bottom]) => Math.max(...bottom.map(p => p[1])) - Math.min(...top.map(p => p[1])));
    expect(Math.max(...depths) / Math.min(...depths)).toBeGreaterThan(1.15);
    expect(shape.render(context('Outline 0'))).toEqual(silhouettes[0]);
  });
}

test('scale size stays consistent near the narrow tail instead of collapsing with the UV grid', () => {
  const c = context('Scale spacing');
  const strokes = fishTraits.textures.find(t => t.key === 'cycloid')!.render!(c).filter(line => line.length >= 7);
  function medianHeight(min: number, max: number) {
    const heights = strokes.filter(line => {
      const center = line.reduce((sum, p) => sum + p[0], 0) / line.length;
      return center > min && center < max;
    }).map(line => Math.max(...line.map(p => p[1])) - Math.min(...line.map(p => p[1]))).sort((a, b) => a - b);
    expect(heights.length).toBeGreaterThan(2);
    return heights[Math.floor(heights.length / 2)];
  }
  const ratio = medianHeight(300, 345) / medianHeight(150, 195);
  expect(ratio).toBeGreaterThan(0.6);
  expect(ratio).toBeLessThan(1.6);
});

for (const preset of fishPresets) {
  test(`${preset.id} varies proportions while preserving its anatomical choices`, () => {
    const specimens = Array.from({ length: 12 }, (_, i) => parameters_for_preset(`Specimen ${i}`, preset.id));
    const ratios = specimens.map(p => p.body_height / p.body_length);
    expect(new Set(ratios).size).toBeGreaterThan(8);
    expect(Math.max(...ratios) / Math.min(...ratios)).toBeGreaterThan(1.2);
    for (const p of specimens) {
      const base = parameters_for_preset('Base specimen', preset.id);
      expect([p.body_curve_type, p.scale_type, p.tail_type, p.has_pectoral, p.has_pelvic, p.finlet_type])
        .toEqual([base.body_curve_type, base.scale_type, base.tail_type, base.has_pectoral, base.has_pelvic, base.finlet_type]);
    }
    expect(parameters_for_preset('Specimen 0', preset.id)).toEqual(specimens[0]);
  });
  test(`${preset.id} retains finite raw geometry across varied specimens`, () => {
    for (let i = 0; i < 8; i++) {
      const seed = `Varied specimen ${i}`;
      const params = parameters_for_preset(seed, preset.id);
      parameters_for_seed(seed);
      const drawing = fish({ ...params });
      expect(drawing.flat().every(point => point.every(Number.isFinite)), `${preset.id}: ${seed}`).toBe(true);
    }
  }, 15_000);
}
