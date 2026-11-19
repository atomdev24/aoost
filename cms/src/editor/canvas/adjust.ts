import type { FrameFit } from "../../schema";

/**
 * InDesign-style "adjust image" maths. The picture sits in its frame with
 * object-fit (cover for Fill and Free, contain for Fit) at the focal point;
 * Free adds translate(pan%) scale(zoom) around the focal point. These
 * functions work in the frame's own pixels.
 */
export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Where the whole picture is drawn, relative to the frame's top-left corner. */
export function imageRect(f: FrameFit, frame: Size, natural: Size): Rect {
  const s = f.fit === "fit" ? Math.min(frame.w / natural.w, frame.h / natural.h) : Math.max(frame.w / natural.w, frame.h / natural.h);
  const iw = natural.w * s;
  const ih = natural.h * s;
  const x = (frame.w - iw) * (f.focalX / 100);
  const y = (frame.h - ih) * (f.focalY / 100);
  if (f.fit !== "free") return { x, y, w: iw, h: ih };
  const ox = (frame.w * f.focalX) / 100;
  const oy = (frame.h * f.focalY) / 100;
  return { x: ox + (x - ox) * f.zoom + (f.panX / 100) * frame.w, y: oy + (y - oy) * f.zoom + (f.panY / 100) * frame.h, w: iw * f.zoom, h: ih * f.zoom };
}

/** Options for a move or scale in Free mode. `overhang` (Alt held) lets the picture leave a gap in the frame. */
export type MoveOpts = { overhang?: boolean };

/**
 * The pan (in % of the frame) that keeps a Free picture covering its frame
 * at its zoom: [min, max] per axis. Empty (min > max) when the picture is
 * smaller than the frame.
 */
export function panRange(f: FrameFit, frame: Size, natural: Size): { x: [number, number]; y: [number, number] } {
  const r = imageRect({ ...f, panX: 0, panY: 0 }, frame, natural);
  // The picture's left edge is r.x + pan·w: it must stay at or left of 0, its right edge at or right of the frame's.
  return { x: [((frame.w - r.w - r.x) / frame.w) * 100, (-r.x / frame.w) * 100], y: [((frame.h - r.h - r.y) / frame.h) * 100, (-r.y / frame.h) * 100] };
}

/** Round to 0.01 without leaving [lo, hi] (rounding outwards would show a hairline of the frame). */
const roundIn = (n: number, lo: number, hi: number) => {
  const v = r2(n);
  return v < lo ? Math.ceil(lo * 100) / 100 : v > hi ? Math.floor(hi * 100) / 100 : v;
};

/**
 * Keep a Free picture covering its frame after a move or scale from `prev`:
 * zoom at least 1 (cover) and the pan inside panRange. A picture stored with
 * a gap (from before, or moved with Alt) can move back towards covering but
 * no further out, so existing content isn't changed by just touching it.
 */
export function coverClamp(next: FrameFit, prev: FrameFit, frame: Size, natural: Size): FrameFit {
  if (next.fit !== "free") return next;
  const was = prev.fit === "free" ? prev : { ...prev, zoom: 1, panX: 0, panY: 0 };
  const zoom = Math.max(next.zoom, Math.min(1, was.zoom));
  const f = { ...next, zoom };
  const range = panRange(f, frame, natural);
  const old = panRange(was, frame, natural);
  const EPS = 0.01;
  const axis = (v: number, [lo, hi]: [number, number], before: number, [oldLo, oldHi]: [number, number]) => {
    if (lo > hi) return v; // smaller than the frame (an old zoom below 1): nothing to keep covered
    // Only a picture that already had a gap on this axis may keep it (and close it).
    const gap = before < oldLo - EPS || before > oldHi + EPS;
    const a = gap ? Math.min(lo, before) : lo;
    const b = gap ? Math.max(hi, before) : hi;
    return roundIn(clamp(v, a, b), a, b);
  };
  return { ...f, panX: axis(f.panX, range.x, was.panX, old.x), panY: axis(f.panY, range.y, was.panY, old.y) };
}

/** Move the picture by (dx, dy) frame pixels: the focal point in Fill and Fit, the pan in Free (kept covering unless `overhang`). */
export function dragImage(f: FrameFit, frame: Size, natural: Size, dx: number, dy: number, opts: MoveOpts = {}): FrameFit {
  if (f.fit === "free") {
    const next = { ...f, panX: r2(clamp(f.panX + (dx / frame.w) * 100, -500, 500)), panY: r2(clamp(f.panY + (dy / frame.h) * 100, -500, 500)) };
    return opts.overhang ? next : coverClamp(next, f, frame, natural);
  }
  const r = imageRect(f, frame, natural);
  const slackX = frame.w - r.w;
  const slackY = frame.h - r.h;
  const focalX = Math.abs(slackX) < 0.5 ? f.focalX : clamp(((r.x + dx) / slackX) * 100, 0, 100);
  const focalY = Math.abs(slackY) < 0.5 ? f.focalY : clamp(((r.y + dy) / slackY) * 100, 0, 100);
  return { ...f, focalX: Math.round(focalX * 10) / 10, focalY: Math.round(focalY * 10) / 10 };
}

/**
 * Scale the picture. Scaling needs Free mode, which starts out looking exactly like Fill.
 * Given the frame and picture sizes it stays covering (zoom ≥ 1, pan clamped) unless `overhang`.
 */
export function scaleImage(f: FrameFit, factor: number, frame?: Size, natural?: Size, opts: MoveOpts = {}): FrameFit {
  const base = f.fit === "free" ? f : { ...f, fit: "free" as const, zoom: 1, panX: 0, panY: 0 };
  const next = { ...base, zoom: r2(clamp(base.zoom * factor, 0.2, 10)) };
  return frame && natural && !opts.overhang ? coverClamp(next, base, frame, natural) : next;
}

/** "Fill frame": back to covering the frame, centred on the current focal point. */
export const FILL_FRAME = { fit: "fill", zoom: 1, panX: 0, panY: 0 } as const satisfies Partial<FrameFit>;
export const fillFrame = (f: FrameFit): FrameFit => ({ ...f, ...FILL_FRAME });
