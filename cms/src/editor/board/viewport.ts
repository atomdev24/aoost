import { DEMO } from "../demo";
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
/** Room around everything for "Fit all" (screen px); the top leaves space for the floating islands and the labels. */
const FIT_PAD = { x: 48, top: 92, bottom: 88 };
/**
 * Fit one frame's width to the screen between the rail and the right edge,
 * its top under the floating islands and its label (the phone's default view).
 */
export function fitWidth(rect: Rect, width: number, room: { left: number; right: number; top: number } = { left: 64, right: 8, top: 152 }): View {
  const zoom = clampZoom((width - room.left - room.right) / rect.w);
  return { zoom, x: room.left - rect.x * zoom, y: room.top - rect.y * zoom };
}

/** Zoom steps for ⌘+ / ⌘− and the zoom bar. */
const STEPS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/** Widest first, left to right, tops aligned: widescreen, desktop, tablet, mobile. */
export const FRAME_ORDER: Breakpoint[] = ["widescreen", "desktop", "tablet", "mobile"];

/**
 * Default frame places. Shown frames are packed left to right, so hidden ones
 * leave no gap (with tablet and widescreen hidden, desktop and mobile sit where
 * they always did). Hidden frames go after the shown ones.
 */
export function layoutFrames(heights: Partial<Record<Breakpoint, number>>, hidden: Partial<Record<Breakpoint, boolean>> = {}): FrameRect[] {
  let x = 0;
  const order = [...FRAME_ORDER.filter((bp) => !hidden[bp]), ...FRAME_ORDER.filter((bp) => hidden[bp])];
  const rects = order.map((bp) => {
    const rect = { bp, x, y: 0, w: DESIGN_WIDTH[bp], h: Math.max(200, Math.round(heights[bp] ?? 900)) };
    x += rect.w + FRAME_GAP;
    return rect;
  });
  return FRAME_ORDER.map((bp) => rects.find((r) => r.bp === bp)!);
}

export function slotRect(frames: Rect[]): Rect {
  if (frames.length === 0) return { x: FRAME_GAP, y: 0, w: SLOT.w, h: SLOT.h };
  let rightmost = frames[0]!;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i]!;
    if (f.x + f.w > rightmost.x + rightmost.w) {
      rightmost = f;
    }
  }
  return { x: rightmost.x + rightmost.w + FRAME_GAP, y: rightmost.y, w: SLOT.w, h: SLOT.h };
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

// The demo keeps its own board memory: the real editor's shown frames and positions (same browser,
// same page ids) must not carry over, so the demo always opens on desktop and mobile.
const KEY = (pageId: string) => `aoost.${DEMO ? "demo." : ""}board.${pageId}`;

export type SavedBoardPage = {
  view: View;
  hidden?: Record<Breakpoint, boolean>;
  positions?: Partial<Record<Breakpoint, { x: number; y: number }>>;
};

export function loadPageBoard(pageId: string): SavedBoardPage | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(pageId)) ?? "null");
    if (!raw) return null;
    // Backwards compatibility: old format was { x, y, zoom }
    if ([raw.x, raw.y, raw.zoom].every(Number.isFinite)) {
      return { view: { x: raw.x, y: raw.y, zoom: clampZoom(raw.zoom) } };
    }
    if (raw.view && [raw.view.x, raw.view.y, raw.view.zoom].every(Number.isFinite)) {
      return {
        view: { x: raw.view.x, y: raw.view.y, zoom: clampZoom(raw.view.zoom) },
        hidden: raw.hidden,
        positions: raw.positions,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadView(pageId: string): View | null {
  return loadPageBoard(pageId)?.view ?? null;
}

export function savePageBoard(pageId: string, data: SavedBoardPage) {
  try {
    localStorage.setItem(
      KEY(pageId),
      JSON.stringify({
        view: { x: Math.round(data.view.x), y: Math.round(data.view.y), zoom: Math.round(data.view.zoom * 1000) / 1000 },
        hidden: data.hidden,
        positions: data.positions,
      })
    );
  } catch {
    /* private window */
  }
}

export function saveView(pageId: string, view: View) {
  const existing = loadPageBoard(pageId);
  savePageBoard(pageId, { ...existing, view });
}

/**
 * Screen px the floating panels cover at each side of the board on a desktop: the left panel
 * (rail at 52px plus the 260px flyout) and the 284px inspector 10px from the right. The
 * inspector's room is kept even with nothing selected, so selecting a block doesn't cover the
 * frame. Narrow boards (phones) get none: their panels are sheets. Never squeeze the visible part
 * below half the board.
 */
export const PANEL_ROOM = { flyout: 312 + 12, inspector: 284 + 10 + 12 };
export function panelRoom(boardWidth: number, flyoutOpen: boolean, flyoutOnRight = false): { left: number; right: number } {
  if (boardWidth < 700) return { left: 0, right: 0 };
  const left = flyoutOpen ? PANEL_ROOM.flyout : 0;
  // The rail moved to the right edge: its flyout opens beside the inspector, so that side needs both.
  const right = flyoutOnRight ? PANEL_ROOM.inspector + PANEL_ROOM.flyout : PANEL_ROOM.inspector;
  if (left + right <= boardWidth / 2) return { left, right };
  // Not enough room for both: keep the left panel's room if it fits, else neither.
  return left > 0 && left <= boardWidth / 2 ? { left, right: 0 } : { left: 0, right: 0 };
}

/** Below this zoom, frame labels shorten to the name (the width, note and badge text drop). */
export const SHORT_LABEL_ZOOM = 0.35;
export const shortLabels = (zoom: number) => zoom < SHORT_LABEL_ZOOM;
