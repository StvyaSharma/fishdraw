# fishdraw

Procedurally generated fish drawings, with a TypeScript drawing engine, a Bun CLI, and a live [DialKit](https://github.com/joshpuckett/dialkit) editor. Based on [Lingdong Huang’s fishdraw](https://github.com/LingDong-/fishdraw).

![](samples/000020.svg)

## Requirements

[Bun](https://bun.com/) 1.3 or newer. This project uses Bun for installation, development, builds, and tests. Node.js is not required.

```sh
bun install
bun run dev
```

Open the address printed in the terminal (by default `http://127.0.0.1:3000`). Set `PORT` or `HOST` to change the server address.

## Live editor

Use the native DialKit panel to enter a seed and click Draw, or click Random. DialKit controls adjust its body, scales, pattern, fins, tail, eyes, jaw, teeth, and barbels. Reset restores that seed’s starting parameters. A new seed starts with its own parameters.

Download SVG, animated SVG (SMIL), JSON, CSV, or PostScript. The Export folder contains the format, animation speed, and Download action. Generation runs locally in your browser; drawings are not uploaded.

The editor uses React, DialKit, and Motion. The drawing engine itself has no runtime dependencies.

## CLI

```sh
bun run generate > output.svg
bun run generate --seed "Biggus fishus" --format smil --speed 2 > animated.svg
bun run generate --seed "Salmo salar" --format json > fish.json
bun cli.ts --help
```

- `--seed`: a string used to generate the fish and its caption. If omitted, a pseudo-Latin name is generated.
- `--format`: `svg` (default), `smil`, `json`, `csv`, or `ps`.
- `--speed`: a positive multiplier for SMIL drawing speed; `2` draws twice as fast.

Invalid arguments produce an error on stderr and a nonzero exit status.

## TypeScript library

```ts
import { generate, main, draw_svg, type Drawing } from './fishdraw.ts';

const drawing: Drawing = main('Biggus fishus');
await Bun.write('fish.svg', draw_svg(drawing));

const custom = generate('Biggus fishus', {
  body_height: 120,
  tail_length: 100,
});
console.log(custom.params, custom.polylines);
```

`parameters_for_seed(seed)` returns reproducible starting parameters. `generate(seed, overrides)` produces a captioned, framed drawing with optional parameter overrides. The same seed and parameters produce the same result across repeated calls.

The original lower-level functions remain available as typed ES module exports: `fish`, `generate_params`, `default_params`, `reframe`, `cleanup`, `binomen`, and `str_to_seed`. Renderers include `draw_svg`, `draw_svg_anim`, and `draw_ps`. `reframe` and `cleanup` mutate their input. For reproducible generation, prefer `generate` or `main` over the lower-level functions, which share random state.

`fishdraw.js` has been replaced by `fishdraw.ts`; CommonJS consumers should migrate to the ES module imports above. The CLI entry point is now `cli.ts`.

## Build and verify

```sh
bun run typecheck
bun test
bun run build
bunx --bun playwright install chromium
bun run test:e2e
# All checks together (after installing Chromium):
bun run check
```

`bun run build` creates a standalone static editor in `dist/`, suitable for static hosting. `bun run start` runs the Bun server in production mode using the source HTML entry point. DialKit is explicitly enabled in production because the controls are part of the editor.

Tests cover original-output regression fixtures, deterministic seeds, parameter variants and range extremes, finite coordinates, exports, and CLI validation. Browser tests cover desktop and mobile DialKit controls and downloads against the production Bun server.

The migration also fixes existing bugs exposed by TypeScript: leaked `lip1s` state, noise reused across seeds, incorrect short-stroke cleanup coordinates, missing-caption handling, and stray markup / inconsistent coordinates in animated SVG. The regression fixtures account for the cleanup fix; eight seeded drawings otherwise match the original output.

## gallery

![](samples/000000.svg)
![](samples/000001.svg)
![](samples/000002.svg)
![](samples/000003.svg)
![](samples/000004.svg)
![](samples/000005.svg)
![](samples/000006.svg)
![](samples/000007.svg)
![](samples/000008.svg)
![](samples/000009.svg)
![](samples/000010.svg)
![](samples/000011.svg)
![](samples/000012.svg)
![](samples/000013.svg)
![](samples/000014.svg)
![](samples/000015.svg)
![](samples/000016.svg)
![](samples/000017.svg)
![](samples/000018.svg)
![](samples/000019.svg)
![](samples/000021.svg)
![](samples/000022.svg)
![](samples/000023.svg)
![](samples/000024.svg)
![](samples/000025.svg)
![](samples/000026.svg)
![](samples/000027.svg)
![](samples/000028.svg)
![](samples/000029.svg)
![](samples/000030.svg)
![](samples/000031.svg)
![](samples/000032.svg)
