import { useSyncExternalStore } from "react";

/**
 * Which version the Pick sheet is open for (a page or variant id), and what picking did, kept apart
 * so the sheet can load later and its result outlives the editor redrawing for the page it opened.
 */
export type PickDone = { ok: boolean; link: string | null; name: string; staging: boolean };
let state: { id: string | null; done: PickDone | null } = { id: null, done: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const openPick = (id: string) => ((state = { id, done: null }), emit());
export const closePick = () => ((state = { id: null, done: null }), emit());
export const setPickDone = (done: PickDone) => ((state = { ...state, done }), emit());
export function usePickOpen(): string | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state.id,
    () => state.id,
  );
}
export function usePickDone(): PickDone | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state.done,
    () => state.done,
  );
}
