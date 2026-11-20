import { useSyncExternalStore } from "react";
import type { Breakpoint } from "../../schema";
import { activateBreakpoint } from "./bridge";
import { getRailState } from "../workspace/rail-store";
import { clampZoom, fitAll, fitWidth, panelRoom, layoutFrames, loadPageBoard, reveal, savePageBoard, slotRect, stepZoom, zoomAt, type FrameRect, type Rect, type View } from "./viewport";

const DOT_GRID_KEY = "aoost.board.dotGrid";
const loadDotGridPref = (): boolean => {
  try {
    return localStorage.getItem(DOT_GRID_KEY) === "true";
  } catch {
    return false;
  }
};

/**
 * View state of the breakpoint board: pan and zoom, each frame's measured
 * height, custom positions, hidden frames, dot grid, and the board's on-screen size.
 */
export type BoardState = {
  view: View;
  heights: Record<Breakpoint, number>;
  size: { w: number; h: number };
  /** Highlight the selection in every frame. */
  linked: boolean;
  /** Space is held: drags pan instead of editing. */
  spaceDown: boolean;
  pageId: string | null;
  /** True while dragging or panning (islands drop to 70% opacity). */
  interacting: boolean;
  /** Hidden frames per breakpoint. At least one must stay visible. */
  hidden: Record<Breakpoint, boolean>;
  /** Custom positions per breakpoint in world space. */
  positions: Partial<Record<Breakpoint, { x: number; y: number }>>;
  /** Dot grid toggle. False by default. */
  dotGrid: boolean;
  /** Each frame has drawn the page that is open (until then its last snapshot shows). */
  ready: Record<Breakpoint, boolean>;
  /** True while the wheel or trackpad is panning or zooming (and briefly after): the glass drops its blur. */
  moving: boolean;
};

/** Tablet and widescreen start hidden; Alex shows them when a page needs them. */
export const DEFAULT_HIDDEN: Record<Breakpoint, boolean> = { mobile: false, tablet: true, desktop: false, widescreen: true };
const NOT_READY: Record<Breakpoint, boolean> = { mobile: false, tablet: false, desktop: false, widescreen: false };

let state: BoardState = {
  view: { x: 0, y: 0, zoom: 0.35 },
  heights: { desktop: 900, mobile: 1600, tablet: 1200, widescreen: 900 },
  size: { w: 0, h: 0 },
  linked: true,
  spaceDown: false,
  pageId: null,
  interacting: false,
  hidden: DEFAULT_HIDDEN,
  positions: {},
  dotGrid: loadDotGridPref(),
  ready: NOT_READY,
  moving: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<BoardState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getBoard = () => state;
export function useBoard<T>(selector: (s: BoardState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export const frameRects = (s: BoardState = state): FrameRect[] => {
  const defaults = layoutFrames(s.heights, s.hidden);
  return defaults.map((f) => {
    const custom = s.positions[f.bp];
    if (custom) return { ...f, x: custom.x, y: custom.y };
    return f;
  });
};

export const visibleFrameRects = (s: BoardState = state): FrameRect[] => {
  const visible = frameRects(s).filter((f) => !s.hidden[f.bp]);
  return visible.length > 0 ? visible : frameRects(s);
};

const allRects = (s: BoardState = state): Rect[] => {
  const frames = visibleFrameRects(s);
  return [...frames, slotRect(frames)];
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  clearTimeout(saveTimer);
  const pageId = state.pageId;
  if (!pageId) return;
  saveTimer = setTimeout(() => {
    savePageBoard(pageId, {
      view: state.view,
      hidden: state.hidden,
      positions: state.positions,
    });
  }, 250);
}

export function setView(view: View) {
  set({ view });
  scheduleSave();
}

export function setSize(w: number, h: number) {
  if (w === state.size.w && h === state.size.h) return;
  const first = !state.size.w;
  set({ size: { w, h } });
  if (first && pendingFit) fitFrame(pendingFit);
  else if (first && state.pageId && !loadPageBoard(state.pageId)) fit();
}

/** A frame to fit once the board knows its size (the phone opens on the Mobile frame). */
let pendingFit: Breakpoint | null = null;

/** Fit one frame's width to the screen, top aligned. Shows it if it was hidden. */
export function fitFrame(bp: Breakpoint) {
  if (!state.size.w) {
    pendingFit = bp;
    return;
  }
  pendingFit = null;
  if (state.hidden[bp]) set({ hidden: { ...state.hidden, [bp]: false } });
  const rect = frameRects().find((f) => f.bp === bp);
  if (rect) setView(fitWidth(rect, state.size.w));
}

/** Open a page: its remembered view, hidden frames, and positions, or "Fit all" the first time. */
export function openPage(pageId: string) {
  if (pageId === state.pageId) return;
  const saved = loadPageBoard(pageId);
  set({
    pageId,
    ready: NOT_READY,
    ...(saved
      ? {
          view: saved.view,
          // Boards saved before tablet and widescreen existed keep them hidden.
          hidden: { ...DEFAULT_HIDDEN, ...(saved.hidden ?? {}) },
          positions: saved.positions ?? {},
        }
      : {
          hidden: DEFAULT_HIDDEN,
          positions: {},
        }),
  });
  if (pendingFit) fitFrame(pendingFit);
  else if (!saved && state.size.w) fit();
}

/** A frame has drawn the open page. */
export function setReady(bp: Breakpoint) {
  if (!state.ready[bp]) set({ ready: { ...state.ready, [bp]: true } });
}

export function setHeight(bp: Breakpoint, h: number) {
  const height = Math.round(h);
  if (Math.abs(state.heights[bp] - height) < 1) return;
  set({ heights: { ...state.heights, [bp]: height } });
}

/** Other things on the board that Fit should include (reference images). */
let extraFitRects: () => Rect[] = () => [];
export const setExtraFitRects = (fn: () => Rect[]) => {
  extraFitRects = fn;
};
/** Room for the floating panels, from what is open rather than what has drawn yet (so the first fit is right). */
function coveredEdges(): { left: number; right: number } {
  const rail = getRailState();
  // A rail dragged out onto the canvas (or to the right edge) doesn't cover the left edge.
  const side = !rail.pos ? "left" : rail.pos.x <= 12 ? "left" : typeof innerWidth === "number" && rail.pos.x >= innerWidth - 60 ? "right" : "none";
  return panelRoom(state.size.w, rail.active !== null && side === "left", rail.active !== null && side === "right");
}
export const fit = () => {
  if (!state.size.w) return;
  const { left, right } = coveredEdges();
  const v = fitAll([...allRects(), ...extraFitRects()], state.size.w - left - right, state.size.h);
  setView({ ...v, x: v.x + left });
};
export const zoomTo = (zoom: number, px = state.size.w / 2, py = state.size.h / 2) => setView(zoomAt(state.view, clampZoom(zoom), px, py));
export const zoomStep = (dir: 1 | -1) => zoomTo(stepZoom(state.view.zoom, dir));
export const panBy = (dx: number, dy: number) => setView({ ...state.view, x: state.view.x + dx, y: state.view.y + dy });
export const setLinked = (linked: boolean) => set({ linked });
export const setSpaceDown = (spaceDown: boolean) => spaceDown !== state.spaceDown && set({ spaceDown });
let movingTimer: ReturnType<typeof setTimeout> | undefined;
/** The board is moving under the pointer (wheel, trackpad): mark it until it has been still for a moment. */
export const markMoving = () => {
  if (!state.moving) set({ moving: true });
  clearTimeout(movingTimer);
  movingTimer = setTimeout(() => set({ moving: false }), 220);
};
export const setInteracting = (interacting: boolean) => {
  if (state.interacting === interacting) return;
  set({ interacting });
};

export const setFramePosition = (bp: Breakpoint, pos: { x: number; y: number }) => {
  set({ positions: { ...state.positions, [bp]: pos } });
  scheduleSave();
};

export const resetFramePositions = () => {
  set({ positions: {} });
  scheduleSave();
};

export const setFrameHidden = (bp: Breakpoint, hide: boolean) => {
  const nextHidden = { ...state.hidden, [bp]: hide };
  if (Object.values(nextHidden).every(Boolean)) return; // At least one must stay visible
  set({ hidden: nextHidden });
  scheduleSave();
};

export const toggleFrameHidden = (bp: Breakpoint) => {
  const willHide = !state.hidden[bp];
  if (willHide) {
    // The nearest shown frame takes over; at least one frame must always stay visible.
    const other = (["desktop", "mobile", "tablet", "widescreen"] as Breakpoint[]).find((b) => b !== bp && !state.hidden[b]);
    if (!other) return;
    setFrameHidden(bp, true);
    activateBreakpoint(other);
  } else {
    setFrameHidden(bp, false);
    activateBreakpoint(bp);
  }
};

export const setDotGrid = (dotGrid: boolean) => {
  set({ dotGrid });
  try {
    localStorage.setItem(DOT_GRID_KEY, String(dotGrid));
  } catch {}
};

export const toggleDotGrid = () => setDotGrid(!state.dotGrid);

/** Bring a world rect (a block in a frame) into view. */
export function revealRect(rect: Rect) {
  const next = reveal(state.view, rect, state.size.w, state.size.h);
  if (next !== state.view) setView(next);
}

/** World position of a frame's top-left corner. */
export const frameOrigin = (bp: Breakpoint) => frameRects().find((f) => f.bp === bp)!;
