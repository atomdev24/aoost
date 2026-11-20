import { useSyncExternalStore } from "react";
import type { Problem, ProblemKind, StoredProblem } from "../model/problems";
import { getBoard } from "./board/store";
import { getState } from "./store";

/**
 * The editor's problem log, browser side. It notices what goes wrong while someone edits
 * (errors, failed requests, the live connection dropping, long freezes, failed publishes),
 * adds where the editor was at the time, and sends it to the draft store in small batches.
 * "Report a problem" adds a note in the person's own words with the same context.
 * Read it back in the editor (Problem log), at /api/editor/problems?format=text, or through
 * the Claude connector (get_problem_log).
 */

const queue: Problem[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;
const recentKeys = new Map<string, number>();

/** Where the editor is right now: enough to reproduce, nothing personal. */
export function editorContext(): Record<string, string | number | boolean | null> {
  const s = getState();
  const b = getBoard();
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Other";
  const version = (/(?:Chrome|Version|Firefox|Edg)\/(\d+)/.exec(ua) ?? [])[1] ?? "";
  return {
    page: s.pageId,
    size: s.bp,
    zoom: Math.round(b.view.zoom * 100),
    selected: s.selection.length,
    browser: `${browser} ${version}`.trim(),
    os: /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : "Other",
    window: `${innerWidth}×${innerHeight}@${devicePixelRatio}`,
    build: (document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.src.split("/").pop() ?? "").slice(0, 40),
  };
}

/** Note a problem. Repeats of the same message within a minute are dropped. */
export function noteProblem(kind: ProblemKind, message: string, detail?: string) {
  const key = `${kind}:${message}`;
  const now = Date.now();
  if (kind !== "report" && now - (recentKeys.get(key) ?? 0) < 60_000) return;
  recentKeys.set(key, now);
  let context: Problem["context"];
  try {
    context = editorContext();
  } catch {
    context = undefined;
  }
  queue.push({ t: now, kind, message: message.slice(0, 500), detail: detail?.slice(0, 4000), context });
  clearTimeout(timer);
  timer = setTimeout(flush, kind === "report" ? 0 : 4000);
}

async function flush(useBeacon = false) {
  clearTimeout(timer);
  if (!queue.length) return;
  const items = queue.splice(0, 50);
  const body = JSON.stringify({ items });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/editor/problems", new Blob([body], { type: "application/json" }));
    } else {
      // Plain fetch, not api.call: a failure to send the log must never log itself.
      const res = await fetch("/api/editor/problems", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body });
      if (!res.ok) throw new Error(String(res.status));
    }
  } catch {
    // Keep them for a later try (bounded), and back off.
    queue.unshift(...items);
    queue.splice(200);
    timer = setTimeout(flush, 30_000);
    return;
  }
  if (queue.length) timer = setTimeout(flush, 1000);
}

const isNoise = (msg: string) => /ResizeObserver loop|Script error\.?$|chrome-extension:|moz-extension:|safari-extension:/i.test(msg);

/** Errors in a window (the editor's, or a frame's). Returns a function that stops watching. */
export function watchWindow(win: Window, where = "editor") {
  const onError = (e: ErrorEvent) => {
    const msg = e.message || String(e.error ?? "Unknown error");
    if (isNoise(msg) || isNoise(e.filename ?? "")) return;
    noteProblem("error", `${where}: ${msg}`, [e.filename && `${e.filename}:${e.lineno}:${e.colno}`, e.error?.stack].filter(Boolean).join("\n"));
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const r = e.reason as { message?: string; stack?: string } | undefined;
    const msg = r?.message ?? String(e.reason);
    if (isNoise(msg) || /Signed out/.test(msg)) return;
    noteProblem("error", `${where}: ${msg}`, r?.stack);
  };
  win.addEventListener("error", onError);
  win.addEventListener("unhandledrejection", onRejection);
  return () => {
    win.removeEventListener("error", onError);
    win.removeEventListener("unhandledrejection", onRejection);
  };
}

/** Start collecting (once). */
export function startProblemLog() {
  if (started || typeof window === "undefined") return;
  started = true;
  watchWindow(window);
  // Long freezes: one frame that took over 400 ms (at most one note every 30 s). The first
  // seconds are skipped: drawing the page when the editor opens always takes one long frame.
  let lastStall = 0;
  const since = performance.now();
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration < 400 || e.startTime - since < 6000 || Date.now() - lastStall < 30_000) continue;
        lastStall = Date.now();
        const b = getBoard();
        noteProblem("stall", `The editor froze for ${Math.round(e.duration)} ms`, `while ${b.moving ? "panning or zooming" : b.interacting ? "dragging" : "idle or editing"}`);
      }
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch {
    // Not every browser reports long frames (Safari, Firefox): nothing to do.
  }
  addEventListener("pagehide", () => void flush(true));
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && void flush(true));
}

// ------------------------------------------------------------- the dialog

type DialogState = { open: "report" | "log" | null };
let dialog: DialogState = { open: null };
const listeners = new Set<() => void>();
const setDialog = (open: DialogState["open"]) => {
  dialog = { open };
  listeners.forEach((l) => l());
};
export const openReport = () => setDialog("report");
export const openProblemLog = () => setDialog("log");
export const closeProblems = () => setDialog(null);
export function useProblemsDialog() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => dialog.open,
  );
}

/** Send a report now (the person's own words). */
export async function sendReport(text: string) {
  noteProblem("report", text.trim().slice(0, 500) || "(no description)", text.length > 500 ? text.slice(500) : undefined);
  await flush();
}

export async function loadProblems(): Promise<StoredProblem[]> {
  await flush();
  const res = await fetch("/api/editor/problems?limit=200", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Couldn't load the problem log (${res.status}).`);
  return ((await res.json()) as { items: StoredProblem[] }).items;
}

export async function loadProblemsText(): Promise<string> {
  const res = await fetch("/api/editor/problems?limit=200&format=text", { credentials: "same-origin" });
  return res.ok ? res.text() : "";
}

export async function clearProblems() {
  await fetch("/api/editor/problems", { method: "DELETE", credentials: "same-origin" });
}
