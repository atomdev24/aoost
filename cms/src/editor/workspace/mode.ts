import { useSyncExternalStore } from "react";
import { getRole, useRole } from "../team/role";

/**
 * Simple or Full (direction B, Nov 2026). Simple is for teammates who change words and pictures:
 * Content only in the side panel, no resize handles, Desktop and Mobile only, brand colours only,
 * no Site settings. Full is the whole editor. Each person's choice is remembered; until they
 * choose, Owners start in Full and everyone else in Simple.
 */
import { defaultMode, type EditorMode } from "./mode-default";
export { defaultMode, type EditorMode };
const KEY = "aoost.mode";
const read = (): EditorMode | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "simple" || v === "full" ? v : null;
  } catch {
    return null;
  }
};
let chosen = read();
const subs = new Set<() => void>();

export const getMode = (): EditorMode => chosen ?? defaultMode(getRole());
export function setMode(m: EditorMode) {
  chosen = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* private window */
  }
  subs.forEach((f) => f());
}
export function useMode(): EditorMode {
  const role = useRole();
  const c = useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => chosen,
    () => chosen,
  );
  return c ?? defaultMode(role);
}
export const useSimple = () => useMode() === "simple";
