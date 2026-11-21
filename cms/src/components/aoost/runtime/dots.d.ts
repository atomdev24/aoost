/** Types for dots.js (the dot board, shared by the site and the editor). */
export function wrapLine(words: string[], fits: (s: string) => boolean): string[];
export function balanceLine(words: string[], width: (s: string) => number, room: number): string[];
export const EFFECTS: Record<string, unknown>;
export function startDotBoard(canvas: HTMLCanvasElement, opts?: { lines?: string[]; seconds?: number; grid?: boolean; effect?: string }): { setLines(lines: string[]): void; stop(): void };
