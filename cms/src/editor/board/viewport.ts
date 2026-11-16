import { DESIGN_WIDTH, type Breakpoint } from "../../schema";

/**
 * Pure maths for the side-by-side breakpoint board: where each frame sits in
 * world space, and how the view (pan + zoom) maps world to screen:
 *   screen = world * zoom + (x, y)
 */
export type View = { x: number; y: number; zoom: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type FrameRect = Rect & { bp: Breakpoint };

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 4;
/** Space between frames, and the size of the "Add a breakpoint" slot (world px). */
export const FRAME_GAP = 120;
export const SLOT = { w: 260, h: 320 };
/** Room around everything for "Fit all" (screen px); the top leaves space for the labels. */
const FIT_PAD = { x: 48, top: 56, bottom: 88 };
/** Zoom steps for ⌘+ / ⌘− and the zoom bar. */
const STEPS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/** Desktop first, then mobile, left to right, tops aligned. */
export const FRAME_ORDER: Breakpoint[] = ["desktop", "mobile"];

export function layoutFrames(heights: Partial<Record<Breakpoint, number>>): FrameRect[] {
  let x = 0;
  return FRAME_ORDER.map((bp) => {
    const rect = { bp, x, y: 0, w: DESIGN_WIDTH[bp], h: Math.max(200, Math.round(heights[bp] ?? 900)) };
    x += rect.w + FRAME_GAP;
    return rect;
  });
}

export function slotRect(frames: Rect[]): Rect {
  const last = frames[frames.length - 1]!;
  return { x: last.x + last.w + FRAME_GAP, y: 0, w: SLOT.w, h: SLOT.h };
}

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Zoom by `factor` keeping the screen point (px, py) still. */
export function zoomAt(view: View, nextZoom: number, px: number, py: number): View {
  const zoom = clampZoom(nextZoom);
  const k = zoom / view.zoom;
  return { zoom, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** The next zoom step up (dir 1) or down (dir -1) from z. */
export function stepZoom(z: number, dir: 1 | -1): number {
  const eps = 1e-3;
  if (dir > 0) return STEPS.find((s) => s > z + eps) ?? MAX_ZOOM;
  return [...STEPS].reverse().find((s) => s < z - eps) ?? MIN_ZOOM;
}

/**
 * "Fit all": every frame and the add slot fit across the view, tops aligned
 * under the labels. Whole pages are usually far taller than wide, so fitting
 * their full height too would shrink them past reading; the height is panned.
 */
export function fitAll(rects: Rect[], width: number, height: number): View {
  const left = Math.min(...rects.map((r) => r.x));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const top = Math.min(...rects.map((r) => r.y));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  const byWidth = (width - FIT_PAD.x * 2) / (right - left);
  const byHeight = (height - FIT_PAD.top - FIT_PAD.bottom) / (bottom - top);
  // Fit the whole height only when it doesn't cost more than half the width fit.
  const zoom = clampZoom(byHeight >= byWidth / 2 ? Math.min(byWidth, byHeight) : byWidth);
  const x = (width - (right - left) * zoom) / 2 - left * zoom;
  return { zoom, x, y: FIT_PAD.top - top * zoom };
}

/** Centre a world rect in the view at the current zoom (zooming out if it's wider than the view). */
export function reveal(view: View, rect: Rect, width: number, height: number, margin = 40): View {
  const sx = rect.x * view.zoom + view.x;
  const sy = rect.y * view.zoom + view.y;
  const sw = rect.w * view.zoom;
  const sh = rect.h * view.zoom;
  const inside = sx >= margin && sy >= margin && sx + sw <= width - margin && sy + Math.min(sh, height / 2) <= height - margin;
  if (inside) return view;
  const zoom = sw > width - margin * 2 ? clampZoom((width - margin * 2) / rect.w) : view.zoom;
  const x = width / 2 - (rect.x + rect.w / 2) * zoom;
  // Tall blocks line up their top edge; short ones are centred.
  const y = rect.h * zoom > height - margin * 2 ? margin - rect.y * zoom : height / 2 - (rect.y + rect.h / 2) * zoom;
  return { zoom, x, y };
}

/** Does a world rect show (within `margin` screen px) in a view of this size? */
export function isVisible(view: View, rect: Rect, width: number, height: number, margin = 200): boolean {
  const sx = rect.x * view.zoom + view.x;
  const sy = rect.y * view.zoom + view.y;
  return sx + rect.w * view.zoom > -margin && sy + rect.h * view.zoom > -margin && sx < width + margin && sy < height + margin;
}

// ------------------------------------------------- remembered per page

const KEY = (pageId: string) => `aoost.board.${pageId}`;

export function loadView(pageId: string): View | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(pageId)) ?? "null") as View | null;
    return v && [v.x, v.y, v.zoom].every(Number.isFinite) ? { x: v.x, y: v.y, zoom: clampZoom(v.zoom) } : null;
  } catch {
    return null;
  }
}

export function saveView(pageId: string, view: View) {
  try {
    localStorage.setItem(KEY(pageId), JSON.stringify({ x: Math.round(view.x), y: Math.round(view.y), zoom: Math.round(view.zoom * 1000) / 1000 }));
  } catch {
    /* private window: the view just isn't remembered */
  }
}
