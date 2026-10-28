# Extending fishdraw

The engine produces `Drawing`: an ordered array of 2D pen strokes. Shapes, surfaces, markings, and tails have separate renderers, so their results work with every existing export format. No image assets or new runtime dependencies are needed.

## Where changes belong

- `traits/shapes.ts`: body curves, including the original rounded/tapered profiles.
- `traits/textures.ts`: skin and scale strokes, independent of pigment.
- `traits/markings.ts`: pigment strokes, ocellus masks, and lateral lines.
- `traits/tails.ts`: additional tail outlines and ray strokes.
- `traits/anatomy.ts`: fin arrangement metadata and continuous fin margins.
- `traits/types.ts`: renderer interfaces and body-relative geometry.
- `traits/organic.ts`: continuous surface warping, sampled pen drift, and projected surface coordinates.
- `traits/index.ts`: catalog, lookup, and per-call extension validation.
- `presets.ts`: coherent inspiration definitions and seeded exploration.
- `fishdraw.ts`: seeded randomness, original detail renderers, occlusion, framing, and cleanup.
- `web/controls.ts`: catalog-derived selects and safe mappings from sliders to fin anchors.

Adding a built-in shape, texture, marking, or tail means adding a descriptor and renderer to its trait file. Each descriptor has a stable numeric `id`, stable machine-readable `key`, and human-readable `label`. The controls and CLI lists read the same catalog. Exploration automatically samples new catalog entries. Named presets remain deliberate combinations.

Keep existing IDs and keys stable. Original texture IDs 0–3, marking IDs 0–4, and tail IDs 0–5 intentionally retain their original renderers and drawing order in the engine. Those descriptors have no `render` callback; **new entries must provide one**. The body shape renderers have all moved into their own module.

## Renderer interface

Surface, marking, and tail renderers receive `TraitContext`:

- `params`: the resolved fish parameters for this call; treat them as read-only.
- `body.point(u, v)`: a body-relative point. `u=0` is the front of the trunk and `u=1` is the tail base. The separate head extends in front of this frame. `v=-1` is the dorsal edge, `v=0` is the middle, and `v=1` is the ventral edge. Horizontal coordinates clamp to the trunk; vertical coordinates can extend beyond its edges before clipping.
- `body.top`, `body.bottom`, `body.outline`, `body.length`, `body.depth`: sampled body geometry in the original drawing coordinates.
- `random()` and `noise(x, y?, z?)`: the engine's seeded random sources. Use these instead of `Math.random()`, time, or module-level state.

Surface and marking renderers return strokes. The engine clips them to the trunk, then removes strokes hidden by the head and visible pectoral fin. A tail renderer returns `{ outline, strokes }`; its outline is also used for occlusion. Body shapes receive `{ params, noise }` and return `[top, bottom]`, with **32 corresponding finite 2D points per curve**, ordered from trunk front to tail base. Fin anchors use these sampling indices.

Keep renderers synchronous and return fresh arrays: framing and cleanup mutate the generated drawing. Avoid unbounded work as parameters increase. Inspect strokes at both the largest and smallest body depths, and keep dense skin treatments legible beneath pigment. `scale_scale` and `pattern_scale` increase feature size and reduce density; they do not change anatomy.

Match the original generator's variation at several levels: specimen proportions, feature spacing and size, coherent deformation, incomplete strokes, and uneven engraving density. Use continuous noise to move neighboring features together; independently jittering every vertex creates scratches. `warp` and `ink` in `organic.ts` implement the shared field and fine pen drift. Scales and reticulated cells use drawing-space coordinates before clipping so their size stays consistent near the tail; mapping an entire regular UV grid onto a thin peduncle piles strokes into a dark knot. Use body-relative coordinates for anatomical anchors such as scute rows, fin roots, and eye spots.

## Local extensions

Pass an extension to a single call without mutating the shared catalog:

```ts
import { generate } from '../fishdraw.ts';
import type { FishTraitExtensions } from '../traits/index.ts';

const extensions: FishTraitExtensions = {
  markings: [{
    id: 100,
    key: 'double-lateral-stripe',
    label: 'Double lateral stripe',
    render: ({ body }) => [-0.2, 0.2].map(v =>
      Array.from({ length: 33 }, (_, i) => body.point(i / 32, v))),
  }],
};

const fish = generate('Striped specimen', {
  scale_type: 4,
  pattern_type: 100,
}, extensions);
```

IDs and keys must be unique within their category, including the built-ins. Invalid entries and collisions throw descriptive errors. An extension never persists into another generation call. To expose it in a custom editor, use `controlConfig(params, extensions)` and pass the same extension object to every preview and export call. The default app uses the built-in catalog; applications own their additional extensions.

## Adding inspirations

Add a `FishPreset` to `fishPresets` with an ID, label, short description, primary source URL, and parameter overrides. It automatically appears in the editor and CLI. Use `parameters_for_preset` or `generate_preset` to resolve it. Both use a conservative baseline so random teeth, barbels, or extra fins do not leak into named inspirations.

Preset values are centers for seeded variation, not fixed specimens. The sampler changes numeric proportions and fin origins within editor ranges while preserving discrete anatomical choices. A seed must produce the same starting parameters after switching away and back. Explicit overrides are applied after sampling.

Check the combinations against [the research](fish-morphology.md). In particular:

- Scute rows are distinct from ganoid diamond scales.
- Selecting no scale strokes does not establish biological scalelessness.
- A moray-inspired profile should omit paired fins and use continuous median margins.
- An ocellus and lateral line are different structures and have independent controls.
- Barbels under a sturgeon's snout attach ahead of its subterminal mouth; chin barbels use separate anchors.
- Side-view depth does not model cross-sectional compression. These are artistic inspirations, not validated species depictions.

## Verification

Run `bun run check`. Catalog tests iterate all built-ins, so a newly registered renderer gets finite-coordinate, canvas-bound, and repeatability checks. Inspiration tests exercise small/shallow and large/deep bodies. Extension tests verify call isolation and collision handling. Browser tests verify desktop/mobile controls, preset resets, and preview/export equality. Preserve the original regression fixtures when adding opt-in traits.

`tests/variation.test.ts` also fixes the body and parameters while changing only the seeded random/noise sources. This catches a renderer that draws an identical stamp for every seed, even when noise elsewhere makes the complete fish differ. It checks variation in preset proportions separately. Review several seeds visually as well; passing a variation test does not establish drawing quality.
