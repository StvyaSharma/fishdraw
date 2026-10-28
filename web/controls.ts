import type { DialConfig, ResolvedValues } from 'dialkit';
import type { FishParams } from '../fishdraw.ts';

export function controlConfig(p: FishParams) {
  return {
    body: {
      length: [p.body_length, 200, 420, 1],
      height: [p.body_height, 45, 150, 1],
      curve: [p.body_curve_amount, 0.5, 0.98, 0.01],
      shape: { type: 'select', options: [{ value: '0', label: 'Rounded' }, { value: '1', label: 'Tapered' }], default: String(p.body_curve_type) },
    },
    texture: {
      scales: { type: 'select', options: [
        { value: '0', label: 'Layered' }, { value: '1', label: 'Fine' },
        { value: '2', label: 'Crosshatch' }, { value: '3', label: 'Veined' },
      ], default: String(p.scale_type) },
      scaleSize: [p.scale_scale, 0.8, 1.5, 0.05],
      pattern: { type: 'select', options: [
        { value: '0', label: 'None' }, { value: '1', label: 'Spots' },
        { value: '2', label: 'Mottled' }, { value: '3', label: 'Stripes' }, { value: '4', label: 'Stipple' },
      ], default: String(p.pattern_type) },
      patternSize: [p.pattern_scale, 0.5, 2, 0.05],
    },
    fins: {
      dorsal: [p.dorsal_length, 30, 180, 1],
      pectoral: [p.wing_length, 40, 350, 1],
      pelvic: [p.pelvic_length, 30, 140, 1],
      anal: [p.anal_length, 20, 80, 1],
      tail: [p.tail_length, 50, 180, 1],
      tailShape: { type: 'select', options: [
        { value: '0', label: 'Ruffled' }, { value: '1', label: 'Rounded' }, { value: '2', label: 'Forked' },
        { value: '3', label: 'Shallow fork' }, { value: '4', label: 'Swept' }, { value: '5', label: 'Crescent' },
      ], default: String(p.tail_type) },
    },
    face: {
      _collapsed: true,
      eye: [p.eye_size, 8, 28, 0.5],
      jaw: [p.jaw_size, 0.7, 1.4, 0.05],
      mouthOpen: [p.jaw_open, 0, 1, 0.05],
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
    dorsal_length: v.fins.dorsal, wing_length: v.fins.pectoral, pelvic_length: v.fins.pelvic,
    anal_length: v.fins.anal, tail_length: v.fins.tail, tail_type: Number(v.fins.tailShape),
    eye_size: v.face.eye, jaw_size: v.face.jaw, jaw_open: v.face.mouthOpen,
    has_teeth: Number(v.face.teeth), has_moustache: Number(v.face.moustache), has_beard: Number(v.face.beard),
  };
}
