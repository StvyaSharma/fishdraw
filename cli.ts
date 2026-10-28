import { main } from './fishdraw.ts';
import { isOutputFormat, serialize, type OutputFormat } from './formats.ts';

export function run(args: string[]): string {
  let seed: string | undefined;
  let format: OutputFormat = 'svg';
  let speed = 1;
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (option === '--help' || option === '-h') {
      return 'Usage: bun cli.ts [--seed "Fish name"] [--format svg|smil|json|csv|ps] [--speed 2]';
    }
    if (!['--seed', '--format', '--speed'].includes(option)) throw new Error(`Unknown option: ${option}`);
    const value = args[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${option}`);
    if (option === '--seed') seed = value;
    if (option === '--format') {
      if (!isOutputFormat(value)) throw new Error(`Unknown format: ${value}`);
      format = value;
    }
    if (option === '--speed') {
      speed = Number(value);
      if (!Number.isFinite(speed) || speed <= 0) throw new Error('Speed must be a positive number.');
    }
  }
  return serialize(main(seed), format, speed);
}

if (import.meta.main) {
  try {
    console.log(run(Bun.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
