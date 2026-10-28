# Layered fish coloration: biology, procedural fields, and p5.brush

Research date: **2026-10-28**. Scope: research for `feat/layered-fish-coloration`; no application implementation. Scientific observations below are species- and tissue-specific. Sections labeled **proposal** describe a renderer, not a validated developmental model. Code examples are source-checked integration examples, not browser-tested production code.

## Findings that should shape the PR

1. Expose real geometry from the existing generator before coloring. It already constructs trunk, head, eye, and fin contours internally, then discards their identity in a concatenated `Drawing`. Capture those contours in the same generation pass; do not infer anatomy from the final stroke collection. See [fishdraw.ts](../../fishdraw.ts) and [trait coordinate contracts](../../traits/types.ts).
2. Use several pigment-coverage fields and separate reflective/white response, with anatomy-dependent modulation. Zebrafish evidence supports interacting pigment cells and distinct trunk/fin organization; it does not establish one universal fish layer stack. [Hirata et al. 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf), [Frohnhöfer et al. 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3912879/).
3. Keep countershading separate from repeating marks. An Asip1 knockout study supports a dorsoventral differentiation program, including ventral-head and belly effects. [Cal et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6401153/).
4. As of this research, npm `latest` is **p5.brush 3.0.0**, published on the research date. Its exact declared p5 peer range is **`^2.2`**; this is a range, not one uniquely supported p5 release. npm p5 `latest` is **2.3.4**, which satisfies it. A reasonable reproducible starting pair is `p5.brush@3.0.0` plus `p5@2.3.4`, subject to browser integration verification. [Official brush registry metadata](https://registry.npmjs.org/p5.brush), [published brush package](https://registry.npmjs.org/p5.brush/3.0.0), [p5 package](https://registry.npmjs.org/p5/2.3.4).
5. `brush.clip()` is a rectangular stroke/hatch clip, **not an arbitrary anatomical fill mask**. Render paint to a transparent surface and apply a final polygon mask in a separate compositing pass. [Official clip reference](https://github.com/acamposuribe/p5.brush#brush-management), [stroke clip source](https://github.com/acamposuribe/p5.brush/blob/main/src/stroke/clip.js).
6. Gray–Scott is a useful visual-pattern option; it is not an established model of all fish pigmentation. Pearson's original simulations even report no stable Turing patterns for their chosen diffusion-coefficient ratio. Avoid equating “reaction–diffusion,” “Turing instability,” and “Gray–Scott” in labels. [Pearson 1993 author manuscript](https://arxiv.org/abs/patt-sol/9304003).

## 1. Biological mechanisms and rendering implications

### Chromatophores and optical layers

| Component | Primary evidence | Proposed visual approximation |
| --- | --- | --- |
| Melanophores | Zebrafish melanophores contain dark melanosomes. Their organization differs among tissues. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | A dark absorbing coverage field, with separate fine mottling and broad markings. Density is not simply a hue slider. |
| Xanthophores and erythrophores | Brown-trout research distinguishes erythrophore populations, including a population confined to red spots. Do not assume all red/yellow cells have one organelle composition or lineage. [Sušnik Bajec et al. 2022](https://www.nature.com/articles/s41598-022-04799-7) | Separate warm-yellow and red/orange fields when desired; species presets decide whether either exists. Avoid labeling every orange pixel an erythrophore. |
| Iridophores | Guanine crystal arrays generate structural coloration. Experiments on zebrafish scale iridophores linked norepinephrine-induced color change to crystal-array tilting and dynein-dependent dynamics. [Gur et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11161791/) | An underlying reflective/silver field plus restricted cool glints; hue varies with an artistic light parameter. A static blue wash is not optical interference. |
| Leucophores | Danio white cells include melanoleucophores derived from melanophores and xantholeucophores with different organelles/chemistry. White coloration is not synonymous with “unpigmented.” [Lewis et al. 2019](https://doi.org/10.1073/pnas.1901021116) | Distinct white/scattering coverage, useful at fin tips or other preset-specific sites. Do not implement every white area as the same cell type. |

Yellow/orange pigment cells can contain carotenoid vesicles and pteridine-associated organelles; Danio white-cell work documents these features in xantholeucophores as well. This argues for keeping optical role, color, and developmental identity separate in the renderer's vocabulary. [Lewis et al. 2019](https://doi.org/10.1073/pnas.1901021116).

In zebrafish dark stripes, melanophores lie beneath a middle iridophore layer and a superficial xanthophore layer; light interstripes have compact xanthophores over silvery iridophores. These arrangements involve changes in cell density and shape as well as depth. This is a tissue-specific observation, not a mandatory stack for every fish. [Walderich et al. 2016](https://www.nature.com/articles/ncomms11462).

Crystal architecture also varies between zebrafish stripe and interstripe iridophores: imaging and transcriptomic evidence support distinct crystallotypes and local differentiation. Thus “iridophore amount” alone cannot fully determine visible hue or brightness. [Gur et al. 2020](https://www.nature.com/articles/s41467-020-20088-1).

**Proposal:** represent `melanin`, `yellow`, `red`, `reflective`, and `white` as independent coverage/response channels. Blend them with a documented artistic optical model; do not describe alpha compositing or p5.brush's paint mixing as a cellular simulation. Separate pigment coverage from watercolor grain, paper pooling, highlights, and ink lines. Those latter effects describe the illustration medium.

### Interaction research: what has actually been demonstrated

- **Nakamasu et al. (2009):** laser ablation and regeneration experiments showed mutual exclusion of adjacent melanophores and xanthophores, while distant xanthophore populations supported melanophore differentiation/survival. Opposing short- and long-range effects supported an interaction network capable of Turing-like patterning. This was a cellular network result, not identification of Gray–Scott chemicals in fish skin. [Original paper](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/Nakamasu2009.pdf).
- **Frohnhöfer et al. (2013):** mutant/chimera analyses established the importance of iridophores and interactions among three cell classes. The horizontal myoseptum provides an orientation cue for the first interstripe; further stripe spacing can self-organize. Missing orientation cues need not abolish local periodicity. [Original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC3912879/).
- **Patterson & Parichy (2013):** iridophore ablation and tissue-environment experiments implicated local Csf1 support for xanthophores and tissue-derived factors supporting pigment populations. Their proposed long-range repression of xanthophore development was explicitly a hypothesis with alternative explanations. Preserve that uncertainty. [Original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC3667786/).
- **Patterson et al. (2014):** iridophore perturbations and altered Csf1 availability connected xanthophore recruitment with stripe reiteration and Danio pattern differences. Developmental timing and recruitment matter alongside spatial interactions. [Original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC4224114/).
- **Eom et al. (2015/2016):** xanthophore-lineage airinemes deliver vesicles to melanophores and promote Delta–Notch signaling. Long-range influence can travel through cellular projections rather than free diffusion of two hypothetical chemicals. [Original eLife article](https://elifesciences.org/articles/12401).
- **Irion et al. (2014):** connexins Cx41.8 and Cx39.4 are required for normal stripe organization; mutant phenotypes include spots. This is evidence for biological coupling parameters, but not a direct mapping from a gene to a procedural feed/kill slider. [Original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC4296512/).
- **Walderich et al. (2016):** homotypic competition regulates pigment-cell proliferation and tiling. Patterning includes same-type interactions, not only dark-versus-yellow antagonism. [Original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC4853480/).
- **Watanabe & Kondo (2012):** experimental connexin manipulation generated altered stripe widths, labyrinths, and leopard/donut-like arrangements. This provides a biological anchor for those visual families while leaving renderer parameterizations approximate. [Original study abstract](https://pubmed.ncbi.nlm.nih.gov/22313791/).

### Countershading

Zebrafish Asip1 perturbation changed dorsoventral pigment-cell differentiation: wild-type ventral head had few melanophores and abundant iridophores near branchiostegals/operculum; the belly's low melanophore coverage exposed a bright reflective abdominal sheet. This supports a separate regional baseline rather than deriving belly brightness from a stripe threshold. [Cal et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6401153/).

Functional explanations must remain conditional. A western-rainbowfish experiment found background matching more consistent with its observations than self-shadow concealment; countershading is not proof that every species uses the same camouflage mechanism. [Kelley & Merilaita 2015, authors' institutional record](https://research-repository.uwa.edu.au/en/publications/testing-the-role-of-background-matching-and-self-shadow-concealme/).

**Proposal:** a smooth dorsal-to-ventral baseline controls dark coverage and reflective/white response independently of the repeating field. Use body-local depth, not canvas `y`, so curved fish remain coherent. Let fins and head receive distinct strengths. Add illustrative lighting separately, so changing a light does not erase anatomical pigmentation.

## 2. Anatomical regions must remain distinct

This table deliberately separates observation from a proposed drawing rule. Statements about zebrafish fins do not describe all teleost fins.

| Region | Evidence and caution | Proposed renderer behavior |
| --- | --- | --- |
| Head | Zebrafish ventral-head pigmentation responds to Asip1. [Cal 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6401153/) | Independent head mask, reduced/reoriented body-field influence, optional cheek patch or eye band, adjustable ventral lightening. Do not approximate head with a percentage of the trunk's bounding box. |
| Trunk | Zebrafish patterned hypodermis has ordered pigment sheets; it differs from fin organization. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | Main body coordinate domain, broad countershading, common pattern phase, independent scale texture. |
| Dorsal fin | Zebrafish dorsal fin lacks clear trunk-like striping in the cited tissue study. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | Own presence-aware mask; optional root continuation, tip band, and ray-aligned modulation. Species presets can override the default. |
| Pectoral fin | The same study found scattered pigment cells in non-striped pectoral fins. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | Preserve its actual contour and occlusion of body; separately tune transparency, ray contrast, and coupling. |
| Pelvic fin | The paper's non-striped “ventral” fins differ from striped anal/caudal fins. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | Treat pelvic identity explicitly, including absence, rather than merging every ventral appendage into “anal.” |
| Anal fin | Zebrafish anal-fin stripe regions have xanthophores between two melanophore sheets. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | Independent anal mask, attachment-relative phase and distal bands, lower membrane opacity than trunk when appropriate. |
| Caudal fin | Exploratory modeling examines body-interface cues, distal growth, and ray-associated migration/birth. These are candidate mechanisms, not a proven universal causal account. [Volkening et al. 2019 preprint](https://arxiv.org/abs/1911.03758) | Preserve fork/lobes and root curve; map root phase outward along the fan, with independent rim/spot controls. |
| Rays and membranes | Sparse iridophores in striped zebrafish fins can associate with rays without forming trunk-like sheets. [Hirata 2005](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf) | Export structural ray paths separately from hatching and membrane contours. Ray-local color/ink can be stronger than membrane paint. |
| Eye | Zebrafish iris has ordered and disordered iridophore layers above a thin melanophore layer. [Gur et al. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6097150/) | Separate outer eye, iris, pupil, and highlight; exclude eye from skin paint. Iris metallic ring is an illustration of reflectivity, not trunk scales. |
| Gill/operculum | Asip1 work documents ventral-head/opercular reflectivity; the operculum is not an exposed red gill by default. [Cal 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6401153/) | Preserve the cover contour and a small recessed seam; optional warm accent should be labeled artistic, not compulsory anatomy. |
| Lateral line | Fish lateral lines are sensory structures; they should not be conflated with pigment stripes. [University of Hawaiʻi anatomy](https://www.manoa.hawaii.edu/exploringourfluidearth/biological/fish/structure-and-function-fish) | Export its existing path as a semantic guide. Optional pore marks/contrast can follow it, independently of stripe phase. |

**Proposal:** absence means an empty/absent region, not a rectangle filled with low alpha. Adipose fins, finlets, second dorsals, and connected ribbon margins also need region entries when generated. Distinguish geometric containment, biological adjacency, and visual overlap: a foreground pectoral fin may overlap trunk pixels but should not exchange field values with every trunk point behind it.

## 3. Reaction–diffusion, Turing patterns, anisotropy, and boundaries

### Original and modern research

Turing's 1952 paper studies reacting and diffusing morphogens and instabilities of a homogeneous equilibrium, including stationary spatial waves. The domain and admissible modes are part of the problem. A Turing instability specifically concerns diffusion destabilizing an otherwise stable homogeneous state; it is not a synonym for any organic texture. [Original paper, DOI](https://doi.org/10.1098/rstb.1952.0012), [original-paper scan](https://www.marconlab.org/papers/turing.pdf).

Kondo & Asai's marine-angelfish study compared changing skin stripes during growth with reaction–diffusion predictions. Agreement supported a viable mechanism for that pattern, without proving all fish employ one chemical system. [Original Nature study abstract](https://pubmed.ncbi.nlm.nih.gov/24547605/).

Modern zebrafish work also uses agent-based models of cell migration, differentiation, and death rather than treating each color as a diffusing chemical. Volkening & Sandstede modeled stripe formation, mutations, and laser ablation using interacting cell agents. [Original 2015 study](https://pubmed.ncbi.nlm.nih.gov/26538560/). Their later tailfin collaboration explored anatomical growth and interface/ray cues with two pigment-cell types; its repulsive boundary agents approximate Neumann conditions and can allow a few cells to escape. [Tailfin full text, Appendix B.2](https://arxiv.org/html/1911.03758v1#A2.SS2).

Pearson's Gray–Scott system produces varied spatiotemporal behavior from finite-amplitude perturbations. Its illustrated pattern atlas depends on initialization, diffusion and reaction parameters, and numerical conditions. Its spots are not necessarily a classical small-perturbation Turing instability. [Original manuscript](https://arxiv.org/abs/patt-sol/9304003), [published-paper scan](https://www.staff.science.uu.nl/~frank011/Classes/complexity/Literature/Pearson.pdf).

### Implementable field options — proposal

Use a common interface, for example `sample(regionId, localPoint, layerId)`, with two interchangeable pattern backends:

- **Fast analytic backend:** seeded smooth noise, warped sinusoidal phase, band thresholds, cellular-distance spots, and narrow contour bands. This gives predictable bars, stripes, spots, labyrinth-like marks, and reticulation at low cost. Label it procedural.
- **Optional PDE backend:** evolve two scalar arrays on a fixed canonical grid, with deterministic initialization, fixed timestep/iteration budget, masked anatomy, and explicit coupling. Cache final fields. Gray–Scott is one artistic backend; an activator–inhibitor system or nonlocal kernel can be added without changing anatomical masks or paint rendering.

The familiar Gray–Scott equations, as a visual backend, are:

```text
du/dt = div(Du grad u) - u*v*v + F*(1-u)
dv/dt = div(Dv grad v) + u*v*v - (F+K)*v
```

These equations express autocatalytic conversion plus replenishment/removal, not measured melanin/xanthophore chemistry. Start near `u=1,v=0` with seeded finite patches; pure uniform initialization can remain uniform. Never publish a universal `F,K -> fish species` mapping. [Pearson 1993](https://arxiv.org/abs/patt-sol/9304003).

**Anisotropy proposal:** use a symmetric positive-definite tensor `D = dParallel*t*tᵀ + dAcross*n*nᵀ` in physical body units, where `t` follows a body axis or fin-ray direction and `n` is perpendicular. Either simulate tensor diffusion correctly, or explicitly label coordinate stretching as a cheaper approximation. Faster diffusion in a direction does not universally guarantee stripes oriented in that direction: inspect the resulting unstable modes or tune empirical presets. Root phase/orientation guidance is often more predictable for a first release.

**Boundary proposal:** use no flux at free skin/fin edges: `normal · D grad(field) = 0`. At an attachment seam use a configurable exchange condition, for example `outwardFlux_r = k*(field_r - field_s)`, with the opposite exchange applied to the neighbor. `k=0` isolates; larger `k` increases continuity. A Dirichlet edge fixes concentration and can impose a rim; periodic boundaries connect opposite edges and should not be used accidentally on a finite fish. A rectangular simulation subsequently cropped to a silhouette has different boundary behavior from a simulation inside that silhouette; document which was chosen.

For a basic four-neighbor finite-volume implementation, store nonnegative face conductances, omit exterior-face fluxes, and apply equal/opposite internal seam flux. Handle holes (eye, gaps between fins) as excluded cells. With spatially varying tensors, discretize `div(D grad u)`, not simply `D * laplacian(u)` while ignoring coefficient variation. Keep all species/layer updates synchronous from the previous arrays.

**Numerical proposal:** for isotropic/axis-aligned explicit diffusion, choose a conservative timestep satisfying `dt <= 1/[2*(Dx/hx² + Dy/hy²)]`, then reduce it further for reaction stiffness and coupling. This is the diffusion stability bound for the stated stencil, not a universal nonlinear guarantee. Set a finite iteration budget and reject NaNs; clamping alone can hide instability. Store solver version, timestep, grid, iterations, initialization, and boundary policy in export metadata. Changing CSS canvas size must not change the simulated pattern.

### Pattern controls and tradeoffs — proposal

| Desired appearance | Direct procedural construction | Tradeoff / validation |
| --- | --- | --- |
| Longitudinal stripes | Threshold a smoothly warped phase varying across body depth; seed its origin from a guide line. | Large warp or noise breaks continuity; too little gives mechanical ruler lines. Orientation and wavelength should be separate. |
| Vertical bars | Phase varies along body length; keep body-depth modulation mild. | A rotation in canvas space can detach bars from curved anatomy. Use local coordinates. |
| Spots | Seeded cellular peaks or sparse thresholded smooth field; PDE spots optional. | Changing threshold changes area and apparent count together; expose scale and coverage separately. |
| Labyrinth | Threshold a smooth, weakly oriented field near its middle range; optional PDE backend. | Strong orientation becomes stripes; extreme threshold becomes islands. Finite-resolution aliasing can falsely disconnect branches. |
| Reticulation | Render a thin band around scalar contours or cellular boundaries. | Narrow boundaries create a network; broad thresholds create patches. This is distinct from scale outlines and watercolor granulation. |
| Rings/ocelli | Explicit distance bands around an anatomical anchor, optionally combined with field texture. | Preserve center, rim, and scale exclusion. An arbitrary PDE spot is not automatically an ocellus. |

Feed/kill values, diffusion ratio, finite perturbations, run duration, domain dimensions, anisotropy, and threshold all influence PDE results. Even visual parameter atlases are conditional on those choices. [Pearson 1993](https://www.staff.science.uu.nl/~frank011/Classes/complexity/Literature/Pearson.pdf). For the first release, use visual controls such as wavelength, coverage, direction, warp, contrast, and coupling; hide raw solver parameters under an advanced panel.

## 4. Architecture proposal for this repository

Everything in this section is a proposed design derived from inspected local code, not an already implemented API.

### Preserve seeded geometry

Current `generate()` resets generation state through `parameters_for_seed()`, runs `fish()`, then mutates line coordinates through `reframe()` and `cleanup()`. Existing `fish()` obtains 32-point dorsal/ventral curves and creates `c0/f0` dorsal, `c1/f1` pectoral, `c2/f2` pelvic, `c3/f3` anal, `c4/f4` caudal, `cf/fh` head geometry. Eye contours are inside `fish_head()`. The `c*` contours are not interchangeable with their `f*` stroke collections. [Local source](../../fishdraw.ts), [trait definitions](../../traits/types.ts).

Proposed contract:

```ts
// New application-owned types, not existing library APIs.
type RegionId = string; // stable e.g. "trunk", "head", "dorsal:0", "caudal"
interface RegionGeometry {
  id: RegionId;
  kind: 'trunk' | 'head' | 'dorsal' | 'pectoral' | 'pelvic' |
        'anal' | 'caudal' | 'adipose' | 'finlet' | 'ribbon' | 'eye';
  contours: readonly (readonly [number, number][])[];
  holes: readonly (readonly [number, number][])[];
  rays: readonly (readonly [number, number][])[];
  attachment?: readonly [number, number][];
  occludes: readonly RegionId[];
  paintOrder: number;
}
interface FishScene {
  seed: string;
  polylines: Drawing; // existing ordered line result
  regions: readonly RegionGeometry[];
  // one shared affine transform maps all raw geometry into output coordinates
  transform: readonly [number, number, number, number, number, number];
}
```

Capture data while the original constructors run, without consuming any additional legacy random values. Return legacy polylines byte-for-byte unchanged when coloration is disabled. Do not regenerate fins a second time to get masks: that can change random state or make paint detach from original geometry. Preserve original frame bounds based on original drawing (including caption behavior); transform region contours, eye masks, attachment curves, and rays with that same affine transform. Avoid passing closed masks through stroke cleanup, which can delete short segments or break topology. Head generation can adjust `eye_size`, so capture the actual final eye contour rather than reconstructing it from the original parameter.

`BodyFrame` already defines `u=0..1` front-of-trunk to tail base and `v=-1..1` dorsal to ventral. Reuse this convention rather than silently redefining `v=0..1` or measuring from the snout. Add inverse mapping or a triangulated strip atlas with barycentric coordinates. Head and fin maps should be explicit charts. [Existing coordinate convention](../../traits/types.ts).

Some extension/finlet paths currently return only strokes, and absence controls sometimes discard drawing after construction. Audit every morphology variant: expose the contour at construction time, return no visible mask for absent fins, retain each finlet individually, and define connected ribbon topology deliberately. An alpha-hull around all fin strokes would fill gaps and is not an anatomical mask. [Current generation branches](../../fishdraw.ts).

### Shared fields with local modulation

Use independent deterministic namespaces derived from the user seed: `geometry` retains the existing algorithm exactly; `color/palette`, `color/shared`, `color/region/<id>`, `color/layer/<id>`, and `paint/<region>/<layer>` use separate streams or coordinate hashes. Do not call legacy `rand()` from coloring, including palette selection.

Define a low-frequency common field in a canonical body atlas. Every region has a map `phi_r` into a shared coordinate frame and its own local chart `psi_r`. For a first implementation:

```text
shared_r(x) = S(phi_r(x))
local_r,l(x) = L_r,l(psi_r(x))
base_r,l(x) = mix(local_r,l(x), shared_r(x), regionSharedWeight[r,l])
coverage_r,l = response(base_r,l + anatomicalBias[r,l])
```

This weighted shared signal is **correlation/phase sharing**, not true transport between regions. Name controls accordingly. To offer actual field coupling, add sparse attachment-edge exchanges or solve on a connected anatomical mesh. Couple only declared anatomical neighbors, never all screen-space overlaps.

For fins, parameterize root position `s` and normalized root-to-tip distance `t`. A useful artistic boundary continuation is:

```text
finField(s,t) = mix(localFin(s,t), bodyAtAttachment(s),
                    rootCoupling * exp(-t / decayLength))
```

This carries trunk phase into the fin root while permitting different distal bands. A caudal fan should inherit multiple samples along its root, not one center value stretched across both lobes. Preserve metric wavelength when mapping to wide/deep fins; UV distance alone can stretch marks unintentionally.

### Cross-layer coupling

Use a small matrix of controls describing whether each pigment channel follows, avoids, or ignores another. Sample all uncoupled fields first, then compute the coupled result from that frozen state. For example:

```text
M = sigmoid(melanophoreBase)
X = sigmoid(yellowBase + cXM*(1 - M))
I = sigmoid(reflectiveBase + cIM*(1 - M) + cIX*X)
```

This is a **visual occupancy approximation**. The signs do not summarize every biological interaction or timescale. For stronger biological modeling, use short- and long-range kernels with separate signs and possibly recruitment/death; a pointwise complement cannot reproduce the full interaction network described by ablation studies. [Nakamasu 2009](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/Nakamasu2009.pdf).

Expose layer coupling separately from anatomy coupling and from paint blending. Strong positive coupling can collapse distinct channels into identical marks; strong avoidance can leave artificial uncolored gaps. Set bounded defaults and maintain separate baseline reflectivity/white response so dark-layer absence does not imply transparency.

### Render and cache boundaries

Recommended module boundaries:

- Pure geometry/scene generation: existing generator plus semantic geometry; no DOM imports.
- Pure coloration: typed parameters, seeds, scalar grids/contours, masks and paint plan; CPU arrays and serializable output.
- Browser paint adapter: lazy p5/p5.brush imports, WebGL targets, watercolor, texture, export lifecycle.
- Existing SVG/PS/CLI adapter: consumes legacy lines; optionally adds flat vector fills and clipped contour marks from the same pure paint plan.

Cache scene by geometry seed/overrides; field arrays by color seed, anatomy atlas, solver version and parameters; paint by field output, palette, texture seed, resolution and renderer version. A palette adjustment should not regenerate geometry or rerun a PDE. Prefer a worker for a heavy pure solver; do not require worker WebGL for the first release.

## 5. p5.brush: verified package, APIs, and limitations

### Evidence snapshot and exact versions

The three critical p5 adapter/export files (`adapters/p5/target.js`, `adapters/p5/addon.js`, `index.shared.js`) were byte-identical between the downloaded published package and inspected main tree. The downloaded official npm tarball for `p5.brush@3.0.0` declares `gitHead` **`75c89fd8e0a0b63d9a88b51983c0738e132e82a5`**. The inspected GitHub `main` tree was **`d56350a647d0b098a9e79d397447a8094f6c45a4`**. Treat npm's shipped `src/` and `dist/` as the installation authority; `main` may move. The package exports the p5 default entry and `p5.brush/standalone`, has `simplex-noise ^4.0.3` as a dependency, and declares p5 `^2.2` as peer dependency. [Published metadata](https://registry.npmjs.org/p5.brush/3.0.0), [release source package.json](https://github.com/acamposuribe/p5.brush/blob/75c89fd8e0a0b63d9a88b51983c0738e132e82a5/package.json).

Recommended exact installation command, not executed in this repository:

```sh
bun add --exact p5@2.3.4 p5.brush@3.0.0
```

The README's broad “2.x or higher” wording is less exact than the peer range: `^2.2` means `>=2.2.0 <3.0.0`. The inspected p5 adapter requires `webglVersion === 'webgl2'`, not merely a 2D canvas or WebGL1 fallback. [Target validation source](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/target.js).

**TypeScript:** the published brush tarball has no `.d.ts` files and no `types` export. Add a small application-owned ambient module declaration for only the APIs used; do not pretend the package ships official TS types. Verify p5 typings against the pinned p5 package, since p5 1.x declarations may not describe addon hooks or 2.x framebuffers. [Published package](https://registry.npmjs.org/p5.brush/3.0.0), [source package manifest](https://github.com/acamposuribe/p5.brush/blob/main/package.json).

### p5 instance initialization and an ESM registration trap

Official APIs: `import * as brush from 'p5.brush'`, `brush.instance(p)` before `setup/draw`, `p.createCanvas(w,h,p.WEBGL)`, and optional explicit `brush.load()` after canvas creation. p5 transform and state hooks are installed as an addon. [Official instance example](https://github.com/acamposuribe/p5.brush#note-for-p5-instance-mode), [addon implementation](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/addon.js).

**Source-level caveat:** the shipped ESM entry does not import the p5 constructor itself; its registration condition is `if (typeof p5 !== 'undefined') p5.registerAddon(registerP5Addon)`. A local `import P5 from 'p5'` binding in a different module does not necessarily create a global `p5`. Calling `brush.instance(p)` only chooses the target; it does not install lifecycle hooks. [Entry source](https://github.com/acamposuribe/p5.brush/blob/main/src/index.p5.js), [instance implementation](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/target.js).

**Proposed browser-only loader**, justified by that exact condition:

```ts
// Application integration helper, not a p5.brush-provided API.
// Use once per page; do not statically import p5.brush elsewhere first.
let paintRuntime: ReturnType<typeof initializePaintRuntime> | undefined;
async function initializePaintRuntime() {
  const { default: P5 } = await import('p5');
  Object.assign(globalThis, { p5: P5 });
  const brush = await import('p5.brush'); // addon sees global p5 now
  brush.scaleBrushes(3); // multiplicative: configure once per module runtime
  return { P5, brush };
}
function loadPaintRuntime() {
  return paintRuntime ??= initializePaintRuntime();
}
```

This intentionally exposes the constructor globally to satisfy the current entry point. Serialize initialization, use one p5 version, and retain the global through runtime lifetime. If another integration has already imported brush before p5 was exposed, module caching means a second import will not redo registration. Do not invent `brush.init()`, `brush.register()`, `brush.destroy()`, or `brush.render()` on the p5 entry: those are not its exported public lifecycle APIs. [Actual shared exports](https://github.com/acamposuribe/p5.brush/blob/main/src/index.shared.js).

### React/TypeScript instance-mode sketch

The following combines the source-backed brush calls with application-owned React mounting. It assumes narrow ambient brush declarations and compatible p5 type declarations have been supplied. The example draws once, keeps geometry in top-left coordinates through one translation, and cancels delayed initialization on unmount. It does not claim to be a complete React renderer.

```tsx
import { useEffect, useRef } from 'react';
import type P5Type from 'p5';

export function PaintExample({ seed }: { seed: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let sketch: P5Type | undefined;
    const mount = host.current;
    if (!mount) return;

    void loadPaintRuntime().then(({ P5, brush }) => {
      if (cancelled) return;
      sketch = new P5((p: P5Type) => {
        brush.instance(p);
        p.setup = () => {
          p.pixelDensity(1);
          p.createCanvas(500, 300, p.WEBGL);
          brush.load();
          p.noLoop();
        };
        p.draw = () => {
          p.randomSeed(seed);
          p.noiseSeed(seed);
          p.background('#f6f1e8');
          p.push();
          p.translate(-250, -150);
          brush.noStroke();
          brush.noHatch();
          brush.noWash();
          brush.fill('#bdbe69', 110);
          brush.fillBleed(0.15, 'in', 0);
          brush.fillTexture(0.4, 0.3, true, 0.15);
          brush.polygon([[70, 150], [180, 70], [400, 150], [180, 230]]);
          brush.noFill();
          brush.set('HB', '#263534', 0.8);
          brush.line(70, 150, 400, 150);
          p.pop();
          // Registered postdraw hook flushes brush compositing.
        };
      }, mount);
    });

    return () => {
      cancelled = true;
      sketch?.remove();
    };
  }, [seed]);
  return <div ref={host} />;
}
```

API provenance: [instance/setup](https://github.com/acamposuribe/p5.brush#note-for-p5-instance-mode), [fill/texture/bleed and primitives](https://github.com/acamposuribe/p5.brush#fill-operations), [automatic flush/seed/state hooks](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/addon.js), [p5 remove](https://p5js.org/reference/p5/remove/). Production code should handle rejected imports/WebGL initialization and prefer reusing one sketch with a redraw request over rebuilding it for every control change. React development remounts should not multiply application listeners or runtime-loader side effects.

**Seeding nuance:** p5's `randomSeed()` and `noiseSeed()` are wrapped to seed brush randomness/noise when the addon registered correctly. Despite old upgrade prose saying brush seed APIs were removed, current `src/index.shared.js` and the published ESM still export `seed` and `noiseSeed`. Thus `brush.seed(value)` / `brush.noiseSeed(value)` are real current exports, especially relevant to standalone. Prefer p5 seed hooks for the p5 build. [Addon source](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/addon.js), [exports](https://github.com/acamposuribe/p5.brush/blob/main/src/index.shared.js), [seed implementation](https://github.com/acamposuribe/p5.brush/blob/main/src/core/utils.js).

Seed both random and noise streams before a complete render. Fix pixel density, dimensions, call order, target-switch order and paint-pass batching. Seeding supports repeatable procedural decisions, but do not promise pixel-identical GPU rasterization across devices/browsers; no such package guarantee was found. Changing layer draw order changes which random values reach each call unless application-owned per-pass seeds isolate them.

### Custom canvas, offscreen targets, and flushing

p5 can use an existing DOM canvas with `p.createCanvas(w,h,p.WEBGL,existingCanvas)`. This is p5's API, not a brush custom-canvas overload. [Official p5 createCanvas reference](https://beta.p5js.org/reference/p5/createCanvas/).

The p5 brush build supports `p5.Graphics` created in WEBGL and framebuffers created from the active main sketch. `pg.createFramebuffer()` targets are explicitly unsupported. `brush.load(target)` selects the brush destination; native p5 calls must address the same destination separately. [Official buffer guidance](https://github.com/acamposuribe/p5.brush#configuration), [target ownership checks](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/target.js).

Source-backed p5.Graphics pattern, inside an initialized p5 sketch:

```ts
const pg = p.createGraphics(500, 300, p.WEBGL);
pg.pixelDensity(1);
pg.clear();
brush.load(pg);
pg.push();
pg.translate(-250, -150);
brush.noStroke();
brush.fill('#bfcf96', 130);
brush.polygon([[50, 150], [200, 65], [430, 150], [200, 240]]);
pg.pop();
brush.load(); // restore main target before displaying pg
p.image(pg, -250, -150, 500, 300);
// pg.remove() when the application no longer owns/uses this target.
```

Source-backed framebuffer pattern:

```ts
const fb = p.createFramebuffer({ width: 500, height: 300 });
fb.draw(() => {
  p.clear();
  brush.load(fb); // fb must be active
  brush.noStroke();
  brush.fill('#d3be81', 100);
  brush.circle(0, 0, 130);
});
brush.load(); // return brush routing to the main target
p.image(fb, -250, -150, 500, 300);
// fb.remove() when no longer needed.
```

These target patterns follow [official examples](https://github.com/acamposuribe/p5.brush#configuration). p5.Framebuffer shares a WebGL context and provides a texture surface; framebuffer stencil masking additionally requires depth enabled. [p5 framebuffer reference](https://beta.p5js.org/reference/p5/createFramebuffer/).

Do not assume queued brush marks are immediately visible to native p5 image/canvas copying. The addon flushes after setup/draw; target switching is also a documented paint-batch boundary. There is no exported p5-build `render()` method. Verify the pinned package's same-frame target-switch presentation behavior; for the simplest reliable export, capture after the completed p5 draw lifecycle. [Addon](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/addon.js), [compositor](https://github.com/acamposuribe/p5.brush/blob/main/src/core/color.js), [rendering architecture](https://github.com/acamposuribe/p5.brush/blob/main/docs/rendering.md).

### Standalone build: a simpler optional browser adapter

The standalone subpath runs without p5 APIs and accepts `HTMLCanvasElement` or `OffscreenCanvas` through `brush.load(target)`. `brush.createCanvas()` needs a browser document; `load(offscreen)` does not establish that every custom-tip or image workflow works in a worker. It requires a WebGL2 context and exposes explicit `render()` flushing. This is browser independence **from p5**, not a browser-free CLI renderer. [Official standalone guide](https://github.com/acamposuribe/p5.brush/blob/main/docs/standalone.md), [target source](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/standalone/target.js).

```ts
import * as brush from 'p5.brush/standalone';

const canvas = document.createElement('canvas');
canvas.width = 500;
canvas.height = 300;
brush.load(canvas);
brush.seed(42);
brush.noiseSeed(42);
brush.clear(); // transparent
brush.push();
brush.translate(-250, -150);
brush.noStroke();
brush.fill('#b8c47b', 110);
brush.fillBleed(0.2, 'in', 0);
brush.fillTexture(0.5, 0.3, true, 0.15);
brush.polygon([[50, 150], [200, 65], [430, 150], [200, 240]]);
brush.pop();
brush.render(); // real standalone API: finish before reading/copying canvas
```

For this application, standalone is attractive because geometry is already generated externally; p5 is not needed for fish construction. Choose one adapter. Importing both build variants into one page introduces two stateful runtimes and should not be the default. Standalone is a recommendation, not a requirement to abandon the requested p5 integration.

### Fills, brushes, and medium effects

| Actual API | Supported behavior / important distinction |
| --- | --- |
| `brush.set('HB', '#333', 1)` | Selects stroke brush, color, weight. Built-ins include pencil/pen/charcoal/marker families; `brush.box()` reports installed names. |
| `brush.scaleBrushes(3)` | Multiplies registered weights, scatter and spacing by the factor; repeated calls compound. Configure once per shared module runtime, including across React remounts. |
| `brush.fill(color, opacity)` | Watercolor fill with layered polygons, irregular edge, pooling, granulation and related medium effects. Opacity uses 0–255. |
| `brush.wash(color, opacity)` | Flat fill pass, without watercolor bleed/texture. Disable with `noWash()`. |
| `brush.fillBleed(strength, direction?, angle?)` | Strength 0–1, direction `'in'` or `'out'`, angle in current angle mode. Inward bleed reduces outward spill but is not a final anatomical clip. |
| `brush.fillTexture(textureStrength, borderIntensity, scatter?, split?)` | Strengths 0–1; scatter is boolean; split controls warm/cool paint separation. It is not biological reticulation. |
| `brush.hatch(spacing, angle)` | Hatch interior with stroke settings; disable with `noHatch()`. |
| `brush.add(name, config)` | Defines a custom brush, including custom/image tips; copy the official config schema rather than inventing keys. |
| `brush.field(name)` / `noField()` | Library vector fields guide brush motion. They are not the application pigment-concentration arrays. |

All calls above are in the [official README reference](https://github.com/acamposuribe/p5.brush), [shared export list](https://github.com/acamposuribe/p5.brush/blob/main/src/index.shared.js), and [fill implementation](https://github.com/acamposuribe/p5.brush/blob/main/src/fill/fill.js). The watercolor renderer has wet-in-wet interaction within a batch, and dries at flush/end of draw or target changes; arranging layers into different batches can change visible mixing. [Rendering architecture](https://github.com/acamposuribe/p5.brush/blob/main/docs/rendering.md).

### Anatomical clipping: what will and will not work

`brush.clip([x1,y1,x2,y2])` captures a rectangular region in call-time coordinates, including current transform, and applies to subsequent strokes/hatches until `brush.noClip()`. It does not clip fill operations and does not accept a polygon. [Official clip docs](https://github.com/acamposuribe/p5.brush#brush-management), [stroke implementation](https://github.com/acamposuribe/p5.brush/blob/main/src/stroke/stroke.js), [clip shader uniforms](https://github.com/acamposuribe/p5.brush/blob/main/src/stroke/clip.js).

Drawing `brush.polygon(regionContour)` supplies the shape being painted, but watercolor edge growth can extend outside it. It is therefore not a guarantee that fill pixels stay inside a fish or avoid its eye. Nor should native p5 `clip()` be assumed to mask every internal brush framebuffer/shader pass: no explicit arbitrary-fill-mask guarantee was found in the brush docs. [Fill design](https://github.com/acamposuribe/p5.brush/blob/main/docs/rendering.md).

**Recommended final-mask composition, application-owned:**

1. Paint one region/layer or a planned paint group onto a transparent reusable WebGL surface.
2. Finish the brush batch/lifecycle before reading it.
3. Copy to an equally sized Canvas2D surface, then use `destination-in` with a filled anatomical path (with holes), or clip the Canvas2D destination before drawing the source image.
4. Composite the masked surface onto the final illustration in semantic paint order; draw original ink strokes last, respecting near-fin occlusion and eye protection.

Canvas2D `clip(path, 'evenodd')` supports a path-defined mask; save/restore the 2D state around each region. It acts on the 2D destination, not the source's WebGL context. [Canvas2D clipping reference](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip).

The tradeoff is readback/copy and additional surfaces. Reuse one paint buffer and one mask/composite buffer instead of allocating one WebGL context per anatomical region. For an advanced renderer, an alpha-mask texture multiplied in a final shader avoids CPU copies, but is application shader work; p5.brush does not expose it as `brush.mask(region)`.

### Lifecycle, browser support, license, and exports

- **Cleanup:** p5 `remove()` stops its draw loop and removes sketch-created HTML elements. Remove owned graphics/framebuffers, application listeners, observers and export object URLs; cancel stale async work. Brush's public exports contain no full runtime `dispose()`/`destroy()`. Internal resource removal exists, but do not advertise a public cleanup API or guaranteed leak-free concurrent React mounts. Prefer one reusable renderer and measure repeated mount/unmount behavior. [p5 remove](https://p5js.org/reference/p5/remove/), [brush exports](https://github.com/acamposuribe/p5.brush/blob/main/src/index.shared.js), [GL stroke resource management](https://github.com/acamposuribe/p5.brush/blob/main/src/stroke/gl_draw.js).
- **Runtime:** require actual WebGL2 availability. The official repository's smoke infrastructure uses `playwright-chromium`; this is not a published Chrome/Firefox/Safari/mobile support matrix. No exact minimum browser versions or cross-GPU pixel-equivalence guarantee were found. Fall back to flat pure-renderer color/ink if context creation fails. Bound texture resolution and pixel density because multiple backing buffers scale with pixel count. [Package scripts](https://github.com/acamposuribe/p5.brush/blob/main/package.json), [p5 target validation](https://github.com/acamposuribe/p5.brush/blob/main/src/adapters/p5/target.js), [standalone guide](https://github.com/acamposuribe/p5.brush/blob/main/docs/standalone.md).
- **License:** p5.brush is MIT, with copyright/license notice retention requirements. p5 2.3.4 declares LGPL-2.1; inspect its distributed notice when packaging it. These are separate dependencies and licenses. [Brush license](https://github.com/acamposuribe/p5.brush/blob/main/LICENSE.md), [p5 official package metadata](https://registry.npmjs.org/p5/2.3.4).
- **Raster export:** p5 `saveCanvas()` supports PNG/JPEG/WebP; capture after painting has flushed. For a Canvas2D-composited final output, export that final canvas rather than the unmasked brush source. Standalone exposes its canvas, so native `toBlob()` is an application export path, not `brush.savePNG()`. [Official p5 saveCanvas](https://beta.p5js.org/reference/p5/savecanvas/), [standalone canvas access](https://github.com/acamposuribe/p5.brush/blob/main/docs/standalone.md).
- **SVG/CLI:** brush is a raster/WebGL renderer and exports no vector-SVG renderer. Keep current `draw_svg`, `draw_ps`, and CLI geometry imports free of p5/browser dependencies. Optional colored SVG should use pure polygons, gradients and clip paths computed from the same fields; embedding a PNG in SVG is a raster export and should be labeled accordingly. This is an architecture recommendation based on [brush public exports](https://github.com/acamposuribe/p5.brush/blob/main/src/index.shared.js) and [existing repository exports](../../fishdraw.ts).

## 6. Recommended minimum comprehensive first implementation

This is a proposed first release with enough anatomical and field structure to support future refinement:

1. **Semantic scene extraction with no geometry drift:** trunk, head, all visible fins/finlets, eye, rays, attachment curves and lateral-line path; one shared output transform. Keep the existing legacy drawing output unchanged for fixed seeds.
2. **Pure deterministic color plan:** independent color seed; shared body-space field; per-region modulation; at least dark, warm-pigment and reflective/white channels; separate countershading. Make red an optional separate channel rather than forcing it into every palette.
3. **Broad visual families:** stripes/bars, spots, labyrinth/reticulation, explicit ocellus and fin-margin bands. Begin with analytic fields for predictable performance. An optional CPU Gray–Scott backend can share the interface, but a full developmental simulator is not necessary to claim layered procedural coloration.
4. **Two honest coupling controls:** shared-phase correlation across regions and cross-pigment alignment/avoidance. Add root-fading body-to-fin continuation. Reserve “transport/exchange coupling” for a solver that actually exchanges field values through anatomical seams.
5. **Mask-correct paint:** p5.brush 3.0.0 browser adapter (standalone is simplest; p5 2.3.4 instance mode is viable with registration handled), watercolor base/marks, restrained reflective highlights, final exact anatomy mask, original ink above paint. Reuse buffers and fix seeds/density.
6. **Useful controls and exports:** palette, overall paint opacity, countershading, wavelength/coverage/orientation, local variation, anatomy coupling, pigment coupling, fin transparency, bleed/texture and renderer mode. Preserve CLI/SVG; add browser PNG of the final composite with seed/render metadata.
7. **Acceptance evidence for the implementing parent:** unchanged seeded polylines; mask overlays match actual outlines across absent/overlapping/connected-fin variants; no eye spill; continuous root phase at high coupling and intentional independence at zero; deterministic field checksums; stale-render cancellation; repeated mount cleanup; WebGL failure fallback; PNG includes final masks and ink. Compare GPU images with a tolerance rather than promising device-independent byte equality.

Defer biologically calibrated cell agents, growth simulation, real multilayer spectral optics, and species-accurate pigment distributions to later work. Label presets “inspired by,” and distinguish biological pattern parameters from watercolor-medium parameters throughout the UI.

## 7. Source list and research limits

### Primary biological and mathematical sources

- Turing (1952), *The Chemical Basis of Morphogenesis*. [DOI](https://doi.org/10.1098/rstb.1952.0012); [paper scan](https://www.marconlab.org/papers/turing.pdf).
- Kondo & Asai (1995), *A reaction–diffusion wave on the skin of the marine angelfish Pomacanthus*. [Study abstract/DOI](https://pubmed.ncbi.nlm.nih.gov/24547605/).
- Pearson (1993), *Complex Patterns in a Simple System*. [Author manuscript](https://arxiv.org/abs/patt-sol/9304003); [published scan](https://www.staff.science.uu.nl/~frank011/Classes/complexity/Literature/Pearson.pdf).
- Hirata et al. (2003), *Pigment cell organization in the hypodermis of zebrafish*. [Publisher](https://anatomypubs.onlinelibrary.wiley.com/doi/full/10.1002/dvdy.10334).
- Hirata et al. (2005), *Pigment cell distributions in different tissues of the zebrafish*. [Authors' PDF](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/hirata2005.pdf).
- Nakamasu et al. (2009), *Interactions between zebrafish pigment cells responsible for the generation of Turing patterns*. [Authors' PDF](https://www.fbs.osaka-u.ac.jp/labs/skondo/paper/Nakamasu2009.pdf).
- Watanabe & Kondo (2012), *Changing clothes easily: connexin41.8 regulates skin pattern variation*. [Study abstract](https://pubmed.ncbi.nlm.nih.gov/22313791/).
- Frohnhöfer et al. (2013), *Iridophores and their interactions with other chromatophores are required for stripe formation in zebrafish*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC3912879/).
- Patterson & Parichy (2013), *Interactions with Iridophores and the Tissue Environment…*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC3667786/).
- Patterson et al. (2014), *Pigment cell interactions and differential xanthophore recruitment…*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC4224114/).
- Irion et al. (2014), *Gap junctions composed of connexins 41.8 and 39.4…*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC4296512/).
- Volkening & Sandstede (2015), *Modelling stripe formation in zebrafish: an agent-based approach*. [Study record](https://pubmed.ncbi.nlm.nih.gov/26538560/).
- Eom et al. (2015/2016), *Long-distance communication by specialized cellular projections…*. [Full text and peer review](https://elifesciences.org/articles/12401).
- Walderich et al. (2016), *Homotypic cell competition regulates proliferation and tiling…*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC4853480/).
- Kelley & Merilaita (2015), rainbowfish countershading experiment. [Authors' institutional record](https://research-repository.uwa.edu.au/en/publications/testing-the-role-of-background-matching-and-self-shadow-concealme/).
- Gur et al. (2018), *The Dual Functional Reflecting Iris of the Zebrafish*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC6097150/).
- Cal et al. (2019), *Countershading in zebrafish results from an Asip1 controlled dorsoventral gradient…*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC6401153/).
- Lewis et al. (2019), *Fate plasticity and reprogramming in genetically distinct populations of Danio leucophores*. [DOI](https://doi.org/10.1073/pnas.1901021116).
- Volkening et al. (2019), *Modeling stripe formation on growing zebrafish tailfins*. [Preprint](https://arxiv.org/abs/1911.03758); [full text](https://arxiv.org/html/1911.03758v1).
- Gur et al. (2020), *In situ differentiation of iridophore crystallotypes…*. [Original article](https://www.nature.com/articles/s41467-020-20088-1).
- Sušnik Bajec et al. (2022), brown-trout erythrophore study. [Original article](https://www.nature.com/articles/s41598-022-04799-7).
- Gur et al. (2024), *The physical and cellular mechanism of structural color change in zebrafish*. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC11161791/).

### Official software sources

- [p5.brush npm registry metadata](https://registry.npmjs.org/p5.brush/3.0.0) and [exact tarball](https://registry.npmjs.org/p5.brush/-/p5.brush-3.0.0.tgz).
- [p5.brush README](https://github.com/acamposuribe/p5.brush), [rendering design](https://github.com/acamposuribe/p5.brush/blob/main/docs/rendering.md), [standalone guide](https://github.com/acamposuribe/p5.brush/blob/main/docs/standalone.md).
- [Immutable inspected main tree](https://github.com/acamposuribe/p5.brush/tree/d56350a647d0b098a9e79d397447a8094f6c45a4), [published gitHead](https://github.com/acamposuribe/p5.brush/tree/75c89fd8e0a0b63d9a88b51983c0738e132e82a5).
- [p5 2.3.4 metadata](https://registry.npmjs.org/p5/2.3.4), [createCanvas](https://beta.p5js.org/reference/p5/createCanvas/), [createFramebuffer](https://beta.p5js.org/reference/p5/createFramebuffer/), [saveCanvas](https://beta.p5js.org/reference/p5/savecanvas/), [remove](https://p5js.org/reference/p5/remove/).

### Verification boundaries

Context7 resolved `/acamposuribe/p5.brush` and returned instance/addon source excerpts. These were cross-checked against downloaded official repository files and the published npm tarball, including the real exported names and ESM registration guard. Registry versions were checked live, not inferred from old examples. No application dependencies were installed or modified. Examples were not run in a browser; browser compatibility, GPU output and memory cleanup remain integration acceptance checks.

Some publisher/PMC endpoints returned access checks or redirects. Where available, author-hosted PDFs, indexed original-paper abstracts, and original publisher records were used instead. Broad fish anatomy uses an institutional teaching reference; the cellular and mathematical claims use original research. No claim is made that a single paper establishes the pigment organization of every species or every life stage.

## Implementation supplement: Schnakenberg Turing backend

The implementation additionally uses the [Schnakenberg autocatalytic reaction system (1979)](https://doi.org/10.1016/0022-5193(79)90042-0), with the two-source nondimensional reaction–diffusion form `f=a-u+u²v`, `g=b-u²v` and homogeneous Neumann boundaries studied in [Yan Li, Steady-state solution for a general Schnakenberg model (2011)](https://www.sciencedirect.com/science/article/abs/pii/S146812181000324X). This is a mathematical pattern generator, not identified fish-pigment chemistry.

The following coefficient choice and calculation are application-specific: `a=.1,b=.9,Du=.045,Dv=.65` give equilibrium `(1,.9)` and reaction Jacobian `[[.8,1],[-1.8,-1]]`, with trace `-.2` and determinant `1`. The diffusion-weighted combination is `.475 > 0`; its square `.225625` exceeds `4*Du*Dv*det(J)=.117`. Thus continuum modes can become unstable under unequal diffusion while the spatially homogeneous reaction equilibrium is stable. Whether an individual finite anatomical domain admits a growing discrete mode also depends on its lattice, seams, and boundary spectrum. The numerical tests check seeded perturbation growth and bounded fields, not biological validation.
