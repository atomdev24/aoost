import { useSyncExternalStore } from "react";

/** Asks the Insert panel to show its Saved tab, with a just-saved block ready to rename. */
let req: { id: string; at: number } | null = null;
const subs = new Set<() => void>();
export function openSavedTab(id: string) {
  req = { id, at: Date.now() };
  subs.forEach((f) => f());
}
export const useSavedRequest = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => req,
    () => req,
  );
