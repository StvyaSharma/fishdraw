/** Narrow application-owned declarations, checked against p5.brush 3.0.0 source. */
declare module 'p5.brush/standalone' {
  export function load(target: HTMLCanvasElement): void;
  export function seed(seed: number): void;
  export function noiseSeed(seed: number): void;
  export function clear(): void;
  export function push(): void;
  export function pop(): void;
  export function translate(x: number, y: number): void;
  export function noStroke(): void;
  export function noHatch(): void;
  export function noWash(): void;
  export function fill(color: string, opacity?: number): void;
  export function fillBleed(amount: number, direction?: 'in' | 'out', angle?: number): void;
  export function fillTexture(texture: number, border: number, scatter?: boolean, split?: number): void;
  export function polygon(points: [number, number][]): void;
  export function render(): void;
}
