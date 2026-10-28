import { defaultColorSettings, palettes, motifs, type PaletteId, type Motif, type Solver } from './color/settings.ts';
import { draw_colored_svg } from './color/svg.ts';
import { binomen, main, generate_scene, parameters_for_seed, type Drawing, type FishParams } from './fishdraw.ts';
import { fishInspirations, generate_preset, parameters_for_preset } from './presets.ts';
import { fishTraits } from './traits/index.ts';
import { isOutputFormat, serialize, type OutputFormat } from './formats.ts';

export function run(args: string[]): string {
  let seed: string | undefined;
  let format: OutputFormat = 'svg';
  let speed = 1;
  let preset = 'procedural';
  const color = defaultColorSettings(); color.medium = 'flat';
  const overrides: Partial<FishParams> = {};
  const selectors = {
    '--shape': { entries: fishTraits.shapes, param: 'body_curve_type' },
    '--texture': { entries: fishTraits.textures, param: 'scale_type' },
    '--pattern': { entries: fishTraits.markings, param: 'pattern_type' },
    '--tail': { entries: fishTraits.tails, param: 'tail_type' },
  } as const;
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (option === '--help' || option === '-h') {
      return `Usage: bun cli.ts [--seed "Fish name"] [--preset ${fishInspirations.map(p => p.id).join('|')}] [--shape KEY] [--texture KEY] [--pattern KEY] [--tail KEY] [--format svg|smil|json|csv|ps] [--speed 2] [--color PALETTE] [--color-pattern MOTIF] [--color-solver procedural|turing|gray-scott] [--color-seed SEED]\nColor output requires SVG. Use --list-presets or --list-traits to discover available choices.`;
    }
    if (option === '--list-colors') return JSON.stringify({ palettes: Object.keys(palettes), motifs, solvers: ['procedural', 'turing', 'gray-scott'] }, null, 2);
    if (option === '--list-presets') return fishInspirations.map(p => `${p.id}\t${p.label}: ${p.description}`).join('\n');
    if (option === '--list-traits') return JSON.stringify(Object.fromEntries(Object.entries(fishTraits).map(([key, entries]) => [key, entries.map(({ id, key, label }) => ({ id, key, label }))])), null, 2);
    if (!['--seed', '--format', '--speed', '--preset', '--color', '--color-pattern', '--color-solver', '--color-seed', ...Object.keys(selectors)].includes(option)) throw new Error(`Unknown option: ${option}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${option}`);
    if (option === '--seed') seed = value;
    if (option === '--color') {
      if (!Object.hasOwn(palettes, value)) throw new Error(`Unknown color palette: ${value}.`);
      color.palette = value as PaletteId; color.enabled = true;
    }
    if (option === '--color-pattern') {
      if (!motifs.some(m => m === value)) throw new Error(`Unknown color motif: ${value}.`);
      color.motif = value as Motif; color.enabled = true;
    }
    if (option === '--color-solver') {
      if (!['procedural', 'turing', 'gray-scott'].includes(value)) throw new Error(`Unknown color solver: ${value}.`);
      color.solver = value as Solver; color.enabled = true;
    }
    if (option === '--color-seed') { color.seed = value; color.enabled = true; }
    if (option === '--preset') {
      if (!fishInspirations.some(p => p.id === value)) throw new Error(`Unknown fish inspiration: ${value}.`);
      preset = value;
    }
    if (option in selectors) {
      const selector = selectors[option as keyof typeof selectors];
      const trait = selector.entries.find(t => t.key === value);
      if (!trait) throw new Error(`Unknown ${option.slice(2)}: ${value}. Use --list-traits.`);
      overrides[selector.param] = trait.id;
    }
    if (option === '--format') {
      if (!isOutputFormat(value)) throw new Error(`Unknown format: ${value}`);
      format = value;
    }
    if (option === '--speed') {
      speed = Number(value);
      if (!Number.isFinite(speed) || speed <= 0) throw new Error('Speed must be a positive number.');
    }
  }
  if (color.enabled) {
    if (format !== 'svg') throw new Error('Color output requires --format svg; the other formats export pen strokes.');
    if (seed === undefined) { parameters_for_seed(crypto.randomUUID()); seed = binomen(); }
    const scene = generate_scene(seed, { ...parameters_for_preset(seed, preset), ...overrides });
    return draw_colored_svg(scene, color);
  }
  let drawing: Drawing;
  if (preset === 'procedural' && Object.keys(overrides).length === 0) {
    drawing = main(seed);
  } else {
    if (seed === undefined) {
      parameters_for_seed(crypto.randomUUID());
      seed = binomen();
    }
    drawing = generate_preset(seed, preset, overrides).polylines;
  }
  return serialize(drawing, format, speed);
}

if (import.meta.main) {
  try {
    console.log(run(Bun.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
