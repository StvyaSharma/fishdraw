# Colour

How fishdraw paints a fish with [p5.brush](https://github.com/acamposuribe/p5.brush), the biology each effect comes from, and how to add your own. As with the line work, no colour is placed by hand: every hue comes from a seeded gene, a field over the body, or a simulation.

## Biology it borrows

- **Layered cells.** Fish skin stacks light-absorbing pigment cells (black melanophores, yellow xanthophores, red erythrophores) over reflective iridophores. Pigment colour looks the same from every angle; reflective colour is soft and shifts with the light. ([Chromatophore](https://en.wikipedia.org/wiki/Chromatophore))
- **Countershading.** Most fish are dark on the back and pale on the belly, which cancels the shading of overhead light (Thayer's principle). Many add a silvery band along the flank. ([Fish coloration](https://en.wikipedia.org/wiki/Fish_coloration))
- **Patterns organise themselves.** Kondo & Asai (1995) showed angelfish stripes behave like a reaction–diffusion wave that inserts new stripes as the fish grows ([Nature 376:765](https://doi.org/10.1038/376765a0)). In zebrafish, pigment cells support nearby cells of the same kind and suppress them further out (Nakamasu et al. 2009, [PNAS 106:8429](https://doi.org/10.1073/pnas.0808622106)).
- **Disruptive marks.** A dark bar through the eye hides the one shape predators look for; it is common on butterflyfish and other reef fish.
- **Limited palettes.** A species usually has one body hue family, one pigment, one structural sheen and sometimes a contrasting accent. Fins are thin membrane: lightly tinted, often densest at the base, sometimes with a coloured margin.

## The pipeline

Colour is plain data until the very last step, so everything but the renderer runs and tests without a browser.

```
genes     seed → Genes                   colour/index.ts   colourGenes()
anatomy   fish → masks + (u, v) fields   colour/anatomy.ts colourAnatomy()
effects   (genes, anatomy) → layers      colour/effects/*.ts
plan      ordered layers + dry steps     colour/index.ts   colourPlan()
render    plan → p5.brush calls          web/paint.ts      paint()
```

1. **Genes.** Each gene declares its control and its distribution together (`GeneSpec` in `colour/types.ts`): a range with a triangular distribution, a weighted choice, or a toggle with a probability. Genes are flat numbers keyed `group.gene` (`pigment.pattern`, `palette.family`), so they serialise and override like the line-work parameters. Every group samples from its own stream, `stream(seed, 'genes:<group>')`, so adding an effect never changes another effect's genes.
2. **Anatomy.** `generate()` returns the framed anatomy (trunk edges, outline, head, eye, each fin) and a role for every stroke. `colourAnatomy` rasterises it once, at 2 units per cell, into region masks (trunk, head, eye, skin, each fin), body coordinates (`u` snout→tail base, `v` dorsal −1 → ventral +1, measured per column so the head and trunk share one frame), and a distance-to-edge field.
3. **Effects.** An effect turns its genes into scalar fields over that grid and contours them into wash shapes with marching squares. Because fields are zero outside their mask, every shape is clipped to the anatomy by construction. Smooth gradients are stacked glazes: contours at rising levels, each a transparent wash, the way tone builds on paper. Holes are returned separately, because a wash over a hole would fill it.
4. **Plan.** Each effect returns layers tagged with a **stage**: ground, shade, glaze, pattern, fins, detail, ink. The planner orders them by stage and inserts a **dry** step between stages. Paper wetness decides whether stages run together: above 0.5 the shading feathers into the ground wash, above 0.8 the pattern also bleeds into the wet shading.
5. **Render.** `web/paint.ts` is the only module that imports p5.brush. Washes use `fill()` with bleed, granulation, edge ring and pigment split; strokes use `set()`; dry steps call `render()`. Paint is laid in slices of about one frame, so the editor stays responsive, and an outdated paint is abandoned as soon as the controls change. The canvas is seeded from the fish's name, so the same plan always paints the same picture.

## The effects

| Effect | What it paints | Genes |
|---|---|---|
| Ground wash | A pale underwash over the whole body, so later washes sit on tinted paper | strength |
| Countershading | Dark dorsum grading to the belly through a noise-bent boundary, as three glazes | boundary, softness, strength, wander |
| Belly blush | A warm ventral flush, as on breeding chars (off on most fish) | on, strength, reach |
| Lateral sheen | A cool iridophore band that tapers toward snout and tail, glazed after the body dries | on, centre, width, strength |
| Pigment pattern | Spots, stripes, bars, labyrinths or a reticulated net grown by Young's (1984) two-cell automaton, or soft mottling. Each mark is its own wash with its own bleed and edge ring | pattern, scale, coverage, fade toward belly, dark cores, pattern on fins |
| Eye bar | A dark disruptive bar through the eye, clipped to the head | on, width, slant |
| Fins | A wet membrane tint, densest at the base, with an optional margin on the free edges | tint, base, margin, margin width |
| Eye | Iris and pupil | iris colour |
| Speckle | Fine dots, densest on the back and in clusters | on, density, size, tone |
| Ink | The engraved line work in a technical pen; scale lines in a lighter, body-tinted ink | line weight, scale lines, hand wobble |

Shared genes set the **palette** (one of eight OKLCH families, hue shift, saturation, depth of tone, ink colour) and how the **paint** behaves (contrast, wetness, granulation). Saturation is capped at a natural chroma so no gene combination turns neon.

The pigment automaton: each cell sums its neighbours, +1 within radius 2.4 and −w out to 5.6. The inhibition weight `w` moves the result between labyrinths (0.3) and spots (0.42); stretching the kernel along or across the body gives stripes or bars. Midway the sheet is stretched and 12% of cells flip, so marks split and new ones nucleate as on a growing fish. In the reticulated network the winning cells are the pale ones, so the dark net is painted as wet strokes around each pale cell.

The eight inspirations carry colour hints (`colour` in `presets.ts`): the tuna is blue and silver with yellow finlets, the butterflyfish yellow with an eye bar, the moray sand with a reticulated net, the lionfish red with bars that continue onto its fins. Genes an inspiration does not fix still come from the seed.

## Adding an effect

An effect is one module. It never calls p5.brush; it returns layers.

```ts
import { Stage, type ColourEffect } from '../types.ts';
import { graded, masked, smoothstep } from './shared.ts';

/** A dusky patch behind the gill cover. */
export const shoulderSpot: ColourEffect = {
  key: 'shoulderSpot',
  label: 'Shoulder spot',
  genes: [
    { key: 'on', label: 'Shoulder spot', kind: 'toggle', sample: r => Number(r.chance(0.15)) },
    { key: 'size', label: 'Size', kind: 'range', min: 0.05, max: 0.2, step: 0.01, sample: r => r.tri(0.06, 0.1, 0.18) },
  ],
  active: g => Boolean(g.on),
  paint(ctx) {
    const { anatomy, palette, genes } = ctx;
    const field = masked(anatomy, anatomy.trunk, (x, y, k) =>
      smoothstep(genes.size, 0, Math.hypot(anatomy.u[k] - 0.3, (anatomy.v[k] + 0.2) * 0.4)));
    return [{ stage: Stage.pattern, layers: graded(ctx, field, [0.3, 0.7], palette.pigment, 140) }];
  },
};
```

Append it to `colourEffects` in `colour/index.ts`, or pass your own list to `colourGenes(seed, effects)` and `colourPlan(fish, genes, seed, effects)`. Its genes appear in the editor's Colour panel automatically. Use `ctx.random` and `ctx.noise`, which belong to your effect alone; never `Math.random()`.

## Guarantees

- Colour never changes the line work. Colour genes and paint come from their own streams; the original regression drawings are unchanged.
- A seed's plan is identical across calls; removing an effect leaves every other layer identical (`tests/colour.test.ts`).
- Every wash lies inside the sheet, every colour is a valid hex value, and the plan never starts or ends with a dry step.
- Coloured output is a raster painting, exported as PNG. The vector formats (SVG, animated SVG, JSON, CSV, PostScript) still export the line drawing for plotting.
