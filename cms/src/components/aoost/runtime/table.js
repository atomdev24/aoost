/* The projects table, shared by the site (projects.js) and the editor's frames (AoostProjects.tsx),
   so the editor shows the pieces exactly where the site puts them. Pure functions, no DOM. */
import { centreRange, clamp, turnedHalf } from './bounds.js';

/** The same small seeded random numbers as shared.js (kept here so this file has no DOM). */
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }

/**
 * Where each piece goes on a table W px wide, given each image's height/width.
 * The original layout: a loose grid with a little seeded jitter and tilt, each piece kept fully on
 * the table. Returns the table height, the piece width, and each piece's top-left, tilt and box.
 */
export function layoutTable(W, aspects) {
  const n = aspects.length;
  if (!n) return { H: 0, pw: 0, items: [] };
  const cols = W < 560 ? (n <= 2 ? 1 : n <= 6 ? 2 : n <= 12 ? 3 : 4) : (n <= 4 ? n : n <= 8 ? 4 : n <= 15 ? 5 : 6);
  const cellW = W / cols, pw = Math.min(240, cellW * (n <= 2 ? 0.7 : 0.84)), rows = Math.ceil(n / cols);
  const rowH = aspects.reduce((m, a) => Math.max(m, pw * a + 12), 0) * 0.86;
  const H = Math.max(W < 560 ? Math.min(640, W * 1.2) : 600, rows * rowH + 60);
  const r = rng(7 + n);
  const items = aspects.map((a, i) => {
    const col = i % cols, row = Math.floor(i / cols), ph = pw * a + 12;
    const cx = col * cellW + (cellW - pw) / 2, cy = 24 + row * ((H - 48 - ph) / Math.max(1, rows - 1 || 1));
    let x = Math.max(6, Math.min(W - pw - 6, cx + (r() - 0.5) * cellW * 0.18));
    let y = Math.max(14, Math.min(H - ph - 6, (rows === 1 ? (H - ph) / 2 : cy) + (r() - 0.5) * 28));
    const rot = (r() - 0.5) * 12;
    // fully on the table, turned
    const { hx, hy } = turnedHalf(pw, ph, rot), R = centreRange(W, H, hx, hy);
    x = clamp(x + pw / 2, R.x0, R.x1) - pw / 2;
    y = clamp(y + ph / 2, R.y0, R.y1) - ph / 2;
    return { x, y, rot, w: pw, h: ph };
  });
  return { H, pw, items };
}

/**
 * Keep pieces clear of each other (by `gap` px, judged on the paper, so shadows may still overlap)
 * and on the table. Pieces are placed one at a time: each stays where it is if that spot is clear,
 * or moves to the nearest clear spot. A `pinned` piece (the one just put down) is placed first, so
 * it stays exactly where it was put and only the pieces in its way shift. Pieces are
 * { x, y, rot, w, h, s? } (top-left, tilt, unscaled box, scale around the centre). Returns new
 * boxes in the same order, each with `moved`, and `stuck` = pieces that found no clear spot.
 */
export function separate(pieces, W, H, { pinned = -1, gap = 8 } = {}) {
  const P = pieces.map((p) => {
    const s = p.s || 1, { hx, hy } = turnedHalf(p.w * s, p.h * s, p.rot || 0);
    return { cx: p.x + p.w / 2, cy: p.y + p.h / 2, hx, hy };
  });
  const keepOn = (q, cx, cy) => { const R = centreRange(W, H, q.hx, q.hy); return [clamp(cx, R.x0, R.x1), clamp(cy, R.y0, R.y1)]; };
  const hits = (q, cx, cy, placed) => placed.some((o) => q.hx + o.hx + gap - Math.abs(cx - o.cx) > 0.5 && q.hy + o.hy + gap - Math.abs(cy - o.cy) > 0.5);
  const order = pinned >= 0 && pinned < P.length ? [pinned, ...P.keys()].filter((i, k, all) => all.indexOf(i) === k) : [...P.keys()];
  const placed = [];
  let stuck = 0;
  for (const i of order) {
    const q = P[i];
    let [cx, cy] = keepOn(q, q.cx, q.cy);
    if (i !== pinned && hits(q, cx, cy, placed)) {
      // The nearest clear spot: rings of growing radius around where it was, 24 directions each.
      let found = null;
      const far = Math.hypot(W, H);
      for (let r = 8; r <= far && !found; r += 8) {
        for (let k = 0; k < 24 && !found; k++) {
          const t = (k / 24) * Math.PI * 2;
          const [x, y] = keepOn(q, q.cx + r * Math.cos(t), q.cy + r * Math.sin(t));
          if (!hits(q, x, y, placed)) found = [x, y];
        }
      }
      if (found) [cx, cy] = found;
      else stuck++;
    }
    q.cx = cx; q.cy = cy;
    placed.push(q);
  }
  const out = pieces.map((p, i) => {
    const x = P[i].cx - p.w / 2, y = P[i].cy - p.h / 2;
    return { ...p, x, y, moved: Math.hypot(x - p.x, y - p.y) > 0.5 };
  });
  return Object.assign(out, { stuck });
}

/** True when two pieces' papers (turned, scaled) overlap by more than `slack` px. */
export function overlapping(a, b, slack = 0.5) {
  const ha = turnedHalf(a.w * (a.s || 1), a.h * (a.s || 1), a.rot || 0), hb = turnedHalf(b.w * (b.s || 1), b.h * (b.s || 1), b.rot || 0);
  const dx = Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)), dy = Math.abs(a.y + a.h / 2 - (b.y + b.h / 2));
  return ha.hx + hb.hx - dx > slack && ha.hy + hb.hy - dy > slack;
}

/**
 * The first layout of a table: the original layout, then pieces pushed clear of each other.
 * When they can't all fit clear (a narrow phone, big pieces) the table grows taller, a little at
 * a time, until they do. `scales` are each piece's size on this screen (1 = as laid out).
 */
export function clearLayout(W, aspects, scales = []) {
  const L = layoutTable(W, aspects);
  let H = L.H;
  let items = L.items.map((p, i) => ({ ...p, s: scales[i] || 1 }));
  for (let grow = 0; grow < 40; grow++) {
    const next = separate(items, W, H);
    if (!next.stuck) { items = next; break; }
    H += 40;
    if (grow === 39) items = next;
  }
  return { H, pw: L.pw, items };
}
