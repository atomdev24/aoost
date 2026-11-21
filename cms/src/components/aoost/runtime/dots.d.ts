/** Types for dots.js (the dot board, shared by the site and the editor). */
export function wrapLine(words: string[], fits: (s: string) => boolean): string[];
export function balanceLine(words: string[], width: (s: string) => number, room: number): string[];
export const EFFECTS: Record<string, unknown>;
export function startDotBoard(canvas: HTMLCanvasElement, opts?: { lines?: string[]; seconds?: number; grid?: boolean; effect?: string; after?: string; idleSpeed?: number; textSize?: number }): { setLines(lines: string[]): void; stop(): void };
export function sentenceCase(s: string): string;
export const IDLE: Record<string, { level(x: number, y: number, t: number, cols: number, rows: number): number }>;
