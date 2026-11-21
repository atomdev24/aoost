/** Types for lens.js (glass in front of the dot board, WebGL 2). */
import type { LensOpts } from "./dots.js";
export const LENS_DEFAULTS: Required<LensOpts>;
export function createLens(canvas: HTMLCanvasElement, mode: string): { resize(w: number, h: number): void; render(source: CanvasImageSource, t: number, o: LensOpts, dpr?: number): void } | null;
