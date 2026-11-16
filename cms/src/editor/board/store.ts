import { useSyncExternalStore } from "react";
import type { Breakpoint } from "../../schema";
import { clampZoom, fitAll, layoutFrames, loadView, reveal, saveView, slotRect, stepZoom, zoomAt, type Rect, type View } from "./viewport";

/**
 * View state of the breakpoint board: pan and zoom, each frame's measured
 * height, and the board's on-screen size. Document state (the draft, the
 * selection, the active breakpoint) stays in the editor store.
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
};

let state: BoardState = {
  view: { x: 0, y: 0, zoom: 0.35 },
  heights: { desktop: 900, mobile: 1600 },
  size: { w: 0, h: 0 },
  linked: true,
  spaceDown: false,
  pageId: null,
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

export const frameRects = (s: BoardState = state) => layoutFrames(s.heights);
const allRects = (s: BoardState = state): Rect[] => {
  const frames = frameRects(s);
  return [...frames, slotRect(frames)];
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
export function setView(view: View) {
  set({ view });
  clearTimeout(saveTimer);
  const pageId = state.pageId;
  if (pageId) saveTimer = setTimeout(() => saveView(pageId, view), 250);
}

export function setSize(w: number, h: number) {
  if (w === state.size.w && h === state.size.h) return;
  const first = !state.size.w;
  set({ size: { w, h } });
  if (first && state.pageId && !loadView(state.pageId)) fit();
}

/** Open a page: its remembered view, or "Fit all" the first time. */
export function openPage(pageId: string) {
  if (pageId === state.pageId) return;
  set({ pageId });
  const remembered = loadView(pageId);
  if (remembered) set({ view: remembered });
  else if (state.size.w) fit();
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

/** Bring a world rect (a block in a frame) into view. */
export function revealRect(rect: Rect) {
  const next = reveal(state.view, rect, state.size.w, state.size.h);
  if (next !== state.view) setView(next);
}

/** World position of a frame's top-left corner. */
export const frameOrigin = (bp: Breakpoint) => frameRects().find((f) => f.bp === bp)!;
