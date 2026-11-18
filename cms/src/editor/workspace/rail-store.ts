import { useSyncExternalStore } from "react";

export type PanelId = "layers" | "pages" | "insert" | "media" | "nav" | "theme" | "fonts" | "global";

export type RailState = {
  active: PanelId | null;
  pinned: boolean;
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
const validPanels: PanelId[] = ["layers", "pages", "insert", "media", "nav", "theme", "fonts", "global"];
const initialActive = validPanels.includes(initialPanel as PanelId) ? (initialPanel as PanelId) : null;

let state: RailState = {
  active: initialActive,
  pinned: remembered<string>("aoost.rail.pinned", "false") === "true",
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
