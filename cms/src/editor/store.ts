import { applyTranslation, translatable } from "../model/i18n";
import { useSyncExternalStore } from "react";
import { applyOps, diffSite, type Op } from "../model/ops";
import { findNavItem, updateNavItem } from "../model/nav";
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
  /** The language being edited, when it isn't the site's main one (null = main language). */
  lang: string | null;
  save: SaveStatus;
  saveError: string | null;
  /** When the draft last reached the server (for "saved just now"). */
  savedAt: number | null;
  /** The draft differs from what is published. */
  unpublished: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** The page to return to when a menu panel is being edited. */
  returnPageId: string | null;
  /** Selected node ids. Puck selects one; Shift-click on a canvas adds more. */
  selection: string[];
  /** The overlay being edited (overlays live outside Puck's tree). */
  overlayId: string | null;
  /** The global component being edited, if any. */
  globalId: string | null;
  /** Node ids to flash (changes made by Claude). */
  highlight: string[];
  /** Connected to the draft store for live sync. */
  live: boolean;
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
let onSaved: ((version: number) => void) | null = null;
export const setOnSaved = (fn: (version: number) => void) => {
  onSaved = fn;
};
let lastMerge: { key: string; at: number } | null = null;
/** A drag in progress (scrubbing a number, adjusting an image): all its edits become one undo step. */
let gesture: { first: boolean } | null = null;
export const beginGesture = () => {
  gesture = { first: true };
};
export const endGesture = () => {
  gesture = null;
  lastMerge = null;
};

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
    lang: null,
    save: "idle",
    saveError: null,
    savedAt: null,
    unpublished,
    past: [],
    future: [],
    returnPageId: null,
    selection: [],
    overlayId: null,
    globalId: null,
    highlight: [],
    live: false,
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
/**
 * A mega menu's panel is edited on the same canvas as a page. While that is
 * happening `pageId` is "mega:<nav item id>" and the panel is presented as a
 * page, so Puck, the layers panel and the CSS generator need no special cases.
 */
const MEGA = "mega:";
export const megaItemId = (pageId: string): string | null => (pageId.startsWith(MEGA) ? pageId.slice(MEGA.length) : null);
export const megaPageId = (itemId: string) => MEGA + itemId;

function megaPage(site: Site, itemId: string): Page | null {
  const item = findNavItem(site.nav.items, itemId);
  if (!item || item.type !== "mega") return null;
  return { id: megaPageId(itemId), title: `${item.label ?? "Menu"} (menu panel)`, slug: "/", parentId: null, status: "draft", template: "blank", seo: {}, isHome: false, showInNav: false, sections: item.panel ?? [], overlays: [] };
}

const pageExists = (site: Site, pageId: string) => {
  const mega = megaItemId(pageId);
  return mega ? !!megaPage(site, mega) : site.pages.some((p) => p.id === pageId);
};

let megaCache: { panel: unknown; page: Page } | null = null;
export const currentPage = (s: EditorState = state): Page => {
  const mega = megaItemId(s.pageId);
  if (mega) {
    const panel = findNavItem(s.site.nav.items, mega)?.panel;
    // Keep the same object while the panel is unchanged, so subscribers don't re-render needlessly.
    if (megaCache && megaCache.panel === panel && megaCache.page.id === s.pageId) return megaCache.page;
    const page = megaPage(s.site, mega);
    if (page) {
      megaCache = { panel, page };
      return page;
    }
  }
  const page = s.site.pages.find((p) => p.id === s.pageId) ?? s.site.pages[0]!;
  // In another language the canvas shows the page as it reads there (same object while unchanged).
  if (s.lang && page.translations?.[s.lang] && translatable(page)) {
    if (langCache && langCache.page === page && langCache.lang === s.lang) return langCache.view;
    const view = applyTranslation(page, s.lang);
    langCache = { page, lang: s.lang, view };
    return view;
  }
  return page;
};
let langCache: { page: Page; lang: string; view: Page } | null = null;

// ------------------------------------------------------------ editing

/**
 * Change the draft. `label` names the undo step; edits sharing a `merge` key
 * within a short window collapse into one step (typing, dragging a slider).
 */
export function update(fn: (site: Site) => Site, label: string, opts: { merge?: string } = {}) {
  const next = fn(state.site);
  if (next === state.site) return;
  const now = Date.now();
  const merging = gesture ? !gesture.first && state.past.length > 0 : !!opts.merge && lastMerge?.key === opts.merge && now - lastMerge.at < MERGE_WINDOW && state.past.length > 0;
  if (gesture) gesture.first = false;
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
  const mega = megaItemId(pageId);
  if (mega) {
    update(
      (site) => {
        const page = megaPage(site, mega);
        const next = page ? fn(page) : page;
        return page && next && next !== page ? updateNavItem(site, mega, { panel: next.sections }) : site;
      },
      label,
      opts,
    );
    return;
  }
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
    pageId: pageExists(entry.site, state.pageId) ? state.pageId : entry.pageId,
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
    pageId: pageExists(entry.site, state.pageId) ? state.pageId : entry.pageId,
    lastLabel: `Redid: ${entry.label}`,
    unpublished: true,
  });
  scheduleSave();
}

export function setPage(pageId: string) {
  if (pageId === state.pageId || !pageExists(state.site, pageId)) return;
  const mega = megaItemId(pageId);
  if (!mega) history.replaceState(null, "", `?page=${pageId}`);
  // Remember which page to come back to after editing a menu panel.
  set({ pageId, returnPageId: mega ? (megaItemId(state.pageId) ? state.returnPageId : state.pageId) : null, selection: [], overlayId: null, globalId: null });
}
export const setBreakpoint = (bp: Breakpoint) => bp !== state.bp && set({ bp });
/** Edit the open page in a language (null: the main language). Selection doesn't carry over. */
export const setLang = (lang: string | null) => lang !== state.lang && set({ lang, selection: [], overlayId: null });
export const setSelection = (ids: string[]) => {
  if (ids.length !== state.selection.length || ids.some((id, i) => id !== state.selection[i])) set({ selection: ids });
};
export const setOverlay = (overlayId: string | null) => overlayId !== state.overlayId && set({ overlayId, globalId: null });
export const setGlobalEdit = (globalId: string | null) => globalId !== state.globalId && set({ globalId, overlayId: null });
export const setLive = (live: boolean) => live !== state.live && set({ live });
/** The draft store names each connection; saves carry that name so our own edits aren't echoed back. */
export const setClientId = (clientId: string) => set({ clientId });
export const hasUnsavedChanges = () => diffSite(synced, state.site).length > 0;
export const setUnpublished = (unpublished: boolean) => set({ unpublished });

// ---------------------------------------------------------- autosave

function scheduleSave() {
  clearTimeout(saveTimer);
  // Unsaved edits read as "saving…" straight away, so the status never claims a save that hasn't happened.
  if (state.save !== "saving" && state.save !== "error") set({ save: "saving" });
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
    const { version } = await api.ops(ops, state.clientId, state.lastLabel ?? undefined);
    onSaved?.(version);
    synced = target;
    set({ save: state.site === target ? "saved" : "saving", savedAt: Date.now() });
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
    pageId: pageExists(next, state.pageId) ? state.pageId : (next.pages.find((p) => p.isHome) ?? next.pages[0]!).id,
  });
  if (changedNodeIds.length) setTimeout(() => state.highlight === changedNodeIds && set({ highlight: [] }), 2200);
}

/** After a reset or publish the server state is authoritative. */
export function replaceSite(site: Site, unpublished: boolean) {
  synced = site;
  set({ site, past: [], future: [], unpublished, save: "idle", lastLabel: null, pageId: pageExists(site, state.pageId) ? state.pageId : site.pages[0]!.id });
}

window.addEventListener("beforeunload", (e) => {
  if (state && diffSite(synced, state.site).length) {
    void flush();
    e.preventDefault();
  }
});
