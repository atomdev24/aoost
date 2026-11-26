import { useSyncExternalStore } from "react";
import { placeRef, type RefItem } from "../../model/refs";
import { api } from "../api";
import { isCancelled, uploadFile } from "../media";
import { MEDIA_MIME, type DraggedMedia } from "../canvas/drops";
import { setExtraFitRects } from "./store";
import { showTip } from "../tips/tips";

/**
 * Reference images on the board, for the page that is open. They sit beside (behind) the frames,
 * are saved per page for the editor only and are never published: the site only ever shows what is
 * inside a frame.
 */
type RefsState = { pageId: string | null; items: RefItem[]; selected: string | null; error: string | null };
let state: RefsState = { pageId: null, items: [], selected: null, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<RefsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getRefs = () => state;
// Fit (⇧1) frames the references too.
setExtraFitRects(() => state.items.map(({ x, y, w, h }) => ({ x, y, w, h })));
export function useRefs<T>(selector: (s: RefsState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let loadSeq = 0;

/** Load the references of a page (on opening it). */
export async function loadRefs(pageId: string) {
  if (state.pageId === pageId) return;
  flushRefs();
  const seq = ++loadSeq;
  set({ pageId, items: [], selected: null, error: null });
  try {
    const { items } = await api.refs(pageId);
    if (seq === loadSeq) set({ items });
  } catch {
    // An editor without the refs route (or offline): the board just shows none.
  }
}

/** Save now (when leaving a page) instead of waiting for the pause. */
export function flushRefs() {
  if (!saveTimer || !state.pageId) return;
  clearTimeout(saveTimer);
  saveTimer = undefined;
  void api.putRefs(state.pageId, state.items).catch(() => set({ error: "References couldn't be saved." }));
}

function update(fn: (items: RefItem[]) => RefItem[]) {
  if (!state.pageId) return;
  set({ items: fn(state.items), error: null });
  clearTimeout(saveTimer);
  const page = state.pageId;
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    if (state.pageId !== page) return; // flushRefs already saved it when the page changed
    void api.putRefs(page, state.items).catch(() => set({ error: "References couldn't be saved." }));
  }, 400);
}

export const selectRef = (id: string | null) => state.selected !== id && set({ selected: id });
export const moveRef = (id: string, x: number, y: number) => update((items) => items.map((r) => (r.id === id ? { ...r, x: Math.round(x), y: Math.round(y) } : r)));
export const sizeRef = (id: string, w: number, h: number) => update((items) => items.map((r) => (r.id === id ? { ...r, w: Math.max(8, Math.round(w)), h: Math.max(8, Math.round(h)) } : r)));
/** Bring a reference to the front (last drawn = on top of the others). */
export const raiseRef = (id: string) => {
  const i = state.items.findIndex((r) => r.id === id);
  if (i >= 0 && i < state.items.length - 1) update((items) => [...items.filter((r) => r.id !== id), items[i]!]);
};
export const removeRef = (id: string) => {
  update((items) => items.filter((r) => r.id !== id));
  if (state.selected === id) set({ selected: null });
};
/** Replace the open page's references (undo and redo of moves between the board and the page). */
export const setRefItems = (items: RefItem[]) => update(() => items);
export function addRef(item: RefItem) {
  update((items) => [...items, item]);
  if (!item.node) showTip("ref");
  set({ selected: item.id });
}

const newId = () => `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const naturalSize = (src: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = src;
  });

/**
 * Drops on empty board space become references: images from the computer (uploaded to the media
 * library first) or items dragged from the media library. Drops on a frame are handled by the frame
 * (they place the picture on the page) and never reach here.
 */
export function attachRefDrops(host: HTMLElement, toWorld: (e: { clientX: number; clientY: number }) => { x: number; y: number }) {
  const wanted = (e: DragEvent) => {
    const t = e.dataTransfer?.types ?? [];
    return t.includes(MEDIA_MIME) || t.includes("Files");
  };
  const over = (e: DragEvent) => {
    if (!wanted(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    host.classList.add("is-ref-drop");
  };
  const leave = (e: DragEvent) => {
    if (e.target === host) host.classList.remove("is-ref-drop");
  };
  const drop = async (e: DragEvent) => {
    host.classList.remove("is-ref-drop");
    if (!wanted(e)) return;
    e.preventDefault();
    const at = toWorld(e);
    const media = e.dataTransfer?.getData(MEDIA_MIME);
    if (media) {
      try {
        const m = JSON.parse(media) as DraggedMedia;
        if (m.kind && m.kind !== "image") return set({ error: "Only pictures can be references for now." });
        const size = m.width && m.height ? { w: m.width, h: m.height } : await naturalSize(m.url);
        addRef(placeRef(newId(), m.url, at.x, at.y, size.w, size.h));
      } catch {
        // not ours
      }
      return;
    }
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return set({ error: "Only pictures can be references for now." });
    for (const [i, file] of files.entries()) {
      try {
        const item = await uploadFile(file);
        const size = item.width && item.height ? { w: item.width, h: item.height } : await naturalSize(item.url);
        addRef(placeRef(newId(), item.url, at.x + i * 40, at.y + i * 40, size.w, size.h));
      } catch (err) {
        if (!isCancelled(err)) set({ error: err instanceof Error ? err.message : "Upload failed." });
      }
    }
  };
  host.addEventListener("dragover", over);
  host.addEventListener("dragleave", leave);
  host.addEventListener("drop", drop);
  return () => {
    host.removeEventListener("dragover", over);
    host.removeEventListener("dragleave", leave);
    host.removeEventListener("drop", drop);
  };
}

export const dismissRefError = () => set({ error: null });
