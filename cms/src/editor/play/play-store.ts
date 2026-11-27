import { useSyncExternalStore } from "react";

/** Which page (or variant) is playing, at which screen size. One at a time. */
export type Playing = { pageId: string; bp: string } | null;
let current: Playing = null;
const subs = new Set<() => void>();
export const getPlaying = () => current;
export function play(next: Playing) {
  current = next;
  subs.forEach((f) => f());
}
export const usePlaying = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => current,
    () => current,
  );
