/** The subset of the p5.brush standalone build (no p5.js) that the renderer uses. */
declare module 'p5.brush/standalone' {
  type Point = [number, number];
  export function createCanvas(width: number, height: number, options?: { pixelDensity?: number; parent?: Element | string | null; id?: string }): HTMLCanvasElement;
  export function load(target?: HTMLCanvasElement | OffscreenCanvas): void;
  export function seed(value: number | string): void;
  export function noiseSeed(value: number | string): void;
  export function clear(color?: string): void;
  export function render(): void;
  export function scaleBrushes(scale: number): void;
  export function add(name: string, params: {
    type: 'default' | 'spray' | 'marker'; weight: number; scatter: number; sharpness: number; grain: number;
    opacity: number; spacing: number; pressure: [number, number] | [number, number, number]; rotate?: 'none' | 'natural' | 'random'; noise?: number;
  }): void;
  export function set(name: string, color: string, weight: number): void;
  export function noStroke(): void;
  export function fill(color: string, opacity?: number): void;
  export function noFill(): void;
  export function wash(color: string, opacity: number): void;
  export function noWash(): void;
  export function fillBleed(strength: number, direction?: 'in' | 'out', angle?: number): void;
  export function fillTexture(texture: number, border: number, scatter?: boolean, split?: number): void;
  export function hatch(dist: number, angle: number, options?: { rand?: number | false; continuous?: boolean; gradient?: number | false }): void;
  export function hatchStyle(name: string, color: string, weight: number): void;
  export function noHatch(): void;
  export function wiggle(amount: number): void;
  export function noField(): void;
  export function angleMode(mode: 'degrees' | 'radians'): void;
  export const RADIANS: 'radians';
  export function beginShape(curvature?: number): void;
  export function vertex(x: number, y: number, pressure?: number): void;
  export function endShape(close?: boolean): void;
  export function line(x1: number, y1: number, x2: number, y2: number): void;
  export function rect(x: number, y: number, w: number, h: number, mode?: 'corner' | 'center'): void;
}
