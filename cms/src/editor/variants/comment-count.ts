import { useSyncExternalStore } from "react";

/**
 * Open comment threads on a page, for the variant rows and Review. The comments store loads after
 * the board (vite.config.ts LATER), so it's imported here on first use rather than up front.
 */
type Store = typeof import("../comments/store");
let store: Store | null = null;
let started = false;
const listeners = new Set<() => void>();
const ping = () => listeners.forEach((l) => l());
function start() {
  if (started) return;
  started = true;
  void import("../comments/store").then((m) => {
    store = m;
    m.subscribeComments(ping);
    ping();
  });
}
export function useOpenComments(pageId: string): number {
  start();
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => (store ? store.getComments().threads.filter((t) => t.pageId === pageId && t.status === "open").length : 0),
  );
}
