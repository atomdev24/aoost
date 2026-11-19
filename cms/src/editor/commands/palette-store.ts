import { isTouchOnly } from "../touch/device";
import { useSyncExternalStore } from "react";

/**
 * Which overlay is up (the palette or the cheat sheet), and what Alex visited
 * recently (pages and blocks) for the palette's empty state.
 */
export type Recent = { kind: "page"; pageId: string; label: string } | { kind: "block"; pageId: string; id: string; label: string };

type State = { palette: boolean; cheat: boolean; recent: Recent[]; asked: { text: string; at: number } | null };

const KEY = "aoost.palette.recent";
const MAX_RECENT = 6;
const load = (): Recent[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

let state: State = { palette: false, cheat: false, recent: typeof localStorage === "undefined" ? [] : load(), asked: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getPalette = () => state;
export function usePalette<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => sel(state),
  );
}

export const openPalette = () => set({ palette: true, cheat: false });
export const closePalette = () => state.palette && set({ palette: false });
export const togglePalette = () => (state.palette ? closePalette() : openPalette());
// On a touch-only device there is no keyboard to learn, so the cheat sheet never opens.
export const openCheatSheet = () => {
  if (!isTouchOnly()) set({ cheat: true, palette: false });
};
export const closeCheatSheet = () => state.cheat && set({ cheat: false });
export const toggleCheatSheet = () => (state.cheat ? closeCheatSheet() : openCheatSheet());

const same = (a: Recent, b: Recent) => a.kind === b.kind && a.pageId === b.pageId && (a.kind === "page" || (b.kind === "block" && a.id === b.id));

/** Put a page or block at the top of Recent (newest first, no repeats). */
export function noteRecent(item: Recent) {
  const recent = [item, ...state.recent.filter((r) => !same(r, item))].slice(0, MAX_RECENT);
  set({ recent });
  try {
    localStorage.setItem(KEY, JSON.stringify(recent));
  } catch {
    /* private window */
  }
}

/** The palette sent a request to Claude: the toolbar's Ask Claude note opens to confirm it. */
export const noteAsked = (text: string) => set({ asked: { text, at: Date.now() } });
