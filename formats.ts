import { draw_ps, draw_svg, draw_svg_anim, type Drawing } from './fishdraw.ts';

export const formats = ['svg', 'smil', 'json', 'csv', 'ps'] as const;
export type OutputFormat = (typeof formats)[number];
export function isOutputFormat(value: string): value is OutputFormat {
  return formats.some(format => format === value);
}
export function serialize(drawing: Drawing, format: OutputFormat, speed = 1): string {
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('Speed must be a positive number.');
  switch (format) {
    case 'svg': return draw_svg(drawing);
    case 'smil': return draw_svg_anim(drawing, 0.005 / speed);
    case 'json': return JSON.stringify(drawing);
    case 'csv': return drawing.map(line => line.flat().join(',')).join('\n');
    case 'ps': return draw_ps(drawing);
  }
}
