/** Palettes are families, not swatches: each names a few pigments in OKLCH
 * (lightness, chroma, hue°) and the genes shift, saturate and darken them as
 * a whole, so every variant stays a believable fish rather than a random mix. */

type Tone = [lightness: number, chroma: number, hue: number];

export interface PaletteFamily {
  id: number; key: string; label: string;
  /** Dorsal pigment, pale ventral ground, iridophore sheen, melanophore marks, contrasting accent. */
  back: Tone; belly: Tone; sheen: Tone; pigment: Tone; accent: Tone;
}

export const paletteFamilies: readonly PaletteFamily[] = [
  { id: 0, key: 'silver', label: 'Silver · open water', back: [0.45, 0.05, 235], belly: [0.93, 0.015, 220], sheen: [0.76, 0.06, 205], pigment: [0.3, 0.03, 250], accent: [0.7, 0.13, 70] },
  { id: 1, key: 'bronze', label: 'Olive bronze · river', back: [0.47, 0.07, 110], belly: [0.9, 0.045, 95], sheen: [0.73, 0.09, 80], pigment: [0.3, 0.04, 70], accent: [0.6, 0.15, 30] },
  { id: 2, key: 'reef', label: 'Yellow & black · reef', back: [0.8, 0.15, 95], belly: [0.95, 0.05, 100], sheen: [0.87, 0.1, 85], pigment: [0.24, 0.02, 270], accent: [0.6, 0.15, 245] },
  { id: 3, key: 'ember', label: 'Red & orange · rock', back: [0.57, 0.17, 33], belly: [0.88, 0.06, 60], sheen: [0.77, 0.12, 55], pigment: [0.33, 0.1, 25], accent: [0.64, 0.12, 200] },
  { id: 4, key: 'azure', label: 'Blue · structural', back: [0.5, 0.13, 250], belly: [0.9, 0.035, 220], sheen: [0.77, 0.1, 195], pigment: [0.27, 0.05, 265], accent: [0.82, 0.16, 85] },
  { id: 5, key: 'jade', label: 'Green & gold · weed', back: [0.53, 0.11, 150], belly: [0.91, 0.06, 115], sheen: [0.8, 0.1, 100], pigment: [0.3, 0.05, 160], accent: [0.62, 0.17, 25] },
  { id: 6, key: 'sand', label: 'Sand & umber · bottom', back: [0.6, 0.06, 70], belly: [0.93, 0.03, 80], sheen: [0.8, 0.04, 75], pigment: [0.36, 0.05, 50], accent: [0.55, 0.12, 30] },
  { id: 7, key: 'dusk', label: 'Rose & violet · deep reef', back: [0.6, 0.12, 345], belly: [0.9, 0.05, 20], sheen: [0.78, 0.09, 300], pigment: [0.35, 0.09, 300], accent: [0.85, 0.15, 95] },
];

export interface Palette {
  back: string; belly: string; sheen: string; pigment: string; accent: string;
  /** Translucent fin membrane. */ fin: string;
  /** Scale and texture lines. */ texture: string;
  /** Outline ink. */ ink: string;
  /** A warm ventral blush. */ blush: string;
}

export const inkStyles = [
  { id: 0, key: 'sepia', label: 'Sepia' },
  { id: 1, key: 'lamp', label: 'Lamp black' },
  { id: 2, key: 'indigo', label: 'Indigo' },
  { id: 3, key: 'matched', label: 'Matched to the body' },
] as const;

export function oklch([l, c, h]: Tone): string {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  return '#' + linear.map(v => {
    const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, s)) * 255).toString(16).padStart(2, '0');
  }).join('');
}

export interface PaletteGenes { family: number; hueShift: number; saturation: number; depth: number; ink: number }

export function palette({ family, hueShift, saturation, depth, ink }: PaletteGenes): Palette {
  const f = paletteFamilies.find(p => p.id === family) ?? paletteFamilies[0];
  const clampL = (l: number) => Math.max(0.12, Math.min(0.97, l));
  // Depth darkens the dorsal pigments more than the ventral ground.
  // Natural pigments are never neon: cap chroma so saturation cannot leave the believable range.
  const chroma = (c: number) => Math.min(0.16, c);
  const tone = ([l, c, h]: Tone, k = 1, dl = 0): Tone => [clampL(l + dl), chroma(c * saturation * k), h + hueShift];
  const back = tone(f.back, 1, -0.12 * depth);
  const inks = [
    [0.27, 0.04, 55], [0.18, 0.005, 260], [0.27, 0.07, 265], [0.24, f.pigment[1] + 0.02, f.pigment[2] + hueShift],
  ] satisfies Tone[];
  return {
    back: oklch(back),
    belly: oklch(tone(f.belly)),
    sheen: oklch(tone(f.sheen)),
    pigment: oklch(tone(f.pigment, 1, -0.06 * depth)),
    // The accent is a contrast colour; it keeps its own hue.
    accent: oklch([f.accent[0], chroma(f.accent[1] * saturation), f.accent[2]]),
    fin: oklch(tone(f.back, 0.6, 0.14)),
    texture: oklch(tone(f.pigment, 0.8, 0.06)),
    ink: oklch(inks[ink] ?? inks[0]),
    blush: oklch([0.72, chroma(0.11 * saturation), 25]),
  };
}
