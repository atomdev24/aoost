import { useSyncExternalStore } from "react";

/** The right-click menu: where it opens and what was clicked (a block, a section or empty page). */
export type ContextTarget = { x: number; y: number; id: string | null; kind: "node" | "section" | "page" };

let state: ContextTarget | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openContextMenu(t: ContextTarget) {
  state = t;
  emit();
}
export function closeContextMenu() {
  if (!state) return;
  state = null;
  emit();
}
export const getContextMenu = () => state;
export const useContextMenu = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => state,
  );
