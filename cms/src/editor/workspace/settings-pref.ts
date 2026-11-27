import { useSyncExternalStore } from "react";

/**
 * Whether the side panel (settings) shows for the selection (direction A: settings on request).
 * The Settings button in the block's action bar flips it; each person's choice is remembered.
 */
const KEY = "aoost.settings.shown";
let shown = (() => {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
})();
const subs = new Set<() => void>();
export const getSettingsShown = () => shown;
export function toggleSettings(next = !shown) {
  shown = next;
  try {
    localStorage.setItem(KEY, shown ? "1" : "0");
  } catch {
    /* private window */
  }
  subs.forEach((f) => f());
}
export const useSettingsShown = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => shown,
    () => shown,
  );
