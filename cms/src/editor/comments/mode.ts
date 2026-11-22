import { useSyncExternalStore } from "react";

/**
 * Comment mode, kept tiny because it loads with the editor: the toolbar's Comment tool (C) turns it
 * on, and while it's on a click in the editable frame starts a comment instead of selecting. The
 * comments themselves (pins, threads, the panel) load later (comments/*.tsx, parts.ts).
 */
let on = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const isCommentMode = () => on;
export const setCommentMode = (next: boolean) => {
  if (next === on) return;
  on = next;
  document.documentElement.classList.toggle("ed-commenting", on);
  emit();
};
export const toggleCommentMode = () => setCommentMode(!on);
export const useCommentMode = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => on,
  );

/** The comment layer registers what a click on the canvas does while commenting. */
let onCanvasClick: ((doc: Document, e: MouseEvent) => void) | null = null;
export const setCanvasCommentHandler = (fn: typeof onCanvasClick) => {
  onCanvasClick = fn;
};

/** In the editable frame: while commenting, a click starts a comment and nothing else sees it. */
export function attachCommentClicks(doc: Document) {
  const stop = (e: MouseEvent) => {
    if (!on || e.button !== 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "click") onCanvasClick?.(doc, e);
  };
  for (const t of ["pointerdown", "mousedown", "click"] as const) doc.addEventListener(t, stop as EventListener, true);
  return () => {
    for (const t of ["pointerdown", "mousedown", "click"] as const) doc.removeEventListener(t, stop as EventListener, true);
  };
}
