import type { DialConfig, ResolvedValues } from 'dialkit';
import type { FishParams } from '../fishdraw.ts';
import { resolveTraits, traitOptions, type FishTraitExtensions } from '../traits/index.ts';
import { finArrangements, lateralLines } from '../traits/anatomy.ts';
import { colorPatterns, paletteFamilies } from '../traits/color.ts';
import { formats } from '../formats.ts';

/** The editor is split by what a control changes, so each panel reads as one
 * concern: Specimen (which fish), Anatomy (its form), Surface (skin, markings
 * and colour) and Output (reset and export). Panels never share a key. */

const select = (options: { value: string; label: string }[], value: number) =>
  ({ type: 'select', options, default: String(value) }) as const;
const choices = (...labels: string[]) => labels.map((label, i) => ({ value: String(i), label }));

export function anatomyConfig(p: FishParams, extensions: FishTraitExtensions = {}) {
  const traits = resolveTraits(extensions);
  return {
    body: {
      length: [p.body_length, 200, 520, 1],
      height: [p.body_height, 28, 170, 1],
      curve: [p.body_curve_amount, 0.5, 0.98, 0.01],
      shape: select(traitOptions(traits.shapes), p.body_curve_type),
    },
    fins: {
      dorsal: [p.dorsal_length, 10, 180, 1],
      pectoral: [p.wing_length, 20, 350, 1],
      pelvic: [p.pelvic_length, 10, 140, 1],
      anal: [p.anal_length, 10, 90, 1],
      tail: [p.tail_length, 30, 180, 1],
      tailShape: select(traitOptions(traits.tails), p.tail_type),
      arrangement: select(traitOptions(finArrangements), p.finlet_type),
      finRays: select(choices('Soft membrane', 'Prominent rays'), p.dorsal_texture_type),
    },
    finLayout: {
      _collapsed: true,
      dorsalFin: Boolean(p.has_dorsal),
      pectoralFin: Boolean(p.has_pectoral),
      pelvicFin: Boolean(p.has_pelvic),
      analFin: Boolean(p.has_anal),
      dorsalOrigin: [p.dorsal_start, 6, 24, 1],
      dorsalSpan: [p.dorsal_end - p.dorsal_start, 3, 22, 1],
      analOrigin: [p.anal_start, 14, 25, 1],
      analSpan: [p.anal_end - p.anal_start, 3, 17, 1],
    },
    face: {
      _collapsed: true,
      eye: [p.eye_size, 8, 28, 0.5],
      snoutLength: [p.head_length, 10, 100, 1],
      snoutHeight: [p.nose_height, -50, 35, 1],
      jaw: [p.jaw_size, 0.7, 1.4, 0.05],
      mouthOpen: [p.jaw_open, 0, 1, 0.05],
      mouthPosition: select(choices('Terminal', 'Underside / subterminal'), p.mouth_position),
      teeth: Boolean(p.has_teeth),
    },
    barbels: {
      _collapsed: true,
      moustache: Boolean(p.has_moustache),
      barbelsLength: [p.moustache_length, 10, 60, 1],
      beard: Boolean(p.has_beard),
      chinBarbelsLength: [p.beard_length, 10, 60, 1],
      barbelsOrigin: select(choices('Chin', 'Under snout'), p.barbel_type),
    },
  } satisfies DialConfig;
}

export function surfaceConfig(p: FishParams, extensions: FishTraitExtensions = {}, color = true) {
  const traits = resolveTraits(extensions);
  return {
    skin: {
      scales: select(traitOptions(traits.textures), p.scale_type),
      scaleSize: [p.scale_scale, 0.65, 2, 0.05],
    },
    markings: {
      pattern: select(traitOptions(traits.markings), p.pattern_type),
      patternSize: [p.pattern_scale, 0.5, 2.5, 0.05],
      ocellus: Boolean(p.has_ocellus),
      lateralLine: select(traitOptions(lateralLines), p.lateral_line_type),
    },
    color: {
      inColor: color,
      palette: select(paletteFamilies.map(f => ({ value: String(f.id), label: f.label })), p.color_palette),
      hueShift: [p.color_hue_shift, -30, 30, 1],
      pigment: select(colorPatterns.map(c => ({ value: String(c.id), label: c.label })), p.color_pattern),
      pigmentSize: [p.color_pattern_scale, 0.6, 2, 0.05],
      contrast: [p.color_contrast, 0, 1, 0.05],
      finMargins: Boolean(p.color_fin_margin),
      eyeBar: Boolean(p.color_eye_bar),
    },
  } satisfies DialConfig;
}

export const renderers = [
  { value: 'engraved', label: 'Engraved · SVG hatching' },
  { value: 'watercolour', label: 'Watercolour · p5.brush' },
];

export function outputConfig() {
  return {
    reset: { type: 'action', label: 'Reset' },
    renderer: { type: 'select', options: renderers, default: 'engraved' },
    export: {
      _collapsed: true,
      format: { type: 'select', options: [...formats, 'png'], default: 'svg' },
      speed: [1, 0.5, 4, 0.5],
      download: { type: 'action' },
    },
  } satisfies DialConfig;
}

export type AnatomyControls = ResolvedValues<ReturnType<typeof anatomyConfig>>;
export type SurfaceControls = ResolvedValues<ReturnType<typeof surfaceConfig>>;

export function anatomyOverrides(v: AnatomyControls): Partial<FishParams> {
  return {
    body_length: v.body.length, body_height: v.body.height,
    body_curve_amount: v.body.curve, body_curve_type: Number(v.body.shape),
    dorsal_length: v.fins.dorsal, wing_length: v.fins.pectoral, pelvic_length: v.fins.pelvic,
    anal_length: v.fins.anal, tail_length: v.fins.tail, tail_type: Number(v.fins.tailShape),
    finlet_type: Number(v.fins.arrangement), dorsal_texture_type: Number(v.fins.finRays),
    has_dorsal: Number(v.finLayout.dorsalFin), has_pectoral: Number(v.finLayout.pectoralFin),
    has_pelvic: Number(v.finLayout.pelvicFin), has_anal: Number(v.finLayout.analFin),
    dorsal_start: v.finLayout.dorsalOrigin, dorsal_end: Math.min(31, v.finLayout.dorsalOrigin + v.finLayout.dorsalSpan),
    anal_start: v.finLayout.analOrigin, anal_end: Math.min(31, v.finLayout.analOrigin + v.finLayout.analSpan),
    eye_size: v.face.eye, head_length: v.face.snoutLength, nose_height: v.face.snoutHeight,
    jaw_size: v.face.jaw, jaw_open: v.face.mouthOpen, mouth_position: Number(v.face.mouthPosition),
    has_teeth: Number(v.face.teeth),
    has_moustache: Number(v.barbels.moustache), moustache_length: v.barbels.barbelsLength,
    has_beard: Number(v.barbels.beard), beard_length: v.barbels.chinBarbelsLength,
    barbel_type: Number(v.barbels.barbelsOrigin),
  };
}

export function surfaceOverrides(v: SurfaceControls): Partial<FishParams> {
  return {
    scale_type: Number(v.skin.scales), scale_scale: v.skin.scaleSize,
    pattern_type: Number(v.markings.pattern), pattern_scale: v.markings.patternSize,
    has_ocellus: Number(v.markings.ocellus), lateral_line_type: Number(v.markings.lateralLine),
    color_enabled: Number(v.color.inColor), color_palette: Number(v.color.palette),
    color_hue_shift: v.color.hueShift, color_pattern: Number(v.color.pigment),
    color_pattern_scale: v.color.pigmentSize, color_contrast: v.color.contrast,
    color_fin_margin: Number(v.color.finMargins), color_eye_bar: Number(v.color.eyeBar),
  };
}

export function parameterOverrides(anatomy: AnatomyControls, surface: SurfaceControls): Partial<FishParams> {
  return { ...anatomyOverrides(anatomy), ...surfaceOverrides(surface) };
}
