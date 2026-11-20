import { getBoard } from "./board/store";

/*
 * The editor's flight recorder: a rolling record of the last 15 seconds, so a
 * report sent right after a glitch shows what happened in the moment.
 *
 * It keeps:
 * - slow frames (over 34 ms) and how many frames were drawn each second;
 * - zoom and pan activity (ctrl/pinch wheel and plain wheel, per 100 ms);
 * - every change to the toolbars: removed from the page, put back, hidden,
 *   faded, resized or moved off screen (sampled every animation frame while
 *   the board moves, every 250 ms otherwise);
 * - window changes: resize, page zoom / pixel ratio, tab hidden or shown.
 *
 * If a toolbar changes in the record, the page really changed. If the record
 * shows the toolbars steady while the screen flickered, the browser's drawing
 * dropped them (a graphics problem, not the editor's code).
 */

type Entry = { t: number; what: string };
const KEEP_MS = 15_000;
const entries: Entry[] = [];
let started = false;
let onVanish: ((what: string) => void) | null = null;

/** The toolbars watched, by name. */
const PANELS: Record<string, string> = {
  "top bar left": ".ed-island-left",
  "top bar middle": ".ed-island-center",
  "top bar right": ".ed-island-right",
  "side rail": ".ed-rail",
  flyout: ".ed-flyout",
  inspector: ".ed-inspector",
  "zoom bar": ".bd-zoombar",
};

const now = () => performance.now();
function push(what: string) {
  const t = now();
  entries.push({ t, what });
  while (entries.length && t - entries[0]!.t > KEEP_MS) entries.shift();
}

function describe(el: Element | null): string {
  if (!el) return "gone";
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  if (cs.display === "none") return "display:none";
  if (cs.visibility === "hidden") return "hidden";
  const op = +cs.opacity;
  if (op < 0.05) return "transparent";
  if (r.width < 2 || r.height < 2) return "zero size";
  if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return "off screen";
  return op < 0.95 ? `faded ${op.toFixed(2)}` : "shown";
}

const last: Record<string, string> = {};
const seen = new Set<string>();
function samplePanels() {
  for (const [name, sel] of Object.entries(PANELS)) {
    const el = document.querySelector(sel);
    const state = describe(el);
    if (state !== "gone") seen.add(name);
    // A panel that was never open (flyout, inspector) isn't news until it appears.
    if (!seen.has(name)) continue;
    if (last[name] !== state) {
      if (last[name] !== undefined) push(`${name}: ${last[name]} → ${state}`);
      last[name] = state;
    }
  }
  // All top-bar islands gone while the editor is up is never right.
  if (document.querySelector(".ed-shell") && !document.querySelector(".ed-island") && seen.has("top bar right")) onVanish?.("top bar removed from the page");
}

export function startFlightRecorder(vanished?: (what: string) => void) {
  if (started || typeof window === "undefined") return;
  started = true;
  onVanish = vanished ?? null;
  push(`start · ${innerWidth}×${innerHeight} @${devicePixelRatio} · ${gpu()}`);
  new MutationObserver(() => push(`glass ${document.documentElement.classList.contains("ed-no-glass") ? "off" : "on"}`)).observe(document.documentElement, { attributeFilter: ["class"] });

  // Frames: slow ones individually, plus frames per second.
  let prev = now();
  let count = 0;
  let second = prev;
  let moving = false;
  const frame = (t: number) => {
    const gap = t - prev;
    prev = t;
    count++;
    if (gap > 34 && document.visibilityState === "visible") push(`slow frame ${Math.round(gap)} ms${getBoard().moving ? " (moving)" : ""}`);
    if (t - second >= 1000) {
      if (getBoard().moving || count < 50) push(`${count} frames/s${getBoard().moving ? " while moving" : ""}`);
      count = 0;
      second = t;
    }
    const m = getBoard().moving;
    if (m !== moving) {
      push(m ? `board moving (zoom ${Math.round(getBoard().view.zoom * 100)}%)` : `board still (zoom ${Math.round(getBoard().view.zoom * 100)}%)`);
      moving = m;
    }
    if (m) samplePanels();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setInterval(() => !getBoard().moving && samplePanels(), 250);

  // Wheel activity, summed per 100 ms so the record stays short.
  let zoomTicks = 0;
  let panTicks = 0;
  let flushAt = 0;
  addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.metaKey) zoomTicks++;
      else panTicks++;
      if (!flushAt)
        flushAt = window.setTimeout(() => {
          push(`wheel: ${zoomTicks ? `${zoomTicks} zoom` : ""}${zoomTicks && panTicks ? ", " : ""}${panTicks ? `${panTicks} pan` : ""}`);
          zoomTicks = panTicks = 0;
          flushAt = 0;
        }, 100);
    },
    { capture: true, passive: true },
  );

  // Panels removed or added in one go (React unmounting them).
  new MutationObserver((list) => {
    for (const m of list)
      for (const n of [...m.removedNodes, ...m.addedNodes]) {
        if (!(n instanceof Element)) continue;
        for (const [name, sel] of Object.entries(PANELS))
          if (n.matches(sel) || n.querySelector(sel)) push(`${name} ${m.removedNodes.length && [...m.removedNodes].includes(n) ? "removed from" : "added to"} the page`);
      }
  }).observe(document.body, { childList: true, subtree: true });

  let dpr = devicePixelRatio;
  addEventListener("resize", () => {
    if (devicePixelRatio !== dpr) {
      push(`page zoom / pixel ratio ${dpr} → ${devicePixelRatio}`);
      dpr = devicePixelRatio;
    } else push(`window ${innerWidth}×${innerHeight}`);
  });
  document.addEventListener("visibilitychange", () => push(`tab ${document.visibilityState}`));
}

let gpuName = "";
function gpu(): string {
  if (gpuName) return gpuName;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    gpuName = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "no webgl";
  } catch {
    gpuName = "unknown gpu";
  }
  return gpuName.replace(/^ANGLE \((.*)\)$/, "$1").slice(0, 80);
}

/** The last 15 seconds as text, oldest first. */
export function flightSnapshot(): string {
  const end = now();
  const lines = entries.filter((e) => end - e.t <= KEEP_MS).map((e) => `-${((end - e.t) / 1000).toFixed(2)}s  ${e.what}`);
  const panels = Object.entries(PANELS)
    .map(([name, sel]) => `${name}: ${describe(document.querySelector(sel))}`)
    .join(", ");
  return [`Last 15 s (${gpu()}, pixel ratio ${devicePixelRatio}, glass ${document.documentElement.classList.contains("ed-no-glass") ? "off" : "on"}):`, ...lines.slice(-150), `Now: ${panels}`].join("\n");
}
