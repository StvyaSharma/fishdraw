import type { Drawing, Point, Polyline } from '../fishdraw.ts';

export type RegionId = 'body' | 'head' | 'dorsal' | 'pectoral' | 'pelvic' | 'anal' | 'caudal' | 'finlets' | 'jaw';
export interface Region {
  id: RegionId;
  outline: Polyline;
  /** Anatomical attachment, not every pixel overlapped by a foreground fin. */
  root: Polyline;
}
export interface Anatomy {
  /** Back-to-front painter order. Multiple finlets can share an ID. */
  regions: Region[];
  top: Polyline;
  bottom: Polyline;
  eye: Polyline;
  gill: Polyline;
  ocellus: Polyline;
  lateralLine: Drawing;
}
export interface HeadAnatomy { outline: Polyline; eye: Polyline; gill: Polyline; jaw: Polyline; root: Polyline }

export function contains(poly: Polyline, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function bounds(poly: Polyline) {
  return { x: Math.min(...poly.map(p => p[0])), y: Math.min(...poly.map(p => p[1])),
    right: Math.max(...poly.map(p => p[0])), bottom: Math.max(...poly.map(p => p[1])) };
}
export function distanceToPath(point: Point, path: Polyline): number {
  let distance = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    distance = Math.min(distance, Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy));
  }
  return distance;
}
export function bodyCoordinates(anatomy: Anatomy, x: number, y: number): [number, number] {
  const top = anatomy.top, bottom = anatomy.bottom;
  let index = 0, closest = Infinity;
  for (let i = 0; i < top.length - 1; i++) {
    const mid = (top[i][0] + bottom[i][0]) / 2;
    const next = (top[i + 1][0] + bottom[i + 1][0]) / 2;
    if (x >= mid && x <= next) { index = i; break; }
    const d = Math.abs(x - mid);
    if (d < closest) { closest = d; index = i; }
  }
  const left = (top[index][0] + bottom[index][0]) / 2;
  const right = (top[index + 1][0] + bottom[index + 1][0]) / 2;
  const t = Math.max(0, Math.min(1, (x - left) / (right - left || 1)));
  const upper = top[index][1] * (1 - t) + top[index + 1][1] * t;
  const lower = bottom[index][1] * (1 - t) + bottom[index + 1][1] * t;
  const u = (x - top[0][0]) / (top.at(-1)![0] - top[0][0] || 1);
  return [u, (y - upper) / Math.max(2, lower - upper)];
}
