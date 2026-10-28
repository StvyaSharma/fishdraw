import { describe, expect, test } from 'bun:test';
import { generate, generate_scene } from '../fishdraw.ts';
import { fishInspirations, parameters_for_preset } from '../presets.ts';
import { contains } from '../color/anatomy.ts';
import { defaultColorSettings, motifs, palettes, validateColorSettings } from '../color/settings.ts';
import { createPaintPlan } from '../color/plan.ts';
import { createPigmentSampler, proceduralPattern } from '../color/fields.ts';
import { anatomicalDomain, reactionField, seamConductance } from '../color/solver.ts';
import { draw_colored_svg } from '../color/svg.ts';
import { draw_svg } from '../fishdraw.ts';

const settings = () => ({ ...defaultColorSettings(), enabled: true });

describe('semantic geometry preserves legacy drawings', () => {
  for (const inspiration of fishInspirations) test(inspiration.id, () => {
    const params = parameters_for_preset('Color anatomy', inspiration.id);
    const scene = generate_scene('Color anatomy', params);
    expect(scene.polylines).toEqual(generate('Color anatomy', params).polylines);
    for (const region of scene.anatomy.regions) {
      expect(region.outline.length).toBeGreaterThanOrEqual(3);
      expect([...region.outline, ...region.root].flat().every(Number.isFinite)).toBe(true);
    }
    expect(scene.anatomy.eye.length).toBeGreaterThan(3);
    expect(scene.anatomy.regions.some(r => r.id === 'head')).toBe(true);
    for (const [flag, id] of [['has_dorsal', 'dorsal'], ['has_pectoral', 'pectoral'], ['has_pelvic', 'pelvic'], ['has_anal', 'anal']] as const) {
      if (!params[flag]) expect(scene.anatomy.regions.some(r => r.id === id)).toBe(false);
    }
  });
});

test('scene transform aligns body contour with the exact legacy SVG stroke', () => {
  const scene = generate_scene('Aligned fish');
  // Leading trunk points are deliberately hidden by the head/pectoral fin.
  // Several surviving contour vertices must retain the exact SVG transform.
  const points = scene.polylines.flat();
  const aligned = scene.anatomy.top.filter(([x, y]) => points.some(([px, py]) => Math.hypot(x - px - 10, y - py - 10) < 0.001));
  expect(aligned.length).toBeGreaterThan(12);
});

test('color-off output is byte-identical and color does not consume geometry randomness', () => {
  const scene = generate_scene('Untouched ink');
  const original = draw_svg(scene.polylines);
  expect(draw_colored_svg(scene, defaultColorSettings())).toBe(original);
  createPaintPlan(scene, settings());
  expect(generate_scene('Untouched ink')).toEqual(scene);
});

test('every procedural motif has finite, distinct, deterministic fields', () => {
  const signatures = new Set<string>();
  for (const motif of motifs) {
    const values = Array.from({ length: 80 }, (_, i) => proceduralPattern(i / 80, (i % 11) / 11, motif, 6, 0.5, 15, 42));
    expect(values.every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    signatures.add(values.map(v => v.toFixed(3)).join(','));
  }
  expect(signatures.size).toBe(motifs.length);
});

test('pigment coupling, regional palette, phase, and isolation have independent effects', () => {
  const scene = generate_scene('Coupled fish');
  const body = scene.anatomy.regions.find(r => r.id === 'body')!;
  const point = scene.anatomy.top[15].map((v, i) => (v + scene.anatomy.bottom[15][i]) / 2);
  const a = settings(), b = settings(); b.pigmentCoupling = 0;
  const before = createPigmentSampler(scene.anatomy, a)(body, point[0], point[1]);
  const after = createPigmentSampler(scene.anatomy, b)(body, point[0], point[1]);
  expect(before.yellow).not.toBe(after.yellow);
  expect(before.melanin).toBe(after.melanin);
  const head = scene.anatomy.regions.find(r => r.id === 'head')!;
  a.regions.head.coupling = 0; b.regions.head.coupling = 0;
  b.regions.head.phase = 0.5;
  const sample = (s: typeof a) => head.outline.slice(0, 8).map(([x, y]) => createPigmentSampler(scene.anatomy, s)(head, x, y).melanin);
  expect(sample(a)).not.toEqual(sample(b));
  b.regions.head.palette = 'reef';
  const plan = createPaintPlan(scene, b);
  expect(plan.regions.find(r => r.region.id === 'head')!.layers[0].color).toBe(palettes.reef.base);
});

test('solver atlas excludes the background and eye, and seams use anatomical roots', () => {
  const scene = generate_scene('No-flux fish');
  const atlas = anatomicalDomain(scene.anatomy, 5);
  expect(atlas.domain[0]).toBe(-1);
  for (let i = 0; i < atlas.domain.length; i++) {
    const x = (i % atlas.width + 0.5) * 5, y = (Math.floor(i / atlas.width) + 0.5) * 5;
    if (contains(scene.anatomy.eye, x, y)) expect(atlas.domain[i]).toBe(-1);
  }
  const anatomy = { ...scene.anatomy, regions: [
    { id: 'body' as const, outline: [[0, 0], [20, 0], [20, 20], [0, 20]] as [number, number][], root: [] },
    { id: 'dorsal' as const, outline: [[0, 0], [20, 0], [20, -20], [0, -20]] as [number, number][], root: [[0, 0], [20, 0]] as [number, number][] },
  ] };
  const s = settings();
  expect(seamConductance(anatomy, 0, 1, 10, 0, 2, s)).toBeGreaterThan(0);
  expect(seamConductance(anatomy, 0, 1, 10, 15, 2, s)).toBe(0);
  expect(seamConductance(anatomy, 1, 0, 10, 0, 2, s)).toBe(seamConductance(anatomy, 0, 1, 10, 0, 2, s));
  s.anatomyCoupling = 0;
  expect(seamConductance(anatomy, 0, 1, 10, 0, 2, s)).toBe(0);
});

for (const solver of ['turing', 'gray-scott'] as const) test(`${solver}: bounded, reproducible, nonuniform, palette-independent field cache`, () => {
  const scene = generate_scene('Reaction fish');
  const s = { ...settings(), solver, iterations: 700 };
  const field = reactionField(scene.anatomy, s);
  expect([...field.values].every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
  const active = [...field.values].filter((_, i) => field.domain[i] >= 0);
  expect(Math.max(...active) - Math.min(...active)).toBeGreaterThan(0.8);
  expect(reactionField(scene.anatomy, { ...s, palette: 'reef', red: 0.9 })).toBe(field);
  expect(reactionField(scene.anatomy, { ...s, seed: 'another' }).values).not.toEqual(field.values);
});

test('SVG contains separate anatomical clips and pigment layers with protected eyes', () => {
  const scene = generate_scene('Vector fish');
  const s = settings(); s.red = 1;
  const svg = draw_colored_svg(scene, s);
  for (const region of ['body', 'head', 'caudal', 'pectoral']) expect(svg).toContain(`data-region="${region}"`);
  for (const pigment of ['base', 'shade', 'melanin', 'red', 'yellow', 'reflective', 'white']) expect(svg).toContain(`data-pigment="${pigment}"`);
  expect(svg).toContain('mask="url(#skin)"');
  expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  expect(draw_colored_svg(scene, s)).toBe(svg);
});

test('public color settings reject invalid inputs before rendering', () => {
  for (const patch of [{ frequency: Infinity }, { iterations: 1e9 }, { seed: 'x'.repeat(1025) }, { palette: 'nope' }, { melanin: NaN }]) {
    expect(() => validateColorSettings({ ...settings(), ...patch } as ReturnType<typeof settings>)).toThrow();
  }
});

test('Schnakenberg diffusion amplifies a small seeded perturbation without numerical saturation', () => {
  const scene = generate_scene('Turing growth');
  const a = reactionField(scene.anatomy, { ...settings(), solver: 'turing', iterations: 100 });
  const b = reactionField(scene.anatomy, { ...settings(), solver: 'turing', iterations: 600 });
  expect(b.amplitude).toBeGreaterThan(a.amplitude);
  expect(b.amplitude).toBeLessThan(4);
});

test('color CLI remains browser-independent and validates palette, motif, solver, and format', async () => {
  const { run } = await import('../cli.ts');
  const svg = run(['--seed', 'Color CLI', '--color', 'reef', '--color-pattern', 'spots']);
  expect(svg).toContain('data-pigment="melanin"');
  expect(svg).toContain(palettes.reef.base);
  expect(run(['--list-colors'])).toContain('gray-scott');
  for (const args of [['--color', 'nope'], ['--color', '__proto__'], ['--color-pattern', 'nope'], ['--color-solver', 'nope'], ['--color', 'reef', '--format', 'json']]) expect(() => run(args)).toThrow();
});

test('isolating PDE regions does not replace their simulated pigmentation with analytic motifs', () => {
  const scene = generate_scene('Isolated PDE head');
  const head = scene.anatomy.regions.find(r => r.id === 'head')!;
  const a = { ...settings(), solver: 'turing' as const, anatomyCoupling: 0 };
  const b = { ...a, motif: 'spots' as const };
  const first = createPigmentSampler(scene.anatomy, a), second = createPigmentSampler(scene.anatomy, b);
  for (const [x, y] of head.outline.slice(0, 12)) expect(first(head, x, y).melanin).toBe(second(head, x, y).melanin);
});
