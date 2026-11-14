import type { Point, Polyline, StrokeTag } from '../fishdraw.ts';
import type { ColourAnatomy } from './anatomy.ts';
import type { Palette } from './palette.ts';
import type { Noise, Random } from './random.ts';

/** A gene declares its control and its distribution in one place, so the
 * editor panel, randomisation and validation all come from the same spec. */
export type GeneSpec =
  | { key: string; label: string; kind: 'range'; min: number; max: number; step: number; sample: (r: Random) => number }
  | { key: string; label: string; kind: 'choice'; options: readonly { id: number; label: string }[]; sample: (r: Random) => number }
  | { key: string; label: string; kind: 'toggle'; sample: (r: Random) => number };

/** Flat gene values keyed `group.gene`, e.g. `pigment.pattern`. Plain numbers so
 * they serialise, diff and override like the line-work parameters. */
export type Genes = Record<string, number>;

/** Brushes the renderer knows. Built-in p5.brush names plus fishdraw's own. */
export type BrushName = 'fish-ink' | 'fish-fine' | 'rotring' | 'pen' | 'marker' | 'marker2' | 'cpencil' | 'HB' | 'charcoal' | 'spray';

/** A watercolour wash: p5.brush's layered-polygon fill. */
export interface WashLayer {
  kind: 'wash'; poly: Polyline; color: string; opacity: number;
  /** Edge diffusion, 0..1. */ bleed: number;
  /** Granulation, 0..1. */ texture: number;
  /** Dried pigment ring at the edge, 0..1. */ border: number;
  /** Warm/cool pigment separation, 0..1. */ split?: number;
}
/** A flat, transparent glaze (p5.brush `wash()`): no bleed, no texture. */
export interface GlazeLayer { kind: 'glaze'; poly: Polyline; color: string; opacity: number }
export interface StrokeLayer {
  kind: 'stroke'; points: Polyline; brush: BrushName; color: string; weight: number;
  /** Spline curvature, 0 = straight segments. */ curvature?: number;
  /** Hand-drawn wobble from p5.brush's "hand" field; 0 = none. */ wiggle?: number;
}
export interface HatchLayer {
  kind: 'hatch'; poly: Polyline; brush: BrushName; color: string; weight: number;
  spacing: number; angle: number; rand: number; gradient: number;
}
/** Short marks at points: stipple, speckle, dry-brush. */
export interface DabLayer { kind: 'dabs'; points: Point[]; brush: BrushName; color: string; weight: number; length: number; angle: number }

export type PaintLayer = WashLayer | GlazeLayer | StrokeLayer | HatchLayer | DabLayer;

/** Paint is laid down in stages; the paper dries between stages unless the
 * planner lets two run wet-into-wet. */
export const Stage = { ground: 0, shade: 1, glaze: 2, pattern: 3, fins: 4, detail: 5, ink: 9 } as const;
export type StageId = (typeof Stage)[keyof typeof Stage];

export interface StagedLayers { stage: StageId; layers: PaintLayer[] }

export interface EffectContext {
  anatomy: ColourAnatomy;
  palette: Palette;
  /** This effect's genes, without the group prefix. */
  genes: Record<string, number>;
  /** Shared look-and-feel genes: contrast, wetness, granulation. */
  style: { contrast: number; wetness: number; granulation: number };
  /** The effect's own stream and noise; nothing else draws from them. */
  random: Random;
  noise: Noise;
  ink: { polylines: Polyline[]; tags: StrokeTag[] };
}

/** One self-contained colouring technique. Effects return plain data and never
 * call p5.brush, so they are deterministic and testable without WebGL. */
export interface ColourEffect {
  key: string;
  label: string;
  genes: readonly GeneSpec[];
  /** Whether the effect paints for these genes (e.g. an off toggle). Defaults to always. */
  active?: (genes: Record<string, number>) => boolean;
  paint: (context: EffectContext) => StagedLayers[];
}

/** A step of the finished plan: paint a layer, or let the paper dry. */
export type PlanStep = PaintLayer | { kind: 'dry' };
export interface PaintPlan { steps: PlanStep[]; palette: Palette; paper: string }
