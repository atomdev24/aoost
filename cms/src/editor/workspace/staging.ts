import { useSyncExternalStore } from "react";
import { electVariant, ownerPage } from "../../model/variants";
import { api, ApiError, type StagingInfo } from "../api";
import { noteProblem } from "../problems";
import { onServerMessage } from "../socket";
import { currentPage, flush, getState, setPage, update } from "../store";
import { openSheet } from "./publish";

/**
 * Staging: a frozen copy of the draft with a share link anyone can open (like
 * Framer's staging), then Push to production. Electing a variant puts its
 * content on its page and sends the draft to staging in one step.
 */
type StagingState = { info: StagingInfo | null; busy: boolean; error: string | null; copied: boolean };
let state: StagingState = { info: null, busy: false, error: null, copied: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<StagingState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getStaging = () => state;
export function useStaging<T>(sel: (s: StagingState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
  );
}

let watching = false;
export async function loadStaging() {
  if (!watching) {
    watching = true;
    onServerMessage((msg) => {
      if (msg.type !== "staging") return;
      set({ info: msg.meta ? { at: msg.meta.at, label: msg.meta.label, by: msg.meta.by, url: `${location.origin}/staging/${msg.meta.token}/` } : null });
    });
  }
  try {
    set({ info: await api.staging() });
  } catch {
    /* staging just won't show */
  }
}

const message = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error ? e.message : fallback);

/** Freeze the draft as it is now into staging. */
export async function sendToStaging(label?: string): Promise<boolean> {
  if (state.busy) return false;
  set({ busy: true, error: null });
  try {
    if (!(await flush())) throw new Error(`The draft couldn't be saved${getState().saveError ? `: ${getState().saveError}` : ""}.`);
    const page = currentPage(getState());
    const info = await api.sendToStaging(label ?? `Draft, from ${page.title}`);
    set({ info, busy: false });
    return true;
  } catch (e) {
    set({ busy: false, error: message(e, "Sending to staging failed.") });
    noteProblem("publish", `Send to staging failed: ${message(e, "unknown")}`);
    return false;
  }
}

/** Elect the variant on screen: its content replaces its page in the draft, then the draft goes to staging. */
export async function electCurrentVariant() {
  const s = getState();
  const v = currentPage(s);
  if (!v.variantOf) return;
  const page = ownerPage(s.site, v);
  const label = `${page.title}: ${v.variantName ?? "variant"}`;
  const next = electVariant(s.site, v.id);
  if (!next) return;
  update(() => next, `Elect ${v.variantName ?? "variant"}`);
  setPage(page.id);
  if (await sendToStaging(label)) openSheet();
}

export async function emptyStaging() {
  set({ busy: true, error: null });
  try {
    await api.clearStaging();
    set({ info: null, busy: false });
  } catch (e) {
    set({ busy: false, error: message(e, "Couldn't empty staging.") });
  }
}

export async function copyStagingLink() {
  if (!state.info) return;
  try {
    await navigator.clipboard.writeText(state.info.url);
    set({ copied: true });
    setTimeout(() => set({ copied: false }), 1600);
  } catch {
    window.prompt("Copy the staging link:", state.info.url);
  }
}
