/** Types for phantoms.js (simulated visitor cursors on the site). */
export function startPhantoms(layer: HTMLElement, rate?: string): () => void;
export const _test: {
  plan(start: { x: number; y: number }, steps: unknown[], hand?: { pace: number; arc: number; side: number }): { kind: string; dur: number }[];
  reach(d: number, pace?: number): number;
  curve(from: { x: number; y: number }, to: { x: number; y: number }, dur: number, hand: { pace: number; arc: number; side: number }): { kind: string; dur: number };
  at(seg: { kind: string; dur: number }, k: number, tt: number): { x: number; y: number };
  seed(fn: () => number): void;
  ease(t: number): number;
  BEHAVIOURS: Record<string, (p: { x: number; y: number }) => unknown[]>;
  RATES: Record<string, { chance: number; first: [number, number]; gap: [number, number]; together: number }>;
};
