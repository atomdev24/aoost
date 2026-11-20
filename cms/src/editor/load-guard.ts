import { noteProblem } from "./problems";

/*
 * Keeps a half-loaded editor from sitting there without its toolbars.
 * - If a build file fails to load (usually: the tab is running an older build
 *   whose files were replaced by a deploy), note it and reload once.
 * - If the editor's top bar still isn't on screen a while after start-up,
 *   note it and show a small banner with a Reload button.
 */
const RELOAD_KEY = "aoost.loadGuard.reloadedAt";
const WATCH_MS = 15_000;

function reloadOnce(reason: string): boolean {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  } catch {
    /* storage blocked */
  }
  if (Date.now() - last < 60_000) return false;
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
  noteProblem("error", "Reloaded the editor after part of it failed to load", reason);
  // Give the problem log a moment to send before the page goes.
  setTimeout(() => location.reload(), 400);
  return true;
}

function showBanner(message: string) {
  if (document.getElementById("ed-load-banner")) return;
  const bar = document.createElement("div");
  bar.id = "ed-load-banner";
  bar.setAttribute("role", "alert");
  bar.style.cssText =
    "position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:12px;align-items:center;" +
    "padding:10px 14px;border-radius:12px;background:#2a2a2e;color:#f2f2f2;font:13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)";
  const text = document.createElement("span");
  text.textContent = message;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Reload";
  btn.style.cssText = "border:0;border-radius:8px;padding:6px 12px;background:#3d6bff;color:#fff;font:inherit;cursor:pointer";
  btn.onclick = () => location.reload();
  bar.append(text, btn);
  document.body.append(bar);
}

const isChunkError = (msg: string) => /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS|ChunkLoadError/i.test(msg);

export function startLoadGuard() {
  window.addEventListener("vite:preloadError", (e) => {
    const err = (e as Event & { payload?: unknown }).payload;
    const msg = err instanceof Error ? err.message : String(err);
    if (reloadOnce(msg)) e.preventDefault();
    else noteProblem("error", "Part of the editor failed to load", msg);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    if (isChunkError(msg)) reloadOnce(msg);
  });
  setTimeout(() => {
    if (document.querySelector(".ed-island, .qe")) return;
    const splash = document.querySelector(".ed-splash");
    if (splash) {
      // Still fetching the draft, or already showing its own error: nothing is half-drawn.
      if (!/Could not/.test(splash.textContent ?? "")) noteProblem("stall", "The draft took over 15 s to load");
      return;
    }
    const where = document.querySelector(".ed-shell") ? "editor drawn without its toolbars" : "editor never drew";
    noteProblem("error", "Editor toolbars were not on screen 15 s after start-up", where);
    if (!reloadOnce(where)) showBanner("The editor didn't finish loading.");
  }, WATCH_MS);
}
