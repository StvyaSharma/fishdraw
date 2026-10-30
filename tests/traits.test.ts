import { describe, expect, test } from 'bun:test';
import { default_params, fish, generate, parameters_for_seed, type Drawing } from '../fishdraw.ts';
import { fishPresets, generate_preset, parameters_for_preset } from '../presets.ts';
import { fishTraits, resolveTraits, type FishTraitExtensions } from '../traits/index.ts';
import { bodyFrame } from '../traits/types.ts';
import { run } from '../cli.ts';
import { surfaceConfig } from '../web/controls.ts';

function expectDrawing(drawing: Drawing) {
  expect(drawing.length).toBeGreaterThan(0);
  expect(drawing.every(line => line.length >= 2 && line.every(p => p.length === 2 && p.every(Number.isFinite)))).toBe(true);
  // The fish and its caption must remain inside the exported canvas.
  expect(drawing.flat().every(([x, y]) => x >= 0 && y >= 0 && x <= 500 && y <= 300)).toBe(true);
}

describe('registered traits', () => {
  const params = { shapes: 'body_curve_type', textures: 'scale_type', markings: 'pattern_type', tails: 'tail_type' } as const;
  for (const category of Object.keys(params) as (keyof typeof params)[]) {
    for (const entry of fishTraits[category]) {
      test(`${category}: ${entry.key}`, () => {
        const baseline = { ...default_params(), scale_type: 4, pattern_type: 0, has_moustache: 0, has_teeth: 0 };
        const overrides = { ...baseline, [params[category]]: entry.id };
        const first = generate('Trait specimen', overrides);
        expectDrawing(first.polylines);
        generate('Interleaved specimen');
        expect(generate('Trait specimen', overrides)).toEqual(first);
        if (entry.id > 0) {
          expect(first.polylines).not.toEqual(generate('Trait specimen', { ...overrides, [params[category]]: 0 }).polylines);
        }
      });
    }
  }
});

describe('inspiration presets', () => {
  for (const preset of fishPresets) {
    test(preset.id, () => {
      const first = generate_preset('Field specimen', preset.id);
      expectDrawing(first.polylines);
      expect(generate_preset('Field specimen', preset.id)).toEqual(first);
      expect(generate_preset('Different specimen', preset.id).polylines).not.toEqual(first.polylines);
      expect(generate_preset('Field specimen', preset.id, { body_height: 130 }).params.body_height).toBe(130);
      for (const edge of [
        { body_length: 200, body_height: 28, scale_scale: 0.65, pattern_scale: 0.5 },
        { body_length: 520, body_height: 170, scale_scale: 2, pattern_scale: 2.5 },
      ]) {
        expectDrawing(generate_preset('Range specimen', preset.id, edge).polylines);
        const params = { ...parameters_for_preset('Range specimen', preset.id), ...edge };
        parameters_for_seed('Range specimen');
        expect(fish({ ...params }).every(line => line.every(point => point.every(Number.isFinite))), `${preset.id} raw geometry`).toBe(true);
      }
    });
  }
  test('procedural inspiration preserves the original generator', () => {
    expect(parameters_for_preset('Original')).toEqual(parameters_for_seed('Original'));
    expect(generate_preset('Original', 'procedural')).toEqual(generate('Original'));
    expect(() => parameters_for_preset('Original', 'unknown')).toThrow('Unknown fish inspiration');
  });
  test('morays omit paired fins and gar/sturgeon have distinct surfaces', () => {
    const moray = parameters_for_preset('A', 'moray');
    expect([moray.has_pectoral, moray.has_pelvic, moray.scale_type, moray.finlet_type]).toEqual([0, 0, 4, 5]);
    expect(parameters_for_preset('A', 'gar').scale_type).toBe(7);
    expect(parameters_for_preset('A', 'sturgeon').scale_type).toBe(9);
  });
});

test('body-relative coordinates follow both curves', () => {
  const body = bodyFrame([[0, 0], [10, -10], [20, 0]], [[0, 0], [10, 20], [20, 0]]);
  expect(body.point(0.5, -1)).toEqual([10, -10]);
  expect(body.point(0.5, 1)).toEqual([10, 20]);
  expect(body.point(0.5, 0)).toEqual([10, 5]);
  expect(body.point(-1, 0)).toEqual([0, 0]);
  expect(body.point(2, 0)).toEqual([20, 0]);
});

test('the head hides trunk markings on long profiles extending left of the original canvas', () => {
  const params = { ...parameters_for_preset('Occlusion', 'moray'), body_length: 520 };
  const hiddenMark: FishTraitExtensions = {
    markings: [{ id: 100, key: 'under-head', label: 'Under head', render: ({ body }) => [[body.point(0, 0), body.point(0.03, 0)]] }],
  };
  const baseline = generate('Occlusion', { ...params, pattern_type: 0 });
  expect(generate('Occlusion', { ...params, pattern_type: 100 }, hiddenMark).polylines).toEqual(baseline.polylines);
});

test('custom rendering extensions work per call without affecting built-ins', () => {
  const custom: FishTraitExtensions = {
    markings: [{ id: 100, key: 'test-line', label: 'Test line', render: ({ body }) => [[body.point(0.3, 0), body.point(0.8, 0)]] }],
  };
  const baseline = generate('Extension fish');
  const extended = generate('Extension fish', { pattern_type: 100 }, custom);
  expectDrawing(extended.polylines);
  expect(extended.polylines).not.toEqual(baseline.polylines);
  expect(generate('Extension fish', { pattern_type: 100 }, custom)).toEqual(extended);
  expect(() => generate('Extension fish', { pattern_type: 100 })).toThrow('Unknown trait ID');
  expect(generate('Extension fish')).toEqual(baseline);
  expect(resolveTraits(custom).markings.at(-1)?.key).toBe('test-line');
  expect(surfaceConfig(extended.params, custom).markings.pattern.options.at(-1)?.value).toBe('100');
  expect(() => resolveTraits({ markings: [{ ...custom.markings![0], id: 0 }] })).toThrow('already registered');
});

test('custom shapes, textures, and tails cross the same rendering interface', () => {
  const extensions: FishTraitExtensions = {
    shapes: [{ id: 100, key: 'custom-profile', label: 'Custom profile', render: ({ params: p }) => [
      Array.from({ length: 32 }, (_, i) => [60 + i / 31 * p.body_length, 150 - Math.sin(i / 31 * Math.PI) * p.body_height - 8]),
      Array.from({ length: 32 }, (_, i) => [60 + i / 31 * p.body_length, 150 + Math.sin(i / 31 * Math.PI) * p.body_height + 8]),
    ] }],
    textures: [{ id: 100, key: 'custom-surface', label: 'Custom surface', render: ({ body }) => [[body.point(0.3, -0.5), body.point(0.8, 0.5)]] }],
    tails: [{ id: 100, key: 'custom-tail', label: 'Custom tail', render: ({ body }) => {
      const root = body.point(1, 0);
      const outline: Drawing[number] = [body.point(1, -1), [root[0] + 50, root[1] - 20], [root[0] + 50, root[1] + 20], body.point(1, 1)];
      return { outline, strokes: [outline] };
    } }],
  };
  const result = generate('Custom traits', { body_curve_type: 100, scale_type: 100, tail_type: 100, pattern_type: 0 }, extensions);
  expectDrawing(result.polylines);
  expect(generate('Custom traits', { body_curve_type: 100, scale_type: 100, tail_type: 100, pattern_type: 0 }, extensions)).toEqual(result);
  expect(() => generate('Custom traits', { body_curve_type: 101 }, {
    shapes: [{ id: 101, key: 'invalid', label: 'Invalid', render: () => [[], []] }],
  })).toThrow('32 finite 2D points');
});

test('exploration uses the full catalog reproducibly without changing original seeds', () => {
  const original = generate('Explorer baseline');
  const seen = { shapes: new Set<number>(), textures: new Set<number>(), markings: new Set<number>(), tails: new Set<number>() };
  for (let i = 0; i < 120; i++) {
    const seed = `Exploration ${i}`;
    const params = parameters_for_preset(seed, 'explorer');
    expect(parameters_for_preset(seed, 'explorer')).toEqual(params);
    seen.shapes.add(params.body_curve_type); seen.textures.add(params.scale_type);
    seen.markings.add(params.pattern_type); seen.tails.add(params.tail_type);
    if (i < 12) {
      expectDrawing(generate_preset(seed, 'explorer').polylines);
      parameters_for_seed(seed);
      expect(fish({ ...params }).every(line => line.every(point => point.every(Number.isFinite))), `${seed} raw geometry`).toBe(true);
    }
  }
  for (const key of ['shapes', 'textures', 'markings', 'tails'] as const) expect(seen[key].size).toBe(fishTraits[key].length);
  expect(generate('Explorer baseline')).toEqual(original);
});

test('fin visibility and sensory/ocellus details are independent', () => {
  const base = { ...default_params(), scale_type: 4, pattern_type: 0, finlet_type: 0 };
  const original = generate('Details', base).polylines;
  for (const key of ['has_dorsal', 'has_pectoral', 'has_pelvic', 'has_anal'] as const) {
    const hidden = generate('Details', { ...base, [key]: 0 }).polylines;
    expectDrawing(hidden);
    expect(hidden).not.toEqual(original);
  }
  for (const extra of [{ lateral_line_type: 1 }, { lateral_line_type: 2 }, { has_ocellus: 1 }, { finlet_type: 4 }, { finlet_type: 5 }]) {
    const detailed = generate('Details', { ...base, ...extra }).polylines;
    expectDrawing(detailed);
    expect(detailed).not.toEqual(original);
  }
});

test('CLI discovers traits and exports presets with independent overrides', () => {
  expect(run(['--list-presets'])).toContain('moray');
  const listed = JSON.parse(run(['--list-traits']));
  expect(listed.textures.some((t: { key: string }) => t.key === 'ganoid')).toBe(true);
  const output = run(['--seed', 'CLI specimen', '--preset', 'gar', '--texture', 'smooth', '--pattern', 'rings', '--shape', 'torpedo', '--tail', 'truncate', '--format', 'json']);
  expect(JSON.parse(output)).toEqual(generate_preset('CLI specimen', 'gar', { scale_type: 4, pattern_type: 9, body_curve_type: 2, tail_type: 6 }).polylines);
  for (const args of [['--preset', 'missing'], ['--shape', 'missing'], ['--texture', 'missing'], ['--preset']]) expect(() => run(args)).toThrow();
});
