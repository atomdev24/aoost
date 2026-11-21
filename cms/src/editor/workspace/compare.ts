import { useSyncExternalStore } from "react";

/** What the compare view shows: two renders side by side, what changed, and an action to take from there. */
export type CompareSpec = {
  title: string;
  left: { label: string; src: string };
  right: { label: string; src: string };
  /** Grouped changes ("Home: Added Text, Section order"); empty = no differences found. */
  changes: { title: string; items: string[] }[];
  action?: { label: string; run: () => void | Promise<void> };
};

let spec: CompareSpec | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const openCompare = (s: CompareSpec) => ((spec = s), emit());
export const closeCompare = () => ((spec = null), emit());
export function useCompare(): CompareSpec | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => spec,
  );
}
