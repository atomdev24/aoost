import { useSyncExternalStore } from "react";

/** Which text block is being edited in place on the canvas (one at a time), and on which screen size. */
type RichEdit = { id: string; bp: string } | null;
let current: RichEdit = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const getRichEdit = () => current;
export function startRichEdit(id: string, bp: string) {
  if (current?.id === id && current.bp === bp) return;
  current = { id, bp };
  emit();
}
export function stopRichEdit() {
  if (!current) return;
  current = null;
  emit();
}
export const useRichEdit = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => current,
    () => current,
  );
