# Coloration

How fishdraw colours a fish, and the biology each rule comes from. The goal is the same as for the line work: no colour is placed directly. Every hue comes out of a seeded field, a constrained choice, or a simulation.

## Biology it borrows

- **Layered cells.** Fish skin stacks light-absorbing pigment cells (black melanophores, yellow xanthophores, red erythrophores) over reflective iridophores and leucophores. Pigment colour looks the same from every angle; reflective colour is soft and shifts with viewing angle. ([Chromatophore](https://en.wikipedia.org/wiki/Chromatophore))
- **Countershading.** Most fish are dark on the back and pale on the belly, often with a reflective band along the side. ([Fish coloration](https://en.wikipedia.org/wiki/Fish_coloration))
- **Patterns organise themselves.** Kondo & Asai (1995) showed angelfish stripes behave like a reaction-diffusion wave that adds stripes as the fish grows ([Nature 376:765](https://doi.org/10.1038/376765a0)). In zebrafish, stripes come from cells interacting: pigment cells support nearby cells of the same kind and push them away further out ([Development](https://cob.silverchair.com/dev/article/130/15/e1502/42001/How-the-zebrafish-gets-its-stripes)).
- **Limited palettes.** A species typically uses one body hue family, one pigment, one structural sheen and sometimes a contrasting accent. Fins are often translucent, with colour on the margins.

## How the engine applies it

| Step | Rule | Code |
|---|---|---|
| Genes | `colorParameters` uses its own xorshift stream (`seed + ':color'`), weighted palette picks and triangular amounts | `traits/color.ts` |
| Palette | Families defined in OKLCH, so a hue shift never changes lightness; tones derived from one family | `palette()` |
| Countershading | Back colour fades to nothing through a noise-bent boundary in body coordinates `(u, v)` | `colorize()` |
| Sheen | Gaussian band along the flank; soft edges because it dissolves through gaps in the noise | `colorize()` |
| Pigment | Young's (1984) activator–inhibitor automaton on the body sheet. The inhibition weight switches between spots and mazes; stretching the kernel along or across the body gives stripes or bars. The sheet is stretched mid-run, so marks split and new ones appear as the fish "grows" | `pigmentCells()` |
| Fins | Light tint, colour concentrated within a few units of the outer edge | `colorize()` |
| Eye | Iris ring in the accent colour; optional dark eye-bar through the head | `colorize()` |

Every layer is **subtractive**: `carve` overfills a box with parallel hatching, then keeps only the runs where a predicate holds (inside the region, outside masks, field above threshold). Pigment uses a sharp threshold; sheen and countershading use smooth-noise dithering, which reproduces sharp pigment edges and soft structural ones.

## Guarantees

- Colour never changes the line work. `generate(seed)` with colour off is byte-identical to before, and every monochrome stroke appears unchanged in the colour version (`tests/color.test.ts`).
- Colour draws nothing from the line-work random stream, and its noise is hashed value noise, not the shared Perlin table.
- Output stays pen-based: SVG groups strokes into one `<path>` per colour, with colour beneath ink; PostScript uses `setrgbcolor`; JSON and CSV carry a colour per stroke.
