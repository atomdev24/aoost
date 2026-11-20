import { useSyncExternalStore } from "react";

/*
 * Display settings for this browser. "Glass" is the blurred see-through look of
 * the floating toolbars. Some graphics setups draw it unreliably (flicker while
 * zooming), so it can be switched to plain solid panels. Kept per browser.
 */
const KEY = "aoost.glass";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

let glass = read();
export const glassOn = () => glass;

function apply() {
  document.documentElement.classList.toggle("ed-no-glass", !glass);
}

export function setGlass(on: boolean) {
  glass = on;
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    /* storage blocked: still applies for this visit */
  }
  apply();
  listeners.forEach((l) => l());
}

export const useGlass = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => glass,
  );

/** Apply the saved setting before the editor draws. */
export const startDisplay = apply;
