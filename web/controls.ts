import type { DialConfig, ResolvedValues } from 'dialkit';
import type { FishParams } from '../fishdraw.ts';
import { resolveTraits, traitOptions, type FishTraitExtensions } from '../traits/index.ts';
import { finArrangements, lateralLines } from '../traits/anatomy.ts';

export function controlConfig(p: FishParams, extensions: FishTraitExtensions = {}) {
  const traits = resolveTraits(extensions);
  return {
    body: {
      length: [p.body_length, 200, 520, 1],
      height: [p.body_height, 28, 170, 1],
      curve: [p.body_curve_amount, 0.5, 0.98, 0.01],
      shape: { type: 'select', options: traitOptions(traits.shapes), default: String(p.body_curve_type) },
    },
    texture: {
      scales: { type: 'select', options: traitOptions(traits.textures), default: String(p.scale_type) },
      scaleSize: [p.scale_scale, 0.65, 2, 0.05],
      pattern: { type: 'select', options: traitOptions(traits.markings), default: String(p.pattern_type) },
      patternSize: [p.pattern_scale, 0.5, 2.5, 0.05],
      ocellus: Boolean(p.has_ocellus),
      lateralLine: { type: 'select', options: traitOptions(lateralLines), default: String(p.lateral_line_type) },
    },
    fins: {
      dorsal: [p.dorsal_length, 10, 180, 1],
      pectoral: [p.wing_length, 20, 350, 1],
      pelvic: [p.pelvic_length, 10, 140, 1],
      anal: [p.anal_length, 10, 90, 1],
      tail: [p.tail_length, 30, 180, 1],
      tailShape: { type: 'select', options: traitOptions(traits.tails), default: String(p.tail_type) },
      arrangement: { type: 'select', options: traitOptions(finArrangements), default: String(p.finlet_type) },
    },
    anatomy: {
      _collapsed: true,
      dorsalFin: Boolean(p.has_dorsal),
      pectoralFin: Boolean(p.has_pectoral),
      pelvicFin: Boolean(p.has_pelvic),
      analFin: Boolean(p.has_anal),
      dorsalOrigin: [p.dorsal_start, 6, 24, 1],
      dorsalSpan: [p.dorsal_end - p.dorsal_start, 3, 22, 1],
      analOrigin: [p.anal_start, 14, 25, 1],
      analSpan: [p.anal_end - p.anal_start, 3, 17, 1],
      finRays: { type: 'select', options: [{ value: '0', label: 'Soft membrane' }, { value: '1', label: 'Prominent rays' }], default: String(p.dorsal_texture_type) },
    },
    face: {
      _collapsed: true,
      eye: [p.eye_size, 8, 28, 0.5],
      jaw: [p.jaw_size, 0.7, 1.4, 0.05],
      mouthOpen: [p.jaw_open, 0, 1, 0.05],
      mouthPosition: { type: 'select', options: [{ value: '0', label: 'Terminal' }, { value: '1', label: 'Underside / subterminal' }], default: String(p.mouth_position) },
      snoutLength: [p.head_length, 10, 100, 1],
      snoutHeight: [p.nose_height, -50, 35, 1],
      barbelsLength: [p.moustache_length, 10, 60, 1],
      chinBarbelsLength: [p.beard_length, 10, 60, 1],
      barbelsOrigin: { type: 'select', options: [{ value: '0', label: 'Chin' }, { value: '1', label: 'Under snout' }], default: String(p.barbel_type) },
      teeth: Boolean(p.has_teeth),
      moustache: Boolean(p.has_moustache),
      beard: Boolean(p.has_beard),
    },
  } satisfies DialConfig;
}

export type Controls = ResolvedValues<ReturnType<typeof controlConfig>>;
export function parameterOverrides(v: Controls): Partial<FishParams> {
  return {
    body_length: v.body.length, body_height: v.body.height,
    body_curve_amount: v.body.curve, body_curve_type: Number(v.body.shape),
    scale_type: Number(v.texture.scales), scale_scale: v.texture.scaleSize,
    pattern_type: Number(v.texture.pattern), pattern_scale: v.texture.patternSize,
    has_ocellus: Number(v.texture.ocellus), lateral_line_type: Number(v.texture.lateralLine),
    dorsal_length: v.fins.dorsal, wing_length: v.fins.pectoral, pelvic_length: v.fins.pelvic,
    anal_length: v.fins.anal, tail_length: v.fins.tail, tail_type: Number(v.fins.tailShape),
    finlet_type: Number(v.fins.arrangement),
    has_dorsal: Number(v.anatomy.dorsalFin), has_pectoral: Number(v.anatomy.pectoralFin),
    has_pelvic: Number(v.anatomy.pelvicFin), has_anal: Number(v.anatomy.analFin),
    dorsal_start: v.anatomy.dorsalOrigin, dorsal_end: Math.min(31, v.anatomy.dorsalOrigin + v.anatomy.dorsalSpan),
    anal_start: v.anatomy.analOrigin, anal_end: Math.min(31, v.anatomy.analOrigin + v.anatomy.analSpan),
    dorsal_texture_type: Number(v.anatomy.finRays),
    eye_size: v.face.eye, jaw_size: v.face.jaw, jaw_open: v.face.mouthOpen,
    head_length: v.face.snoutLength, nose_height: v.face.snoutHeight, moustache_length: v.face.barbelsLength,
    beard_length: v.face.chinBarbelsLength, barbel_type: Number(v.face.barbelsOrigin), mouth_position: Number(v.face.mouthPosition),
    has_teeth: Number(v.face.teeth), has_moustache: Number(v.face.moustache), has_beard: Number(v.face.beard),
  };
}
