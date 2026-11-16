/** Pure maths for the free canvas: snapping, smart guides, axis lock, align and distribute. */

export type Rect = { x: number; y: number; w: number; h: number };
export type Guide = { axis: "x" | "y"; pos: number; from: number; to: number };
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

const round = (n: number) => Math.round(n * 100) / 100;

/** Shift held: keep only the larger of the two movements. */
export function axisLock(dx: number, dy: number): { dx: number; dy: number } {
  return Math.abs(dx) >= Math.abs(dy) ? { dx, dy: 0 } : { dx: 0, dy };
}

type Line = { pos: number; from: number; to: number };
const xLines = (r: Rect): Line[] => [r.x, r.x + r.w / 2, r.x + r.w].map((pos) => ({ pos, from: r.y, to: r.y + r.h }));
const yLines = (r: Rect): Line[] => [r.y, r.y + r.h / 2, r.y + r.h].map((pos) => ({ pos, from: r.x, to: r.x + r.w }));

function nearest(mine: number[], targets: Line[], threshold: number): { delta: number; line: Line } | null {
  let best: { delta: number; line: Line } | null = null;
  for (const m of mine) {
    for (const line of targets) {
      const delta = line.pos - m;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, line };
    }
  }
  return best;
}

/**
 * Snap a moving box to the artboard (edges and centre) and to other layers
 * (edges and centres). Returns the adjusted box and the guides to draw.
 */
export function snapMove(box: Rect, others: Rect[], artboard: { width: number; height: number }, threshold: number): { box: Rect; guides: Guide[] } {
  const board: Rect = { x: 0, y: 0, w: artboard.width, h: artboard.height };
  const targets = [board, ...others];
  const guides: Guide[] = [];
  const out = { ...box };

  const sx = nearest([box.x, box.x + box.w / 2, box.x + box.w], targets.flatMap(xLines), threshold);
  if (sx) {
    out.x = round(box.x + sx.delta);
    guides.push({ axis: "x", pos: sx.line.pos, from: Math.min(sx.line.from, box.y), to: Math.max(sx.line.to, box.y + box.h) });
  }
  const sy = nearest([box.y, box.y + box.h / 2, box.y + box.h], targets.flatMap(yLines), threshold);
  if (sy) {
    out.y = round(box.y + sy.delta);
    guides.push({ axis: "y", pos: sy.line.pos, from: Math.min(sy.line.from, out.x), to: Math.max(sy.line.to, out.x + box.w) });
  }
  return { box: out, guides };
}

const MIN = 8;

/** Resize from a handle. Shift keeps the aspect ratio. The moving edges snap. */
export function resize(start: Rect, handle: Handle, dx: number, dy: number, opts: { keepRatio?: boolean; others?: Rect[]; artboard?: { width: number; height: number }; threshold?: number } = {}): { box: Rect; guides: Guide[] } {
  let { x, y, w, h } = start;
  if (handle.includes("e")) w = start.w + dx;
  if (handle.includes("w")) {
    w = start.w - dx;
    x = start.x + dx;
  }
  if (handle.includes("s")) h = start.h + dy;
  if (handle.includes("n")) {
    h = start.h - dy;
    y = start.y + dy;
  }

  const guides: Guide[] = [];
  if (opts.artboard && opts.threshold) {
    const targets = [{ x: 0, y: 0, w: opts.artboard.width, h: opts.artboard.height }, ...(opts.others ?? [])];
    if (handle.includes("e") || handle.includes("w")) {
      const edge = handle.includes("e") ? x + w : x;
      const s = nearest([edge], targets.flatMap(xLines), opts.threshold);
      if (s) {
        if (handle.includes("e")) w += s.delta;
        else {
          x += s.delta;
          w -= s.delta;
        }
        guides.push({ axis: "x", pos: s.line.pos, from: Math.min(s.line.from, y), to: Math.max(s.line.to, y + h) });
      }
    }
    if (handle.includes("s") || handle.includes("n")) {
      const edge = handle.includes("s") ? y + h : y;
      const s = nearest([edge], targets.flatMap(yLines), opts.threshold);
      if (s) {
        if (handle.includes("s")) h += s.delta;
        else {
          y += s.delta;
          h -= s.delta;
        }
        guides.push({ axis: "y", pos: s.line.pos, from: Math.min(s.line.from, x), to: Math.max(s.line.to, x + w) });
      }
    }
  }

  if (opts.keepRatio && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    const horizontal = handle === "e" || handle === "w" || (handle.length === 2 && Math.abs(w - start.w) >= Math.abs(h - start.h) * ratio);
    if (horizontal) {
      const nh = w / ratio;
      if (handle.includes("n")) y = start.y + start.h - nh;
      h = nh;
    } else {
      const nw = h * ratio;
      if (handle.includes("w")) x = start.x + start.w - nw;
      w = nw;
    }
  }

  if (w < MIN) {
    if (handle.includes("w")) x = start.x + start.w - MIN;
    w = MIN;
  }
  if (h < MIN) {
    if (handle.includes("n")) y = start.y + start.h - MIN;
    h = MIN;
  }
  return { box: { x: round(x), y: round(y), w: round(w), h: round(h) }, guides };
}

/** Align boxes to each other; a single box aligns to the artboard. */
export function align<T extends Rect>(boxes: T[], mode: AlignMode, artboard: { width: number; height: number }): T[] {
  if (!boxes.length) return boxes;
  const bounds =
    boxes.length === 1
      ? { x: 0, y: 0, w: artboard.width, h: artboard.height }
      : (() => {
          const x = Math.min(...boxes.map((b) => b.x));
          const y = Math.min(...boxes.map((b) => b.y));
          return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
        })();
  return boxes.map((b) => {
    switch (mode) {
      case "left":
        return { ...b, x: bounds.x };
      case "center":
        return { ...b, x: round(bounds.x + (bounds.w - b.w) / 2) };
      case "right":
        return { ...b, x: round(bounds.x + bounds.w - b.w) };
      case "top":
        return { ...b, y: bounds.y };
      case "middle":
        return { ...b, y: round(bounds.y + (bounds.h - b.h) / 2) };
      case "bottom":
        return { ...b, y: round(bounds.y + bounds.h - b.h) };
    }
  });
}

/** Space three or more boxes evenly between the outermost two. Order is kept. */
export function distribute<T extends Rect>(boxes: T[], axis: "x" | "y"): T[] {
  if (boxes.length < 3) return boxes;
  const pos = axis === "x" ? "x" : "y";
  const size = axis === "x" ? "w" : "h";
  const sorted = [...boxes].sort((a, b) => a[pos] - b[pos]);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const total = sorted.reduce((sum, b) => sum + b[size], 0);
  const gap = (last[pos] + last[size] - first[pos] - total) / (sorted.length - 1);
  let cursor = first[pos];
  const placed = new Map<T, number>();
  for (const b of sorted) {
    placed.set(b, round(cursor));
    cursor += b[size] + gap;
  }
  return boxes.map((b) => ({ ...b, [pos]: placed.get(b)! }));
}
