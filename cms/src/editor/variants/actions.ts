import { useSyncExternalStore } from "react";
import { createVariant, ownerPage, pickVersion, proposeVariant, restoreVariant, toggleVote } from "../../model/variants";
import { deletePage } from "../../model/pages";
import { getBoard } from "../board/store";
import { savePageBoard } from "../board/viewport";
import { flush, getState, setPage, update } from "../store";
import { getWho } from "../team/role";
import { getStaging, sendToStaging } from "../workspace/staging";

/**
 * Variants front and centre (EDITOR-VARIANTS.md): anyone makes and proposes a variant, the team
 * votes and comments, a manager picks one. Every action is one undo step through the store.
 */

/** Who's voting: the signed-in email, else a stable id for this browser (the demo, the password). */
export function voter(): { id: string; name: string } {
  let id = getWho();
  if (!id || id === "owner" || id === "password") {
    try {
      id = localStorage.getItem("ed-voter-id") ?? "";
      if (!id) {
        id = `b-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("ed-voter-id", id);
      }
    } catch {
      id = "this-browser";
    }
  }
  return { id, name: myName() };
}
/** The name people see on comments, votes and new variants. */
export function myName(): string {
  try {
    const a = JSON.parse(localStorage.getItem("ed-comment-author") ?? "null") as { name?: string } | null;
    if (a?.name) return a.name.slice(0, 60);
  } catch {
    /* no saved name */
  }
  const who = getWho();
  return who && who.includes("@") ? who.split("@")[0]! : "You";
}

/** Open another version of the page in the same spot on the board (the camera stays put). */
export function openVersion(id: string) {
  const b = getBoard();
  if (id === getState().pageId) return;
  savePageBoard(id, { view: b.view, hidden: b.hidden, positions: b.positions });
  setPage(id);
}

/** Make a variant of a page (of its page, given a variant) and open it, signed with your name. */
export function newVariant(pageId?: string) {
  const s = getState();
  const made = createVariant(s.site, pageId ?? s.pageId);
  if (!made) return;
  const by = myName();
  update(() => ({ ...made.site, pages: made.site.pages.map((p) => (p.id === made.pageId ? { ...p, variantBy: by } : p)) }), "New variant");
  openVersion(made.pageId);
}

export const propose = (id: string, on: boolean) => update((s) => proposeVariant(s, id, on), on ? "Propose for review" : "Back to draft");
export const vote = (id: string) => update((s) => toggleVote(s, id, voter()), "Vote");
export const restore = (id: string) => update((s) => restoreVariant(s, id), "Bring back an earlier version");
export function removeVariant(id: string) {
  const s = getState();
  const v = s.site.pages.find((p) => p.id === id);
  if (!v?.variantOf) return;
  if (s.pageId === id) openVersion(v.variantOf);
  update((site) => deletePage(site, id), `Delete ${v.variantName ?? "variant"}`);
}

/**
 * A manager picks a version (or keeps the page as it is): the others become earlier versions.
 * Then, if asked, the draft goes to staging; returns the staging link to the page, if any.
 */
export async function pick(pickedId: string, then: "staging" | "none"): Promise<{ ok: boolean; link: string | null }> {
  const s = getState();
  const picked = s.site.pages.find((p) => p.id === pickedId);
  if (!picked) return { ok: false, link: null };
  const page = ownerPage(s.site, picked);
  const label = picked.id === page.id ? `Keep ${page.title}` : `Pick ${picked.variantName ?? "variant"}`;
  let ok = true;
  update((site) => {
    const next = pickVersion(site, page.id, picked.id);
    if (!next) ok = false;
    return next ?? site;
  }, label);
  if (!ok) return { ok: false, link: null };
  openVersion(page.id);
  if (then === "none") return { ok: true, link: null };
  await flush();
  const sent = await sendToStaging(`${page.title}: ${picked.id === page.id ? "as it was" : (picked.variantName ?? "variant")}`);
  const info = getStaging().info;
  if (!sent || !info) return { ok: true, link: null };
  const path = page.isHome ? "" : page.slug.replace(/^\//, "") + "/";
  return { ok: true, link: info.url.replace(/\/?$/, "/") + path };
}

// ------------------------------------------------------------------ board preferences (per browser)

export type RowsMode = "all" | "proposed" | "none";
/** hidden: versions folded away on the board (their header's eye), by page id. */
type Prefs = { rows: RowsMode; outline: boolean; hidden: string[] };
const KEY = "ed-variant-prefs";
let prefs: Prefs = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Prefs> | null;
    return { rows: raw?.rows === "proposed" || raw?.rows === "none" ? raw.rows : "all", outline: raw?.outline !== false, hidden: Array.isArray(raw?.hidden) ? raw!.hidden.filter((x) => typeof x === "string") : [] };
  } catch {
    return { rows: "all", outline: true, hidden: [] };
  }
})();
/** Fold a version away on the board, or bring it back. */
export const setVersionHidden = (pageId: string, hide: boolean) =>
  setVariantPrefs({ hidden: hide ? [...new Set([...prefs.hidden, pageId])] : prefs.hidden.filter((id) => id !== pageId) });
const listeners = new Set<() => void>();
export function setVariantPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}
export const getVariantPrefs = () => prefs;
export function useVariantPrefs(): Prefs {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => prefs,
    () => prefs,
  );
}
