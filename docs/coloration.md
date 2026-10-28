# Layered fish coloration

The biological and library research, with primary-source citations, is in [research/fish-coloration.md](research/fish-coloration.md). This feature illustrates pigmentation and paint. It is not a calibrated simulation of a species' development or of structural optical interference.

## Use it

Open **Coloring** in the existing native DialKit panel and turn **Enabled** on. No page layout, custom panel, or controls outside DialKit have been added. Coloring is off by default, preserving the original pen drawing.

- **Medium:** Vector color or p5.brush watercolor.
- **Palette:** eight illustrative palettes inspired by silver countershaded fish, gold, reef colors, red/white patches, trout, mackerel, danios, and mandarinfish. These choose colors, not a species' anatomical or developmental model.
- **Color Seed:** changes pigmentation independently of the anatomy seed.
- **Pattern:** procedural stripes, bars, spots, rings, reticulation, or labyrinth; choose the field solver, size/frequency, warp, coverage, orientation, and coupling.
- **Pigments:** separate dark, yellow, red, reflective, and white contributions; countershading, illustrative light, membrane transparency, opercular accent, lateral-line contrast, and ocellus contrast.
- **Regions:** independently tune the body, head, dorsal, pectoral, pelvic, anal, caudal, finlets/continuous margin, and jaw. Each has a palette override, opacity, pattern scale/phase, shared-field coupling, five pigment amounts, rim, and root-guided ray highlights. The eye is separately masked and receives an iris/pupil/glint treatment.
- **Paint:** original ink opacity, watercolor bleed, grain, and pooling. These affect the illustration medium, not the simulated pattern.
- **Reaction Diffusion:** iteration budget, Gray–Scott feed/kill, and axis-aligned diffusion anisotropy. Start with defaults; higher iteration counts change the pattern as well as costing more computation.

Reset restores the seed's anatomy and turns coloring off. Changing the fish/inspiration starts its controls afresh. Selecting a palette changes colors without regenerating the anatomy or rerunning an unchanged reaction–diffusion field.

## What the layers do

| Layer | Behavior |
| --- | --- |
| Base | An anatomical wash; membranes can be less opaque than skin. |
| Dorsal shade | A body-depth-dependent dark baseline, independent of repeating marks. |
| Yellow | An independent smooth field, increasingly complementary to dark markings as pigment coupling increases. |
| Red | Broad seeded patches with tunable dark-layer avoidance. |
| Melanin | Procedural or reaction–diffusion marks; ventral coverage can be reduced by countershading. |
| Reflective | Restricted cool glints and a light-positioned sheen, attenuated by dark pigment. This approximates a reflective response, not guanine-crystal optics. |
| White | Belly scattering/lightening, plus a separate pale ring where the existing anatomy has an ocellus. |
| Opercular accent | An optional artistic warm wash following the actual gill-cover seam. |
| Fin rim / rays | Distal edge bands and stylized root-guided radial highlights, clipped to the actual fin. Original detailed fin strokes remain the final ink layer; the radial field is not a separate segmentation of every biological ray. |

All channels exist on every skin region, with per-region amounts. They are sampled from a frozen set of uncoupled fields before applying pigment relationships, so evaluation order does not accidentally change the result. Alpha compositing is an artistic occupancy model; it is not an experimentally measured chromatophore interaction network.

The sensory lateral-line paths and existing ocellus contour are captured from the generator rather than inferred from the picture. Lateral-line highlighting is independent of pigment stripes. Eye masking occurs after paint generation so pigment/bleed cannot cover the iris or pupil.

## Three field backends

### Procedural

Warped phases produce stripes and bars, seeded cellular-distance functions produce spots/rings/reticulation, and warped smooth-noise contours produce labyrinth marks. Global coordinates follow the fish's paired dorsal/ventral curves; local coordinates follow each anatomical contour. Pattern orientation rotates this procedural domain.

**Anatomy Coupling** controls correlation between the shared field and local regional motifs. Fin continuation is strongest at its attachment and fades toward the tips. Each region additionally has a scale, phase, and coupling multiplier. This correlation is distinct from the PDE's physical grid exchange.

### Turing · Schnakenberg

The [Schnakenberg autocatalytic model](https://doi.org/10.1016/0022-5193(79)90042-0), in its [two-source reaction–diffusion formulation](https://doi.org/10.1016/j.nonrwa.2010.12.014), uses:

```text
u' = Du ∇²u + a - u + u²v
v' = Dv ∇²v + b - u²v
```

with `a=.1`, `b=.9`, `Du=.045`, `Dv=.65`. At the homogeneous equilibrium `(u,v)=(1,.9)`, the local reaction Jacobian has negative trace and positive determinant; unequal diffusion admits a diffusion-driven instability. Seeded small perturbations develop into spatial variation. This is a mathematical Turing-pattern backend, not a claim that these chemicals were identified in fish skin.

### Gray–Scott · reaction–diffusion

The alternate backend uses autocatalysis and feed/kill controls:

```text
u' = .16 ∇²u - uv² + F(1-u)
v' = .08 ∇²v + uv² - (F+K)v
```

It starts from deterministic finite patches. It is explicitly labeled reaction–diffusion rather than being presented as proof of a classical Turing instability or a universal fish model. Feed/kill alter the resulting pattern; defaults are a starting recipe, not a species lookup table.

For both PDEs, a canonical visible-anatomy grid excludes the background and eye. Exterior faces have no flux. Cross-region faces exchange only near captured attachment curves, with symmetric conductance controlled by anatomy coupling and each region's coupling. A foreground pectoral fin does not exchange at its entire overlapping perimeter. Updates use previous-state arrays, fixed timesteps, and bounded iteration/resolution budgets. Anisotropy uses nonnegative horizontal/vertical conductances; it is not a rotating tensor following every fin ray. Diffusion rates are illustrative lattice units, not measured tissue constants.

PDE results are bilinearly sampled without interpolating through isolated region boundaries, then softly thresholded for pigment masks. Zero anatomy coupling isolates PDE regions without replacing their simulated fields with procedural motifs. Lowering a regional coupling value also blends in up to 35% of its independent procedural component. The procedural motif, orientation, regional phase, and regional scale affect the local analytic component; they do not change the PDE's equations. Feed/kill apply only to Gray–Scott. The Turing coefficients are fixed. Global frequency changes the PDE lattice spacing. Four final fields are cached; palette, light, watercolor texture, and pigment amounts are excluded from field-cache identity.

## Rendering and exports

`generate_scene` captures semantic contours in the same RNG pass as the original strokes, then applies the exact shared framing transform. Legacy `generate`, `main`, `fish`, and all pen-stroke serializers remain available. Tests compare scene strokes with the existing generator across every inspiration and preserve the original regression hashes.

The pure engine builds compact quantized coverage paths with horizontal run merging. The vector renderer applies exact anatomical clip paths and a separate eye mask. It emits scalable paths and filters with no browser imports, embedded images, or external assets.

The watercolor adapter uses the official **p5.brush 3.0.0 standalone** entry. It shares the library's brush/fill engine without introducing a p5 sketch, a global constructor, or an animation loop. The declared p5 peer dependency is pinned to 2.3.4; p5 itself is not imported into the editor. The application owns narrow source-checked TypeScript declarations because this brush release does not ship declarations.

One serialized WebGL2 runtime paints reusable pigment-color textures. Each texture is seeded, flushed with the actual `brush.render()` API, and composited through the same pigment/anatomical masks on Canvas2D. Exact masks are applied **after** watercolor so bleed cannot escape the silhouette or cover the eye. Region layers are composed back-to-front, then lateral-line accents, eye detail, and the original ink are drawn. Coverage masks are slightly softened within anatomical clips to avoid a coarse lattice appearance.

Slider changes are coalesced before painting. Stale work is cancelled between paint batches and cannot replace a newer preview. GPU pixel results are not promised to be identical across devices. A failed/unsupported WebGL2 context gives an explicit vector-color fallback, including SVG download.

- **Vector SVG:** contains real colored paths/filters and original ink.
- **Watercolor SVG:** embeds the completed 520×320 painted PNG inside SVG to preserve the displayed watercolor; this is a raster-backed SVG, not vector brush strokes.
- **SMIL, JSON, CSV, PostScript:** retain original pen-stroke semantics and do not contain colored paint. Animated SVG remains the original line animation.

## Bun CLI

Color SVG is browser-independent; watercolor is browser-only.

```sh
bun run generate --seed "Salmo salar" --preset tuna --color silver > fish.svg
bun run generate --seed "Reef fish" --color reef --color-pattern reticulation > reef.svg
bun run generate --seed "Pattern fish" --color mackerel --color-solver turing > turing.svg
bun run generate --seed "Spotted fish" --color trout --color-solver gray-scott --color-seed pigment-2 > spots.svg
bun run generate --list-colors
```

Color options require `--format svg`; incompatible formats and unknown choices are rejected.

## TypeScript API

```ts
import { generate_scene, defaultColorSettings, draw_colored_svg } from './color/index.ts';

const scene = generate_scene('Imaginary fish');
const color = defaultColorSettings();
color.enabled = true;
color.medium = 'flat';
color.palette = 'reef';
color.motif = 'rings';
color.regions.head.palette = 'gold';
color.regions.pectoral.coupling = 0.25;
color.regions.caudal.red = 0.8;

await Bun.write('fish.svg', draw_colored_svg(scene, color));
```

`createPaintPlan(scene, settings)` exposes the typed regional pigment layers for other render adapters. Public settings are validated before allocating fields or emitting SVG.

## Verification

Automated checks cover legacy geometry/regressions, anatomical presence and transform alignment, deterministic/distinct motifs, independent pigment and region effects, protected eye domains, root-only symmetric seam conductance, bounded seeded PDE fields, Turing perturbation growth, cache independence from palettes, invalid input rejection, and browser-free CLI output.

Desktop and mobile Chromium checks exercise native DialKit color controls, independent regional palettes, reaction–diffusion selection, actual p5.brush color pixels, background spill exclusion, watercolor SVG/preview equality, reset, and a simulated missing-WebGL2 fallback. All existing editor, inspiration, and export browser tests also run.

No fitted species-specific developmental model, wavelength-dependent iridescence, full 3D lighting, automatic finite-domain mode selection, or exact tissue growth simulation is claimed by this implementation.
