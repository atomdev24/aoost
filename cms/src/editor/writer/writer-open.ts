import { useSyncExternalStore } from "react";

let open: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Open the blog writer on a post page. */
export const openWriter = (pageId: string) => ((open = pageId), emit());
export const closeWriter = () => ((open = null), emit());
export function useWriterOpen(): string | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => open,
    () => null,
  );
}
