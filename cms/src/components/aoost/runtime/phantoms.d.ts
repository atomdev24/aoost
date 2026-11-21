/** Types for phantoms.js (simulated visitor cursors on the site). */
export function startPhantoms(layer: HTMLElement, rate?: string): () => void;
export const _test: {
  plan(start: { x: number; y: number }, steps: unknown[]): { kind: string; dur: number }[];
  reach(d: number): number;
  ease(t: number): number;
  BEHAVIOURS: Record<string, (p: { x: number; y: number }) => unknown[]>;
  RATES: Record<string, { chance: number; first: [number, number]; gap: [number, number]; together: number }>;
};
