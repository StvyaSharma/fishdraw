import { binomen, generate, parameters_for_seed, type FishParams } from './fishdraw.ts';
import { fishInspirations, generate_preset } from './presets.ts';
import { fishTraits } from './traits/index.ts';
import { paletteFamilies } from './traits/color.ts';
import { isOutputFormat, serialize, type OutputFormat } from './formats.ts';

export function run(args: string[]): string {
  let seed: string | undefined;
  let format: OutputFormat = 'svg';
  let speed = 1;
  let preset = 'procedural';
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
      return `Usage: bun cli.ts [--seed "Fish name"] [--preset ${fishInspirations.map(p => p.id).join('|')}] [--shape KEY] [--texture KEY] [--pattern KEY] [--tail KEY] [--color] [--palette KEY] [--format svg|smil|json|csv|ps] [--speed 2]\nUse --list-presets, --list-traits or --list-palettes to discover available choices.`;
    }
    if (option === '--list-presets') return fishInspirations.map(p => `${p.id}\t${p.label}: ${p.description}`).join('\n');
    if (option === '--list-palettes') return paletteFamilies.map(p => `${p.key}\t${p.label}`).join('\n');
    if (option === '--list-traits') return JSON.stringify(Object.fromEntries(Object.entries(fishTraits).map(([key, entries]) => [key, entries.map(({ id, key, label }) => ({ id, key, label }))])), null, 2);
    if (option === '--color') { overrides.color_enabled = 1; continue; }
    if (!['--seed', '--palette', '--format', '--speed', '--preset', ...Object.keys(selectors)].includes(option)) throw new Error(`Unknown option: ${option}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${option}`);
    if (option === '--seed') seed = value;
    if (option === '--palette') {
      const family = paletteFamilies.find(p => p.key === value);
      if (!family) throw new Error(`Unknown palette: ${value}. Choose ${paletteFamilies.map(p => p.key).join(', ')}.`);
      overrides.color_palette = family.id;
      overrides.color_enabled = 1;
    }
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
  if (seed === undefined) {
    parameters_for_seed(crypto.randomUUID());
    seed = binomen();
  }
  const fish = preset === 'procedural' ? generate(seed, overrides) : generate_preset(seed, preset, overrides);
  return serialize(fish.polylines, format, speed, fish.colors);
}

if (import.meta.main) {
  try {
    console.log(run(Bun.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
