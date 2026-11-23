import { useSyncExternalStore } from "react";
import { ownerPage } from "../../model/variants";
import { currentPage, getState } from "../store";

/** Whether the side-by-side board of a page's designs is open (the page id), kept apart so the board itself can load later. */

let comparing: string | null = null;
/** What "Use this one" did, kept here so it outlives the editor redrawing for the page it opened. */
export type DesignsDone = { name: string; link: string | null; at: number };
let done: DesignsDone | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
/** Lay the page and its designs side by side (the page id; a variant's page is used). */
export function openDesigns(pageId?: string) {
  const s = getState();
  const page = ownerPage(s.site, pageId ? (s.site.pages.find((p) => p.id === pageId) ?? currentPage(s)) : currentPage(s));
  comparing = page.id;
  done = null;
  emit();
}
export const closeDesigns = () => ((comparing = null), (done = null), emit());
export const setDesignsDone = (d: DesignsDone | null) => ((done = d), emit());
export function useDesignsDone(): DesignsDone | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => done,
  );
}
export function useDesignsOpen(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => comparing,
  );
}
