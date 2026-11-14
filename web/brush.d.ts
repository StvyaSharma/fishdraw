/** The subset of the p5.brush standalone build (no p5.js) that the painter uses. */
declare module 'p5.brush/standalone' {
  type Point = [number, number];
  export function createCanvas(width: number, height: number, options?: { pixelDensity?: number; parent?: Element | string | null; id?: string }): HTMLCanvasElement;
  export function load(target?: HTMLCanvasElement | OffscreenCanvas): void;
  export function seed(value: number | string): void;
  export function noiseSeed(value: number | string): void;
  export function clear(color?: string): void;
  export function render(): void;
  export function scaleBrushes(scale: number): void;
  export function set(name: string, color: string, weight: number): void;
  export function noStroke(): void;
  export function fill(color: string, opacity?: number): void;
  export function noFill(): void;
  export function fillBleed(strength: number, direction?: 'in' | 'out', angle?: number): void;
  export function fillTexture(texture: number, border: number, scatter?: boolean, split?: number): void;
  export function noHatch(): void;
  export function beginShape(curvature?: number): void;
  export function vertex(x: number, y: number, pressure?: number): void;
  export function endShape(close?: boolean): void;
  export function line(x1: number, y1: number, x2: number, y2: number): void;
  export function rect(x: number, y: number, w: number, h: number, mode?: 'corner' | 'center'): void;
  export function box(): string[];
  export function spline(points: Point[] | [number, number, number][], curvature?: number): void;
}
