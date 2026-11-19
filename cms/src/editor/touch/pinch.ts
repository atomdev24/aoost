type Pt = { x: number; y: number };

/** Midpoint and spread of two fingers. */
export function pinchOf(a: Pt, b: Pt): { mid: Pt; dist: number } {
  return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
}
