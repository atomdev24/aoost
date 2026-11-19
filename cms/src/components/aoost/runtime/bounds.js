/* Keeping things on the projects table: half-size of a turned box, rubber-band resistance past an edge,
   and the nearest spot where a box is fully on the table. Pure functions, no DOM. */

/** Half width and height of a w×h box turned by deg degrees about its centre. */
export function turnedHalf(w, h, deg) {
  const t = (deg * Math.PI) / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
  return { hx: (w * c + h * s) / 2, hy: (w * s + h * c) / 2 };
}

/** Past min or max, the value moves less and less the further it's pushed (never more than `give` beyond). */
export function rubber(v, min, max, give = 70) {
  if (max < min) return (min + max) / 2;
  if (v < min) { const d = min - v; return min - give * (1 - 1 / (d / give + 1)); }
  if (v > max) { const d = v - max; return max + give * (1 - 1 / (d / give + 1)); }
  return v;
}

/** Clamp v into [min, max] (centred when the range is empty, i.e. the box is bigger than the table). */
export function clamp(v, min, max) {
  return max < min ? (min + max) / 2 : Math.max(min, Math.min(max, v));
}

/** The range a box's centre may take so the whole box (half-size hx, hy) stays inside W×H, less pad. */
export function centreRange(W, H, hx, hy, pad = 6) {
  return { x0: hx + pad, x1: W - hx - pad, y0: hy + pad, y1: H - hy - pad };
}
