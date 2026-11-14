import { describe, expect, test } from 'bun:test';
import { cleanup, default_params, generate, main, parameters_for_seed, reframe, type Drawing } from '../fishdraw.ts';
import { formats, serialize } from '../formats.ts';
import { run } from '../cli.ts';
import { anatomyConfig, parameterOverrides, surfaceConfig, type AnatomyControls, type SurfaceControls } from '../web/controls.ts';
import fixtures from './original-output.json';

function expectFinite(drawing: Drawing) {
  expect(drawing.length).toBeGreaterThan(0);
  for (const line of drawing) {
    expect(line.length).toBeGreaterThanOrEqual(2);
    for (const point of line) {
      expect(point.length).toBe(2);
      expect(point.every(Number.isFinite)).toBe(true);
    }
  }
}

describe('original drawing regression', () => {
  for (const fixture of fixtures) {
    test(fixture.seed, () => {
      const drawing = main(fixture.seed);
      expect(drawing.length).toBe(fixture.strokes);
      expect(new Bun.CryptoHasher('sha256').update(JSON.stringify(drawing)).digest('hex')).toBe(fixture.sha256);
    });
  }
});

test('seeds are deterministic across repeated and interleaved calls', () => {
  const first = main('Repeatable fish');
  main('Another fish');
  generate('Repeatable fish', { body_height: 140, scale_type: 3 });
  expect(main('Repeatable fish')).toEqual(first);
  expect(parameters_for_seed('Repeatable fish')).toEqual(parameters_for_seed('Repeatable fish'));
});

test('overrides affect the fish without changing subsequent defaults', () => {
  const original = generate('A');
  const altered = generate('A', { body_height: 140 });
  expect(altered.params.body_height).toBe(140);
  expect(altered.polylines).not.toEqual(original.polylines);
  expect(generate('A')).toEqual(original);
  expect('lip1s' in globalThis).toBe(false);
});

test('cleanup removes short two-point strokes using their own coordinates', () => {
  expect(cleanup([[[0, 0], [10, 0]], [[20, 20], [20.1, 20]], [[3, 3]]])).toEqual([[[0, 0], [10, 0]]]);
});

test('reframe works with no caption', () => {
  expectFinite(reframe([[[0, 0], [100, 100]]]));
});

test('all scale, pattern, tail, finlet, and fin texture variants produce finite drawings', () => {
  for (const [key, count] of [['scale_type', 4], ['pattern_type', 5], ['tail_type', 6], ['finlet_type', 4], ['body_curve_type', 2], ['dorsal_texture_type', 2], ['wing_texture_type', 2], ['pelvic_texture_type', 2], ['anal_texture_type', 2]] as const) {
    for (let value = 0; value < count; value++) expectFinite(generate('Variant fish', { [key]: value }).polylines);
  }
});

function edgeControls(edge: 1 | 2): [AnatomyControls, SurfaceControls] {
  const a = anatomyConfig(default_params());
  const c = surfaceConfig(default_params());
  const on = edge === 2;
  return [{
    body: { length: a.body.length[edge], height: a.body.height[edge], curve: a.body.curve[edge], shape: String(edge - 1) },
    fins: { dorsal: a.fins.dorsal[edge], pectoral: a.fins.pectoral[edge], pelvic: a.fins.pelvic[edge], anal: a.fins.anal[edge], tail: a.fins.tail[edge], tailShape: String(on ? 5 : 0), arrangement: on ? '5' : '0', finRays: String(edge - 1) },
    finLayout: { _collapsed: true, dorsalFin: on, pectoralFin: on, pelvicFin: on, analFin: on, dorsalOrigin: a.finLayout.dorsalOrigin[edge], dorsalSpan: a.finLayout.dorsalSpan[edge], analOrigin: a.finLayout.analOrigin[edge], analSpan: a.finLayout.analSpan[edge] },
    face: { _collapsed: true, eye: a.face.eye[edge], snoutLength: a.face.snoutLength[edge], snoutHeight: a.face.snoutHeight[edge], jaw: a.face.jaw[edge], mouthOpen: a.face.mouthOpen[edge], mouthPosition: on ? '1' : '0', teeth: on },
    barbels: { _collapsed: true, moustache: on, barbelsLength: a.barbels.barbelsLength[edge], beard: on, chinBarbelsLength: a.barbels.chinBarbelsLength[edge], barbelsOrigin: on ? '1' : '0' },
  }, {
    skin: { scales: String(on ? 3 : 0), scaleSize: c.skin.scaleSize[edge] },
    markings: { pattern: String(on ? 4 : 0), patternSize: c.markings.patternSize[edge], ocellus: on, lateralLine: on ? '2' : '0' },
    color: { inColor: on, palette: on ? '5' : '0', hueShift: c.color.hueShift[edge], pigment: on ? '5' : '0', pigmentSize: c.color.pigmentSize[edge], contrast: c.color.contrast[edge], finMargins: on, eyeBar: on },
  }];
}

test('DialKit control mappings generate finite drawings at both range extremes', () => {
  for (const seed of ['A', 'B', 'C']) {
    for (const edge of [1, 2] as const) expectFinite(generate(seed, parameterOverrides(...edgeControls(edge))).polylines);
  }
});

test('all export formats are present and animation speed affects timing', () => {
  const drawing: Drawing = [[[0, 0], [10, 0]], [[0, 10], [20, 10]]];
  for (const format of formats) expect(serialize(drawing, format).length).toBeGreaterThan(0);
  expect(JSON.parse(serialize(drawing, 'json'))).toEqual(drawing);
  expect(serialize(drawing, 'csv')).toBe('0,0,10,0\n0,10,20,10');
  expect(serialize(drawing, 'svg')).toContain('<svg');
  expect(serialize(drawing, 'ps')).toStartWith('%!PS-Adobe');
  expect(serialize(drawing, 'smil', 2)).toContain('dur="0.025s"');
  expect(serialize(drawing, 'smil')).toContain('d="M10,10 20,10 ');
  expect(serialize(drawing, 'smil')).not.toContain('\n    />');
});

test('CLI preserves all formats and rejects invalid arguments', () => {
  for (const format of formats) {
    const output = run(['--seed', 'A', '--format', format, '--speed', '2']);
    expect(output).toBe(serialize(main('A'), format, 2));
  }
  for (const args of [['--unknown'], ['--seed'], ['--format', 'png'], ['--speed', '0'], ['--speed', 'NaN'], ['--speed', 'Infinity'], ['--seed', '--format', 'json']]) {
    expect(() => run(args)).toThrow();
  }
  expect(run(['--help'])).toContain('Usage: bun');
  const failed = Bun.spawnSync(['bun', 'cli.ts', '--format', 'invalid']);
  expect(failed.exitCode).toBe(1);
  expect(failed.stdout.length).toBe(0);
  expect(failed.stderr.toString()).toContain('Unknown format');
});
