import { describe, expect, test } from 'bun:test';
import { generate } from '../fishdraw.ts';
import { colour_for_preset, fishPresets, parameters_for_preset } from '../presets.ts';
import { colourEffects, colourGenes, colourPlan, geneGroups, type ColourEffect, type PlanStep } from '../colour/index.ts';
import { polygonTest, Raster } from '../colour/anatomy.ts';
import { engrave, hatchPolygon } from '../colour/engrave.ts';
import { serialize } from '../formats.ts';
import { run } from '../cli.ts';
import { paletteFamilies, palette } from '../colour/palette.ts';
import { Stage } from '../colour/types.ts';
import { colourControlConfig, colourOverrides } from '../web/colourControls.ts';

const seeds = ['Biggus fishus', 'Salmo salar', 'Reef specimen', 'Pomacanthus rex', 'Esox lucius'];
const fishFor = (seed: string, preset = 'procedural') => generate(seed, parameters_for_preset(seed, preset));
const planFor = (seed: string, genes = colourGenes(seed), effects?: readonly ColourEffect[]) => colourPlan(fishFor(seed), genes, seed, effects);
const hex = /^#[0-9a-f]{6}$/;

describe('colour genes', () => {
  test('are deterministic per seed and vary between seeds', () => {
    expect(colourGenes('Salmo salar')).toEqual(colourGenes('Salmo salar'));
    const all = seeds.map(s => JSON.stringify(colourGenes(s)));
    expect(new Set(all).size).toBe(seeds.length);
  });

  test('stay inside every gene spec across many seeds', () => {
    for (let i = 0; i < 300; i++) {
      const genes = colourGenes(`Specimen ${i}`);
      for (const group of geneGroups()) for (const gene of group.genes) {
        const value = genes[`${group.key}.${gene.key}`];
        expect(Number.isFinite(value)).toBe(true);
        if (gene.kind === 'range') { expect(value).toBeGreaterThanOrEqual(gene.min); expect(value).toBeLessThanOrEqual(gene.max); }
        if (gene.kind === 'toggle') expect([0, 1]).toContain(value);
        if (gene.kind === 'choice') expect(gene.options.map(o => o.id)).toContain(value);
      }
    }
  });

  test('cover every palette and pattern over a population', () => {
    const families = new Set<number>(), patterns = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const g = colourGenes(`Population ${i}`);
      families.add(g['palette.family']); patterns.add(g['pigment.pattern']);
    }
    expect(families.size).toBe(paletteFamilies.length);
    expect(patterns.size).toBe(7);
  });

  test('of one effect do not depend on which other effects exist', () => {
    const all = colourGenes('Salmo salar');
    const fewer = colourGenes('Salmo salar', colourEffects.filter(e => e.key !== 'sheen' && e.key !== 'blush'));
    for (const [key, value] of Object.entries(fewer)) expect(all[key]).toBe(value);
  });
});

describe('palettes', () => {
  test('produce valid colours for every family and extreme gene', () => {
    for (const family of paletteFamilies) for (const saturation of [0.3, 1.6]) for (const depth of [0, 1]) for (const ink of [0, 1, 2, 3]) {
      for (const colour of Object.values(palette({ family: family.id, hueShift: 30, saturation, depth, ink }))) expect(colour).toMatch(hex);
    }
  });
});

describe('contours', () => {
  const raster = new Raster({ x0: 0, y0: 0, x1: 60, y1: 60 }, 1);
  test('trace a disk as one outer loop', () => {
    const { outer, holes } = raster.contours(raster.field((x, y) => 10 - Math.hypot(x - 30, y - 30)), 0);
    expect(outer.length).toBe(1);
    expect(holes.length).toBe(0);
    for (const [x, y] of outer[0]) expect(Math.abs(Math.hypot(x - 30, y - 30) - 10)).toBeLessThan(1);
  });
  test('report a ring hole separately, so it is never filled', () => {
    const { outer, holes } = raster.contours(raster.field((x, y) => { const d = Math.hypot(x - 30, y - 30); return d > 8 && d < 20 ? 1 : 0; }), 0.5);
    expect(outer.length).toBe(1);
    expect(holes.length).toBe(1);
  });
});

function validate(steps: PlanStep[]) {
  expect(steps.length).toBeGreaterThan(0);
  expect(steps[0].kind).not.toBe('dry');
  expect(steps.at(-1)!.kind).not.toBe('dry');
  steps.forEach((step, i) => {
    if (step.kind === 'dry') { expect(steps[i - 1].kind).not.toBe('dry'); return; }
    expect(step.color).toMatch(hex);
    const points = step.kind === 'wash' || step.kind === 'glaze' || step.kind === 'hatch' ? step.poly : step.points;
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(-5); expect(x).toBeLessThanOrEqual(525);
      expect(y).toBeGreaterThanOrEqual(-5); expect(y).toBeLessThanOrEqual(325);
    }
    if (step.kind === 'wash') {
      expect(step.poly.length).toBeGreaterThanOrEqual(3);
      for (const v of [step.bleed, step.texture, step.border]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(step.opacity).toBeGreaterThanOrEqual(0); expect(step.opacity).toBeLessThanOrEqual(255);
    }
  });
}

describe('paint plans', () => {
  for (const seed of seeds) test(`${seed} is valid and repeatable`, () => {
    const plan = planFor(seed);
    validate(plan.steps);
    expect(planFor(seed)).toEqual(plan);
  });

  test('differ between seeds', () => {
    expect(planFor('Salmo salar').steps).not.toEqual(planFor('Esox lucius').steps);
  });

  test('ink the line work last, after the paper has dried', () => {
    const seed = 'Pomacanthus rex', fish = fishFor(seed), { steps } = planFor(seed);
    const firstInk = steps.findIndex(s => s.kind === 'stroke' && (s.brush === 'fish-ink' || s.brush === 'fish-fine'));
    expect(steps[firstInk - 1].kind).toBe('dry');
    expect(steps.slice(firstInk).every(s => s.kind === 'stroke')).toBe(true);
    expect(steps.length - firstInk).toBe(fish.polylines.length);
  });

  test('paint every pigment pattern inside the plan', () => {
    const seed = 'Reef specimen';
    for (let pattern = 1; pattern <= 6; pattern++) {
      const plain = planFor(seed, { ...colourGenes(seed), 'pigment.pattern': 0 }).steps.length;
      const patterned = planFor(seed, { ...colourGenes(seed), 'pigment.pattern': pattern, 'pigment.coverage': 0.6 });
      validate(patterned.steps);
      expect(patterned.steps.length).toBeGreaterThan(plain);
    }
  }, 60000);

  test('let wet paper run the shading into the ground wash', () => {
    const seed = 'Salmo salar', genes = colourGenes(seed);
    const dries = (wetness: number) => planFor(seed, { ...genes, 'style.wetness': wetness }).steps.filter(s => s.kind === 'dry').length;
    expect(dries(0.95)).toBeLessThan(dries(0.1));
  });

  test('leave other effects untouched when one is removed', () => {
    const seed = 'Esox lucius', genes = { ...colourGenes(seed), 'speckle.on': 1 };
    const paintOnly = (steps: PlanStep[]) => steps.filter(s => s.kind !== 'dry' && s.kind !== 'dabs');
    const full = planFor(seed, genes);
    const without = planFor(seed, genes, colourEffects.filter(e => e.key !== 'speckle'));
    expect(full.steps.some(s => s.kind === 'dabs')).toBe(true);
    expect(paintOnly(without.steps)).toEqual(paintOnly(full.steps));
  });

  test('accept a new effect without changing anything else', () => {
    const halo: ColourEffect = {
      key: 'halo', label: 'Halo',
      genes: [{ key: 'size', label: 'Size', kind: 'range', min: 1, max: 4, step: 1, sample: r => Math.round(r.range(1, 4)) }],
      paint: ({ anatomy, palette }) => [{ stage: Stage.detail, layers: [{ kind: 'glaze', color: palette.accent, opacity: 40, poly: anatomy.source.head }] }],
    };
    const seed = 'Salmo salar', effects = [...colourEffects, halo];
    const genes = colourGenes(seed, effects);
    expect(genes['halo.size']).toBeGreaterThanOrEqual(1);
    expect(geneGroups(effects).map(g => g.key)).toContain('halo');
    const { steps } = planFor(seed, genes, effects);
    expect(steps.filter(s => s.kind === 'glaze').length).toBe(1);
    const { 'halo.size': _, ...rest } = genes;
    expect(rest).toEqual(colourGenes(seed));
  });
});

describe('inspirations', () => {
  test('lay their colouring over the seed', () => {
    for (const preset of fishPresets) {
      const genes = colour_for_preset('River specimen', preset.id);
      for (const [key, value] of Object.entries(preset.colour ?? {})) expect(genes[key]).toBe(value);
      validate(colourPlan(fishFor('River specimen', preset.id), genes, 'River specimen').steps);
    }
  });
});

describe('colour panel', () => {
  test('round-trips every gene', () => {
    const genes = colourGenes('Salmo salar');
    const config = colourControlConfig(genes) as Record<string, Record<string, unknown>>;
    const values = Object.fromEntries(Object.entries(config).map(([group, folder]) => [group, Object.fromEntries(
      Object.entries(folder).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, Array.isArray(v) ? v[0] : typeof v === 'object' ? (v as { default: string }).default : v]),
    )]));
    expect(colourOverrides(values)).toEqual(genes);
  });
});

describe('engraved colour', () => {

  test('hatching stays inside its polygon, including concave ones', () => {
    const notch: [number, number][] = [[0, 0], [40, 0], [40, 40], [20, 15], [0, 40]];
    const inside = polygonTest(notch);
    const lines = hatchPolygon(notch, 0.7, 2);
    expect(lines.length).toBeGreaterThan(10);
    for (const [[x0, y0], [x1, y1]] of lines) expect(inside((x0 + x1) / 2, (y0 + y1) / 2)).toBe(true);
  });

  test('turns a plan into repeatable pen strokes with a colour each', () => {
    const plan = planFor('Salmo salar');
    const a = engrave(plan), b = engrave(planFor('Salmo salar'));
    expect(a).toEqual(b);
    expect(a.colors.length).toBe(a.strokes.length);
    for (const c of new Set(a.colors)) expect(c).toMatch(hex);
    expect(new Set(a.colors).size).toBeGreaterThan(3);
    // Ink is engraved last, over the colour.
    expect(a.colors.at(-1)).toBe(plan.palette.ink);
  });

  test('exports one SVG path per pen, and colour per stroke in JSON', () => {
    const { strokes, colors } = engrave(planFor('Esox lucius'));
    const svg = serialize(strokes, 'svg', 1, colors);
    expect([...svg.matchAll(/<path /g)].length).toBe(new Set(colors).size);
    const json = JSON.parse(serialize(strokes, 'json', 1, colors));
    expect(json[0]).toEqual({ color: colors[0], points: strokes[0] });
  });

  test('is available from the CLI', () => {
    const svg = run(['--seed', 'Reef specimen', '--preset', 'butterflyfish', '--colour']);
    expect(new Set([...svg.matchAll(/stroke="(#[0-9a-f]{6})"/g)].map(m => m[1])).size).toBeGreaterThan(3);
    expect(run(['--seed', 'Reef specimen', '--preset', 'butterflyfish'])).not.toContain('stroke="#');
  });
});
