import { useSyncExternalStore } from "react";
import type { Site } from "../../schema";
import { api, ApiError } from "../api";
import { flush, getState, setUnpublished } from "../store";

/**
 * The publish flow, in the stages it really has:
 *   1. "github"     save the draft, then commit content/ to GitHub (POST /publish)
 *   2. "rebuilding" the deploy Action rebuilds the site (polled from GitHub)
 *   3. "live"       the rebuild finished; the button shows "Live" for ~3s
 * A failure stops at its step, opens the details sheet and offers Retry.
 */
export type Phase = "idle" | "github" | "rebuilding" | "live" | "error";
export type Step = "github" | "rebuild" | "live";
export type PublishState = {
  phase: Phase;
  /** The step that failed, and why (plain words). */
  failed: Step | null;
  error: string | null;
  /** A note under the steps ("Nothing new to publish", "GitHub didn't report the rebuild"). */
  note: string | null;
  sheet: boolean;
  /** What is live, to count and list the unpublished changes. */
  published: Site | null;
};

let state: PublishState = { phase: "idle", failed: null, error: null, note: null, sheet: false, published: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<PublishState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getPublish = () => state;
export function usePublish<T>(sel: (s: PublishState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
  );
}
export const openSheet = () => set({ sheet: true });
export const closeSheet = () => set({ sheet: false });

/** Load what is live (once, and again after each publish). */
export async function loadPublished() {
  try {
    const res = await fetch("/api/editor/published", { credentials: "same-origin" });
    if (res.ok) set({ published: ((await res.json()) as { site: Site }).site });
  } catch {
    /* the count just won't show */
  }
}

const POLL_MS = 4000;
const UNKNOWN_LIMIT = 6;
const POLL_LIMIT = 75;
const LIVE_MS = 3000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function watchRebuild(sha: string) {
  let unknown = 0;
  for (let i = 0; i < POLL_LIMIT; i++) {
    await wait(POLL_MS);
    let s = "unknown";
    try {
      const res = await fetch(`/api/editor/publish/status?sha=${sha}`, { credentials: "same-origin" });
      if (res.ok) s = ((await res.json()) as { state: string }).state;
    } catch {
      /* treat as unknown */
    }
    if (s === "success") return finishLive(null);
    if (s === "failure") return set({ phase: "error", failed: "rebuild", error: "The site rebuild failed on GitHub. The content was saved; open the repository's Actions tab to see why, then retry.", sheet: true });
    if (s === "unknown" && ++unknown >= UNKNOWN_LIMIT) return finishLive("GitHub didn't report the rebuild. It usually takes about a minute.");
  }
  set({ phase: "idle", note: "Still rebuilding after five minutes. Check the repository's Actions tab." });
}

function finishLive(note: string | null) {
  set({ phase: "live", note });
  setTimeout(() => getPublish().phase === "live" && set({ phase: "idle" }), LIVE_MS);
}

export async function publish() {
  if (state.phase === "github" || state.phase === "rebuilding") return;
  set({ phase: "github", failed: null, error: null, note: null });
  try {
    if (!(await flush())) throw new Error(`The draft couldn't be saved${getState().saveError ? `: ${getState().saveError}` : ""}.`);
    const site = getState().site;
    const result = await api.publish();
    setUnpublished(false);
    set({ published: site });
    if (!result.commit) {
      set({ phase: "idle", note: "Nothing new to publish." });
      return;
    }
    set({ phase: "rebuilding" });
    void watchRebuild(result.commit);
  } catch (e) {
    set({ phase: "error", failed: "github", error: e instanceof ApiError || e instanceof Error ? e.message : "Publishing failed.", sheet: true });
  }
}
