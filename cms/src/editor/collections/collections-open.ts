import { useSyncExternalStore } from "react";

/** Whether the Collections view is open, and which collection and item it shows (kept apart so the view itself can load later). */
export type CollectionsOpen = { collectionId: string | null; itemId: string | null };

let open: CollectionsOpen | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openCollections(collectionId: string | null = open?.collectionId ?? null, itemId: string | null = null) {
  open = { collectionId, itemId };
  emit();
}
export const closeCollections = () => ((open = null), emit());
export const getCollectionsOpen = () => open;

export function useCollectionsOpen(): CollectionsOpen | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );
}
