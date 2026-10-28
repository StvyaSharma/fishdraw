import { default_params, generate, parameters_for_seed, str_to_seed, type FishParams } from './fishdraw.ts';
import { fishTraits } from './traits/index.ts';

export interface FishPreset {
  id: string;
  label: string;
  description: string;
  source: string;
  params: Partial<FishParams>;
}

/** Artistic inspirations: proportions and visible ray/plate counts are simplified.
 * The research and anatomical limitations are in docs/fish-morphology.md. */
export const fishPresets: readonly FishPreset[] = [
  {
    id: 'tuna', label: 'Bluefin tuna',
    description: 'A tapered torpedo, crescent tail, two dorsals and paired finlet trains.',
    source: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/bluefin-tuna/',
    params: { body_curve_type: 2, body_length: 390, body_height: 105, scale_type: 4, pattern_type: 10,
      dorsal_type: 1, dorsal_length: 65, dorsal_start: 10, dorsal_end: 18, finlet_type: 4,
      wing_length: 65, wing_type: 1, pelvic_length: 25, anal_length: 38, anal_start: 19, anal_end: 24,
      tail_type: 5, tail_length: 105, eye_size: 9, lateral_line_type: 1 },
  },
  {
    id: 'butterflyfish', label: 'Foureye butterflyfish',
    description: 'A deep oval with comb-edged scales, chevrons, an ocellus and an arched lateral line.',
    source: 'https://biogeodb.stri.si.edu/caribbean/en/thefishes/species/3842',
    params: { body_curve_type: 3, body_length: 240, body_height: 145, scale_type: 6, scale_scale: 0.9,
      pattern_type: 6, pattern_scale: 1.4, has_ocellus: 1, lateral_line_type: 2,
      dorsal_length: 55, dorsal_start: 7, dorsal_end: 28, anal_length: 55, anal_start: 16, anal_end: 29,
      wing_length: 50, pelvic_length: 40, tail_type: 1, tail_length: 55, head_length: 16, eye_size: 11 },
  },
  {
    id: 'moray', label: 'Reticulated moray',
    description: 'A long, smooth body with a pigment network and continuous median fins; no paired fins.',
    source: 'https://fishesofaustralia.net.au/Home/family/44',
    params: { body_curve_type: 4, body_length: 480, body_height: 48, scale_type: 4, pattern_type: 7,
      pattern_scale: 0.85, has_pectoral: 0, has_pelvic: 0, finlet_type: 5, dorsal_length: 45,
      anal_length: 28, tail_type: 7, tail_length: 55, has_teeth: 1, teeth_length: 5,
      head_length: 40, eye_size: 8, head_texture_amount: 10 },
  },
  {
    id: 'pike', label: 'Northern pike',
    description: 'An elongated predator with rear-set fins, long jaws and teeth; pale spots are outlined.',
    source: 'https://wdfw.wa.gov/species-habitats/invasive/esox-lucius',
    params: { body_curve_type: 5, body_length: 440, body_height: 58, scale_type: 5, scale_scale: 0.8,
      pattern_type: 9, pattern_scale: 0.7, dorsal_start: 22, dorsal_end: 29, dorsal_length: 55,
      anal_start: 23, anal_end: 30, anal_length: 40, pelvic_start: 15, pelvic_end: 19,
      wing_length: 45, pelvic_length: 40, tail_type: 2, tail_length: 65,
      head_length: 70, mouth_size: 11, jaw_size: 1.25, has_teeth: 1, teeth_length: 6, lateral_line_type: 1 },
  },
  {
    id: 'sturgeon', label: 'Atlantic sturgeon',
    description: 'An elongated body with rows of scutes, a long snout, underside barbels and an unequal tail.',
    source: 'https://biogeodb.stri.si.edu/caribbean/en/thefishes/species/2760',
    params: { body_curve_type: 5, body_length: 420, body_height: 70, scale_type: 9, pattern_type: 0,
      dorsal_start: 23, dorsal_end: 29, dorsal_length: 60, wing_length: 65,
      anal_start: 24, anal_end: 30, anal_length: 30, tail_type: 8, tail_length: 100,
      head_length: 70, nose_height: 12, mouth_size: 6, mouth_position: 1,
      has_beard: 1, barbel_type: 1, beard_length: 22, eye_size: 8 },
  },
  {
    id: 'lionfish', label: 'Red lionfish',
    description: 'Exaggerated dorsal spines and pectoral rays, smooth-edged scales and dark bars.',
    source: 'https://australian.museum/learn/animals/fishes/common-lionfish-pterois-volitans/',
    params: { body_curve_type: 3, body_length: 270, body_height: 95, scale_type: 5, pattern_type: 3,
      pattern_scale: 0.55, dorsal_texture_type: 1, dorsal_length: 170, dorsal_start: 7, dorsal_end: 27,
      wing_texture_type: 1, wing_length: 200, wing_width: 35, pelvic_length: 95,
      tail_type: 1, tail_length: 65, anal_length: 55, eye_size: 13 },
  },
  {
    id: 'catfish', label: 'Channel catfish',
    description: 'Smooth skin, scattered spots, visible barbels, an adipose fin and a forked tail.',
    source: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/channel-catfish/',
    params: { body_curve_type: 5, body_length: 370, body_height: 90, scale_type: 4, pattern_type: 1,
      pattern_scale: 0.85, dorsal_type: 1, dorsal_start: 10, dorsal_end: 17, dorsal_length: 65,
      finlet_type: 2, tail_type: 2, tail_length: 85, has_moustache: 1, moustache_length: 42,
      has_beard: 1, beard_length: 28, nose_height: 12, mouth_size: 7, mouth_position: 1,
      anal_start: 18, anal_end: 29, anal_length: 42, wing_length: 65, eye_size: 9 },
  },
  {
    id: 'gar', label: 'Florida gar',
    description: 'Diamond armor and scattered spots, with a long toothy snout and rear-set fins.',
    source: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/florida-gar/',
    params: { body_curve_type: 5, body_length: 450, body_height: 55, scale_type: 7, pattern_type: 1,
      pattern_scale: 0.8, dorsal_start: 23, dorsal_end: 29, dorsal_length: 40,
      anal_start: 24, anal_end: 30, anal_length: 30, wing_length: 40, pelvic_length: 30,
      tail_type: 1, tail_length: 60, head_length: 95, mouth_size: 11, has_teeth: 1, teeth_length: 5, eye_size: 8 },
  },
];

export const fishInspirations = [
  { id: 'procedural', label: 'Original procedural fish', description: 'The original seeded generator.' },
  { id: 'explorer', label: 'Explore all traits', description: 'Seeded combinations from the complete trait catalog.' },
  ...fishPresets,
];

/** A separate stream leaves the original seeded generator unchanged. */
function explorationParameters(seed: string): FishParams {
  const params = parameters_for_seed(seed);
  let state = str_to_seed(`${seed}:traits`) || 0x5eed;
  function choose<T>(entries: readonly T[]): T {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return entries[Math.floor((state >>> 0) / 4294967296 * entries.length)];
  }
  params.body_curve_type = choose(fishTraits.shapes).id;
  params.scale_type = choose(fishTraits.textures).id;
  params.pattern_type = choose(fishTraits.markings).id;
  params.tail_type = choose(fishTraits.tails).id;
  params.finlet_type = choose([0, 2, 3, 4]);
  params.lateral_line_type = choose([0, 1, 2]);
  params.has_ocellus = choose([0, 0, 0, 1]);
  if (params.body_curve_type === 4) {
    params.finlet_type = 5;
    params.has_pectoral = 0;
    params.has_pelvic = 0;
    params.body_length = Math.max(420, params.body_length);
    params.body_height = Math.max(28, params.body_height * 0.6);
  }
  return params;
}

export function parameters_for_preset(seed: string, presetId = 'procedural'): FishParams {
  if (presetId === 'procedural') return parameters_for_seed(seed);
  if (presetId === 'explorer') return explorationParameters(seed);
  const preset = fishPresets.find(p => p.id === presetId);
  if (!preset) throw new Error(`Unknown fish inspiration: ${presetId}.`);
  const params: FishParams = {
    ...default_params(),
    has_moustache: 0, has_beard: 0, has_teeth: 0, jaw_open: 0.15,
    head_texture_amount: 25, dorsal_texture_type: 0, wing_length: 70,
    pelvic_length: 45, anal_length: 40, finlet_type: 0, pattern_type: 0,
    ...preset.params,
  };
  // A preset selects anatomical families, not a frozen specimen. Separate
  // seeded sampling changes proportions without adding inappropriate anatomy.
  let state = str_to_seed(`${seed}:inspiration:${presetId}`) || 0x5eed;
  function random() {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  }
  const triangular = () => random() + random() - 1;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const fields: readonly [keyof FishParams, number, number, number][] = [
    ['body_length', 0.24, 200, 520], ['body_height', 0.38, 28, 170],
    ['dorsal_length', 0.4, 10, 180], ['wing_length', 0.4, 20, 350],
    ['pelvic_length', 0.35, 10, 140], ['anal_length', 0.4, 10, 90],
    ['tail_length', 0.32, 30, 180], ['head_length', 0.3, 10, 100],
    ['scale_scale', 0.35, 0.65, 2], ['pattern_scale', 0.45, 0.5, 2.5],
    ['eye_size', 0.3, 8, 28], ['jaw_size', 0.15, 0.7, 1.4],
    ['moustache_length', 0.4, 10, 60], ['beard_length', 0.4, 10, 60],
  ];
  for (const [key, amount, min, max] of fields) {
    params[key] = clamp(params[key] * (1 + triangular() * amount), min, max);
  }
  params.beard_length = Math.round(params.beard_length);
  params.moustache_length = Math.round(params.moustache_length);
  params.body_curve_amount = clamp(params.body_curve_amount + triangular() * 0.15, 0.5, 0.98);
  params.nose_height = clamp(params.nose_height + triangular() * params.body_height * 0.12, -50, 35);
  params.jaw_open = clamp(params.jaw_open + triangular() * 0.16, 0.03, 0.45);
  params.head_texture_amount = Math.round(params.head_texture_amount * (0.5 + random()));
  const dorsalSpan = params.dorsal_end - params.dorsal_start;
  params.dorsal_start = Math.round(clamp(params.dorsal_start + triangular() * 3, 6, 24));
  params.dorsal_end = Math.round(clamp(params.dorsal_start + dorsalSpan + triangular() * 3, params.dorsal_start + 3, 31));
  const analSpan = params.anal_end - params.anal_start;
  params.anal_start = Math.round(clamp(params.anal_start + triangular() * 2, 14, 25));
  params.anal_end = Math.round(clamp(params.anal_start + analSpan + triangular() * 2, params.anal_start + 3, 31));
  return params;
}

export function generate_preset(seed: string, presetId: string, overrides: Partial<FishParams> = {}) {
  return generate(seed, { ...parameters_for_preset(seed, presetId), ...overrides });
}
