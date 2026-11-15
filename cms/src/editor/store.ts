import { useSyncExternalStore } from "react";
import { applyOps, diffSite, type Op } from "../model/ops";
import type { Breakpoint, Page, Site } from "../schema";
import { api, ApiError } from "./api";

/**
 * The editor's single source of truth: the draft site, which page and
 * breakpoint are active, the undo stack, and the autosave queue.
 * Puck is a view onto the current page; everything else reads from here.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";
type HistoryEntry = { site: Site; label: string; pageId: string };

export type EditorState = {
  site: Site;
  pageId: string;
  bp: Breakpoint;
  save: SaveStatus;
  saveError: string | null;
  /** The draft differs from what is published. */
  unpublished: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Selected node ids. Puck selects one; Shift-click on a canvas adds more. */
  selection: string[];
  /** The overlay being edited (overlays live outside Puck's tree). */
  overlayId: string | null;
  /** The global component being edited, if any. */
  globalId: string | null;
  /** Node ids to flash (changes made by Claude). */
  highlight: string[];
  /** Label of the last history step, for the status line. */
  lastLabel: string | null;
  clientId: string;
};

const MAX_HISTORY = 100;
const SAVE_DELAY = 700;
const MERGE_WINDOW = 1200;

let state: EditorState;
/** The site as the server has it; diffs against this become ops. */
let synced: Site;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving = false;
let lastMerge: { key: string; at: number } | null = null;

const set = (patch: Partial<EditorState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function initStore(site: Site, unpublished: boolean) {
  synced = site;
  const home = site.pages.find((p) => p.isHome) ?? site.pages[0]!;
  const wanted = new URLSearchParams(location.search).get("page");
  state = {
    site,
    pageId: site.pages.some((p) => p.id === wanted) ? wanted! : home.id,
    bp: window.innerWidth < 900 ? "mobile" : "desktop",
    save: "idle",
    saveError: null,
    unpublished,
    past: [],
    future: [],
    selection: [],
    overlayId: null,
    globalId: null,
    highlight: [],
    lastLabel: null,
    clientId: crypto.randomUUID(),
  };
}

export const getState = () => state;
export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}
export const currentPage = (s: EditorState = state): Page => s.site.pages.find((p) => p.id === s.pageId) ?? s.site.pages[0]!;

// ------------------------------------------------------------ editing

/**
 * Change the draft. `label` names the undo step; edits sharing a `merge` key
 * within a short window collapse into one step (typing, dragging a slider).
 */
export function update(fn: (site: Site) => Site, label: string, opts: { merge?: string } = {}) {
  const next = fn(state.site);
  if (next === state.site) return;
  const now = Date.now();
  const merging = !!opts.merge && lastMerge?.key === opts.merge && now - lastMerge.at < MERGE_WINDOW && state.past.length > 0;
  lastMerge = opts.merge ? { key: opts.merge, at: now } : null;
  set({
    site: next,
    past: merging ? state.past : [...state.past, { site: state.site, label, pageId: state.pageId }].slice(-MAX_HISTORY),
    future: [],
    lastLabel: label,
    unpublished: true,
  });
  scheduleSave();
}

export function updatePage(pageId: string, fn: (page: Page) => Page, label: string, opts: { merge?: string } = {}) {
  update(
    (site) => {
      let changed = false;
      const pages = site.pages.map((p) => {
        if (p.id !== pageId) return p;
        const next = fn(p);
        if (next !== p) changed = true;
        return next;
      });
      return changed ? { ...site, pages } : site;
    },
    label,
    opts,
  );
}

export function undo() {
  const entry = state.past[state.past.length - 1];
  if (!entry) return;
  lastMerge = null;
  set({
    site: entry.site,
    past: state.past.slice(0, -1),
    future: [{ site: state.site, label: entry.label, pageId: state.pageId }, ...state.future],
    pageId: entry.site.pages.some((p) => p.id === state.pageId) ? state.pageId : entry.pageId,
    lastLabel: `Undid: ${entry.label}`,
    unpublished: true,
  });
  scheduleSave();
}

export function redo() {
  const entry = state.future[0];
  if (!entry) return;
  lastMerge = null;
  set({
    site: entry.site,
    past: [...state.past, { site: state.site, label: entry.label, pageId: state.pageId }],
    future: state.future.slice(1),
    pageId: entry.site.pages.some((p) => p.id === state.pageId) ? state.pageId : entry.pageId,
    lastLabel: `Redid: ${entry.label}`,
    unpublished: true,
  });
  scheduleSave();
}

export function setPage(pageId: string) {
  if (pageId === state.pageId || !state.site.pages.some((p) => p.id === pageId)) return;
  history.replaceState(null, "", `?page=${pageId}`);
  set({ pageId, selection: [], overlayId: null, globalId: null });
}
export const setBreakpoint = (bp: Breakpoint) => bp !== state.bp && set({ bp });
export const setSelection = (ids: string[]) => {
  if (ids.length !== state.selection.length || ids.some((id, i) => id !== state.selection[i])) set({ selection: ids });
};
export const setOverlay = (overlayId: string | null) => overlayId !== state.overlayId && set({ overlayId, globalId: null });
export const setGlobalEdit = (globalId: string | null) => globalId !== state.globalId && set({ globalId, overlayId: null });
export const setUnpublished = (unpublished: boolean) => set({ unpublished });

// ---------------------------------------------------------- autosave

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flush(), SAVE_DELAY);
}

/** Send what changed since the last successful save. Safe to call any time. */
export async function flush(): Promise<boolean> {
  clearTimeout(saveTimer);
  if (saving) {
    scheduleSave();
    return false;
  }
  const target = state.site;
  const ops = diffSite(synced, target);
  if (!ops.length) {
    if (state.save === "saving") set({ save: "saved" });
    return true;
  }
  saving = true;
  set({ save: "saving", saveError: null });
  try {
    await api.ops(ops, state.clientId, state.lastLabel ?? undefined);
    synced = target;
    set({ save: state.site === target ? "saved" : "saving" });
    if (state.site !== target) scheduleSave();
    return true;
  } catch (e) {
    const detail = e instanceof ApiError && e.issues?.length ? `${e.message} (${e.issues[0]!.path}: ${e.issues[0]!.message})` : e instanceof Error ? e.message : "Could not save.";
    set({ save: "error", saveError: detail });
    return false;
  } finally {
    saving = false;
  }
}

// ------------------------------------------------------- remote changes

/**
 * Changes that arrived from the draft store (Claude through /mcp, or another
 * tab). They apply on top of local state, land on the undo stack with their
 * summary, and flash the nodes they touched.
 */
export function applyRemote(ops: Op[], label: string, changedNodeIds: string[] = []) {
  synced = applyOps(synced, ops);
  const next = applyOps(state.site, ops);
  set({
    site: next,
    past: [...state.past, { site: state.site, label, pageId: state.pageId }].slice(-MAX_HISTORY),
    future: [],
    lastLabel: label,
    highlight: changedNodeIds,
    unpublished: true,
    pageId: next.pages.some((p) => p.id === state.pageId) ? state.pageId : (next.pages.find((p) => p.isHome) ?? next.pages[0]!).id,
  });
  if (changedNodeIds.length) setTimeout(() => state.highlight === changedNodeIds && set({ highlight: [] }), 2200);
}

/** After a reset or publish the server state is authoritative. */
export function replaceSite(site: Site, unpublished: boolean) {
  synced = site;
  set({ site, past: [], future: [], unpublished, save: "idle", lastLabel: null, pageId: site.pages.some((p) => p.id === state.pageId) ? state.pageId : site.pages[0]!.id });
}

window.addEventListener("beforeunload", (e) => {
  if (state && diffSite(synced, state.site).length) {
    void flush();
    e.preventDefault();
  }
});
