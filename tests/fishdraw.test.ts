import { describe, expect, test } from 'bun:test';
import { cleanup, default_params, generate, main, parameters_for_seed, reframe, type Drawing } from '../fishdraw.ts';
import { formats, serialize } from '../formats.ts';
import { run } from '../cli.ts';
import { controlConfig, parameterOverrides, type Controls } from '../web/controls.ts';
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

function edgeControls(edge: 1 | 2): Controls {
  const c = controlConfig(default_params());
  return {
    body: { length: c.body.length[edge], height: c.body.height[edge], curve: c.body.curve[edge], shape: String(edge - 1) },
    texture: { scales: String(edge === 1 ? 0 : 3), scaleSize: c.texture.scaleSize[edge], pattern: String(edge === 1 ? 0 : 4), patternSize: c.texture.patternSize[edge], ocellus: edge === 2, lateralLine: edge === 1 ? '0' : '2' },
    fins: { dorsal: c.fins.dorsal[edge], pectoral: c.fins.pectoral[edge], pelvic: c.fins.pelvic[edge], anal: c.fins.anal[edge], tail: c.fins.tail[edge], tailShape: String(edge === 1 ? 0 : 5), arrangement: edge === 1 ? '0' : '5' },
    anatomy: { _collapsed: true, dorsalFin: edge === 2, pectoralFin: edge === 2, pelvicFin: edge === 2, analFin: edge === 2, dorsalOrigin: c.anatomy.dorsalOrigin[edge], dorsalSpan: c.anatomy.dorsalSpan[edge], analOrigin: c.anatomy.analOrigin[edge], analSpan: c.anatomy.analSpan[edge], finRays: String(edge - 1) },
    face: { eye: c.face.eye[edge], jaw: c.face.jaw[edge], mouthOpen: c.face.mouthOpen[edge], snoutLength: c.face.snoutLength[edge], snoutHeight: c.face.snoutHeight[edge], barbelsLength: c.face.barbelsLength[edge], chinBarbelsLength: c.face.chinBarbelsLength[edge], mouthPosition: edge === 1 ? '0' : '1', barbelsOrigin: edge === 1 ? '0' : '1', teeth: edge === 2, moustache: edge === 2, beard: edge === 2, _collapsed: true },
  };
}

test('DialKit control mappings generate finite drawings at both range extremes', () => {
  for (const seed of ['A', 'B', 'C']) {
    for (const edge of [1, 2] as const) expectFinite(generate(seed, parameterOverrides(edgeControls(edge))).polylines);
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
