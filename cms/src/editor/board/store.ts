import { useSyncExternalStore } from "react";
import type { Breakpoint } from "../../schema";
import { activateBreakpoint } from "./bridge";
import { clampZoom, fitAll, layoutFrames, loadPageBoard, reveal, savePageBoard, slotRect, stepZoom, zoomAt, type FrameRect, type Rect, type View } from "./viewport";

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
};

let state: BoardState = {
  view: { x: 0, y: 0, zoom: 0.35 },
  heights: { desktop: 900, mobile: 1600 },
  size: { w: 0, h: 0 },
  linked: true,
  spaceDown: false,
  pageId: null,
  interacting: false,
  hidden: { desktop: false, mobile: false },
  positions: {},
  dotGrid: loadDotGridPref(),
  ready: { desktop: false, mobile: false },
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
  const defaults = layoutFrames(s.heights);
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
  if (first && state.pageId && !loadPageBoard(state.pageId)) fit();
}

/** Open a page: its remembered view, hidden frames, and positions, or "Fit all" the first time. */
export function openPage(pageId: string) {
  if (pageId === state.pageId) return;
  const saved = loadPageBoard(pageId);
  set({
    pageId,
    ready: { desktop: false, mobile: false },
    ...(saved
      ? {
          view: saved.view,
          hidden: saved.hidden ?? { desktop: false, mobile: false },
          positions: saved.positions ?? {},
        }
      : {
          hidden: { desktop: false, mobile: false },
          positions: {},
        }),
  });
  if (!saved && state.size.w) fit();
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

export const fit = () => state.size.w && setView(fitAll(allRects(), state.size.w, state.size.h));
export const zoomTo = (zoom: number, px = state.size.w / 2, py = state.size.h / 2) => setView(zoomAt(state.view, clampZoom(zoom), px, py));
export const zoomStep = (dir: 1 | -1) => zoomTo(stepZoom(state.view.zoom, dir));
export const panBy = (dx: number, dy: number) => setView({ ...state.view, x: state.view.x + dx, y: state.view.y + dy });
export const setLinked = (linked: boolean) => set({ linked });
export const setSpaceDown = (spaceDown: boolean) => spaceDown !== state.spaceDown && set({ spaceDown });
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
  if (nextHidden.desktop && nextHidden.mobile) return; // At least one must stay visible
  set({ hidden: nextHidden });
  scheduleSave();
};

export const toggleFrameHidden = (bp: Breakpoint) => {
  const willHide = !state.hidden[bp];
  if (willHide) {
    const other: Breakpoint = bp === "desktop" ? "mobile" : "desktop";
    if (state.hidden[other]) return; // At least one frame must always stay visible
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
