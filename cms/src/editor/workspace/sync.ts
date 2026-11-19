import { useSyncExternalStore } from "react";
import type { SyncInfo } from "../../model/protocol";
import { api, ApiError } from "../api";
import { onServerMessage } from "../socket";
import { loadPublished } from "./publish";

/**
 * How the draft stands against the live site (SPEC §2): when a newer deploy
 * is merged into the draft the editor says so with a toast; values both
 * sides changed are listed in the publish sheet; and a merge that would make
 * the site invalid shows a banner with the two ways out.
 */
export type SyncState = { info: SyncInfo; toast: string | null; error: string | null; busy: boolean };

const SEEN_KEY = "aoost.syncSeen";
const TOAST_MS = 5000;
const empty: SyncInfo = { at: null, conflicts: [], blocked: null };

let state: SyncState = { info: empty, toast: null, error: null, busy: false };
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const set = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getSync = () => state;
export function useSync<T>(sel: (s: SyncState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
  );
}

function toast(text: string) {
  clearTimeout(toastTimer);
  set({ toast: text });
  toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS);
}
export const dismissToast = () => set({ toast: null });

/** Show the toast once per sync, even when the sync happened while no editor was open. */
function noteSynced(at: number | null) {
  if (!at) return;
  const seen = Number(localStorage.getItem(SEEN_KEY) ?? 0);
  if (at <= seen) return;
  localStorage.setItem(SEEN_KEY, String(at));
  toast("Updated your draft with changes from the live site");
}

export async function refreshSync() {
  try {
    const { sync } = await api.state();
    set({ info: sync ?? empty });
    noteSynced(sync?.at ?? null);
  } catch {
    /* keep what we have */
  }
}

/** Start from what the first load reported, then follow the draft store's messages. */
export function startSyncNotices(info: SyncInfo | undefined) {
  set({ info: info ?? empty });
  noteSynced(info?.at ?? null);
  onServerMessage((msg) => {
    if (msg.type === "synced") {
      void loadPublished();
      void refreshSync();
    } else if (msg.type === "sync-blocked") set({ info: { ...state.info, blocked: msg.reason } });
  });
}

async function run(fn: () => Promise<unknown>) {
  set({ busy: true, error: null });
  try {
    await fn();
    await refreshSync();
  } catch (e) {
    set({ error: e instanceof ApiError || e instanceof Error ? e.message : "That didn't work." });
  } finally {
    set({ busy: false });
  }
}

/** A conflict: take the live site's value, or keep the draft's. */
export const resolveConflict = (id: string, choice: "live" | "mine") => run(() => api.resolveConflict(id, choice));
/** A blocked merge: throw the draft away and start from the live site. */
export const startFromLive = () =>
  run(async () => {
    await api.reset();
    window.location.reload();
  });
/** A blocked merge: keep the draft as it is. */
export const keepDraft = () => run(() => api.keepDraft());
