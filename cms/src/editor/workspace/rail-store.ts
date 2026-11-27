import { useSyncExternalStore } from "react";

export type PanelId = "layers" | "pages" | "insert" | "media" | "comments" | "history" | "nav" | "theme" | "fonts" | "global" | "templates" | "collections";

export type RailState = {
  active: PanelId | null;
  pinned: boolean;
  /** Where the rail was dragged to (window px, its top-left corner); null = its usual spot. */
  pos: { x: number; y: number } | null;
};

const loadPos = (): RailState["pos"] => {
  try {
    const v = JSON.parse(localStorage.getItem("aoost.rail.pos") ?? "null") as { x?: unknown; y?: unknown } | null;
    return v && typeof v.x === "number" && typeof v.y === "number" && Number.isFinite(v.x) && Number.isFinite(v.y) ? { x: v.x, y: v.y } : null;
  } catch {
    return null;
  }
};

const remembered = <T extends string>(key: string, fallback: T): T => {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
};

const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private window */
  }
};

const initialPanel = remembered<string>("aoost.rail.panel", "layers");
const validPanels: PanelId[] = ["layers", "pages", "insert", "media", "history", "nav", "theme", "fonts", "global", "templates"];
// On a phone a flyout covers most of the canvas, so the editor opens with none.
const phoneAtLoad = typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
const initialActive = !phoneAtLoad && validPanels.includes(initialPanel as PanelId) ? (initialPanel as PanelId) : null;

let state: RailState = {
  active: initialActive,
  pinned: remembered<string>("aoost.rail.pinned", "false") === "true",
  pos: loadPos(),
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getRailState = () => state;

export function useRail<T>(selector: (s: RailState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => selector(state),
  );
}

export function togglePanel(id: PanelId) {
  const next = state.active === id ? null : id;
  state = { ...state, active: next };
  remember("aoost.rail.panel", next ?? "");
  emit();
}

export function openPanel(id: PanelId) {
  if (state.active === id) return;
  state = { ...state, active: id };
  remember("aoost.rail.panel", id);
  emit();
}

export function closeFlyout() {
  if (!state.active) return;
  state = { ...state, active: null };
  remember("aoost.rail.panel", "");
  emit();
}

export function closeUnpinnedFlyout() {
  if (!state.pinned && state.active) {
    closeFlyout();
  }
}

export function setPinned(pinned: boolean) {
  state = { ...state, pinned };
  remember("aoost.rail.pinned", String(pinned));
  emit();
}

export function togglePinned() {
  setPinned(!state.pinned);
}

/** Move the rail (and its flyouts) to a spot on the screen; null puts it back. */
export function setRailPos(pos: RailState["pos"]) {
  state = { ...state, pos };
  try {
    if (pos) localStorage.setItem("aoost.rail.pos", JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }));
    else localStorage.removeItem("aoost.rail.pos");
  } catch {
    /* private window */
  }
  emit();
}

export const RAIL_HOME = { x: 10, y: 58 };
/** The rail with its labels under the icons (direction A, Nov 2026). */
export const RAIL_W = 60;
export const FLYOUT_W = 260;
const GAP = 6;

/**
 * Where the rail and its flyout sit for a rail at `pos` (null = home) in a window W×H, with the
 * rail `railH` tall: kept on screen, snapped to an edge when close, and the flyout opening on the
 * side with room. `side` says which edge of the board the flyout covers ("none" when floating).
 */
export function railLayout(pos: RailState["pos"], W: number, H: number, railH: number) {
  const p = pos ?? RAIL_HOME;
  const SNAP = 16;
  let x = Math.max(8, Math.min(W - RAIL_W - 8, p.x));
  const y = Math.max(8, Math.min(Math.max(8, H - railH - 8), p.y));
  if (x < SNAP + 10) x = RAIL_HOME.x;
  if (x > W - RAIL_W - SNAP - 10) x = W - RAIL_W - RAIL_HOME.x;
  const roomRight = x + RAIL_W + GAP + FLYOUT_W <= W - 8;
  const flyoutX = roomRight ? x + RAIL_W + GAP : x - GAP - FLYOUT_W;
  const side: "left" | "right" | "none" = x <= RAIL_HOME.x + 1 ? "left" : x >= W - RAIL_W - RAIL_HOME.x - 1 ? "right" : "none";
  return { x, y, flyoutX: Math.max(8, flyoutX), flyoutY: Math.max(8, Math.min(y, H - 240)), side };
}
