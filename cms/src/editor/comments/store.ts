import { useSyncExternalStore } from "react";
import { lastActivity, type CommentAuthor, type CommentOp, type CommentThread } from "../../model/comments";
import { onServerMessage } from "../socket";

/**
 * The comments in the open editor (loads after the board, with the pins and the panel): every
 * thread on the site, kept fresh by the live connection, plus what this browser remembers —
 * the name and colour you comment under, and which threads you've read.
 */

type Draft = { pageId: string; nodeId: string; path?: (string | number)[]; bp: CommentThread["bp"]; fx: number; fy: number; label: string };
export type CommentsState = {
  threads: CommentThread[];
  loaded: boolean;
  /** The thread shown open on the canvas, or a new one being written. */
  open: string | null;
  draft: Draft | null;
  /** Show resolved threads' pins too. */
  showResolved: boolean;
  error: string | null;
  seen: Record<string, number>;
};

const SEEN_KEY = "ed-comments-seen";
const AUTHOR_KEY = "ed-comment-author";
const readJson = <T>(key: string, fallback: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode */
  }
};

let state: CommentsState = { threads: [], loaded: false, open: null, draft: null, showResolved: false, error: null, seen: readJson(SEEN_KEY, {}) };
const listeners = new Set<() => void>();
const set = (patch: Partial<CommentsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getComments = () => state;
/** Listen to comment changes outside React (variants/comment-count.ts loads this store late). */
export const subscribeComments = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export function useComments<T>(sel: (s: CommentsState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
  );
}

/** A friendly default colour per name; people can pick another. */
export const COLORS = ["#3B82F6", "#E14B8A", "#22A06B", "#F59E0B", "#8B5CF6", "#EF4444", "#14B8A6", "#F97316"];
const colorFor = (name: string) => COLORS[[...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length]!;
export const getAuthor = (): CommentAuthor | null => {
  const a = readJson<CommentAuthor | null>(AUTHOR_KEY, null);
  return a && typeof a.name === "string" && a.name.trim() ? a : null;
};
export const setAuthor = (name: string, color?: string) => {
  const a = { name: name.trim().slice(0, 40), color: color ?? colorFor(name.trim()) };
  writeJson(AUTHOR_KEY, a);
  listeners.forEach((l) => l());
  return a;
};

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;

let started = false;
/** Load once, then follow the live connection. */
export function startComments() {
  if (started) return;
  started = true;
  onServerMessage((msg) => {
    if (msg.type === "comments") set({ threads: msg.threads, loaded: true });
  });
  void refresh();
}
export async function refresh() {
  try {
    const res = await fetch("/api/editor/comments", { credentials: "same-origin" });
    const data = (await res.json()) as { ok?: boolean; threads?: CommentThread[]; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? `Couldn't load comments (${res.status}).`);
    set({ threads: data.threads ?? [], loaded: true, error: null });
  } catch (e) {
    set({ loaded: true, error: e instanceof Error ? e.message : String(e) });
  }
}

/** Send one change; the server's answer (and the live message to everyone else) replaces the list. */
export async function send(op: CommentOp): Promise<boolean> {
  try {
    const res = await fetch("/api/editor/comments", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; threads?: CommentThread[]; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? `That didn't save (${res.status}).`);
    set({ threads: data.threads ?? state.threads, error: null });
    // what you just did yourself isn't news to you
    if (op.op !== "delete") markSeen(op.id);
    return true;
  } catch (e) {
    set({ error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

export const openThread = (id: string | null) => {
  set({ open: id, draft: null });
  if (id) markSeen(id);
};
export const startDraft = (draft: Draft | null) => set({ draft, open: null });
export const setShowResolved = (showResolved: boolean) => set({ showResolved });
export const clearError = () => set({ error: null });

export function markSeen(id: string) {
  const t = state.threads.find((x) => x.id === id);
  if (!t) return;
  const seen = { ...state.seen, [id]: lastActivity(t) };
  writeJson(SEEN_KEY, seen);
  set({ seen });
}
/** New to you: something happened since you last opened it, and it wasn't only you. */
export const isUnread = (t: CommentThread, seen = state.seen, me = getAuthor()?.name) => {
  const last = lastActivity(t);
  if ((seen[t.id] ?? 0) >= last) return false;
  const lastMsg = t.messages.at(-1);
  return !(lastMsg && lastMsg.at === last && me && lastMsg.by.name === me);
};
