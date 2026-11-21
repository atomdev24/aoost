import { useSyncExternalStore } from "react";
import type { Breakpoint } from "../../schema";
import { currentPage, getState, subscribe as subscribeEditor } from "../store";
import { getBoard, subscribeBoard } from "./store";

/*
 * Still pictures of the board's frames.
 *
 * Four live web pages, scaled and redrawn on every zoom step, are where the board's flicker came
 * from: Chrome dropping pieces of them (graphics memory), the page lagging its frame by a step,
 * thin lines in the design shimmering at uneven scales. A still picture scales cleanly. So each
 * frame keeps a picture of itself, taken from its own live page (pieces placed, current edits,
 * real fonts), and the board shows it in place of the live page while it moves, and for every
 * frame except the one being edited (see FrameStill).
 *
 * Pictures are retaken after edits, once things have been quiet for a moment and never while the
 * board moves: one capture blocks the page for about a tenth of a second.
 */

export type Still = { url: string; pageId: string; w: number; h: number; at: number };

const BPS: Breakpoint[] = ["widescreen", "desktop", "tablet", "mobile"];
const QUIET_MS = 1200;
const MAX_HEIGHT = 9000;

// ------------------------------------------------------------------ the pictures (a tiny store)

const stills = new Map<Breakpoint, Still>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getStill = (bp: Breakpoint) => stills.get(bp) ?? null;
export function useStill(bp: Breakpoint): Still | null {
  return useSyncExternalStore(
    subscribe,
    () => (void version, stills.get(bp) ?? null),
  );
}
function setStill(bp: Breakpoint, still: Still) {
  const old = stills.get(bp);
  stills.set(bp, still);
  emit();
  // Let the old picture go once the new one has had time to draw.
  if (old) setTimeout(() => URL.revokeObjectURL(old.url), 2000);
}
function clearStills() {
  for (const s of stills.values()) URL.revokeObjectURL(s.url);
  stills.clear();
  emit();
}

// ------------------------------------------------------------------ capturing one frame

const dataCache = new Map<string, Promise<string | null>>();
function toData(url: string): Promise<string | null> {
  let p = dataCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url, url.startsWith(location.origin) ? { credentials: "same-origin" } : {});
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => resolve(null);
          r.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    })();
    dataCache.set(url, p);
  }
  return p;
}

const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const external = (u: string) => !u.startsWith("data:") && !u.startsWith("#");

/** CSS with every url(…) (images, fonts) swapped for its data, so the picture needs no network. */
async function inlineUrls(css: string, base: string): Promise<string> {
  const urls = [...new Set([...css.matchAll(URL_RE)].map((m) => m[2]!).filter(external).map((u) => new URL(u, base).href))];
  if (!urls.length) return css;
  const datas = await Promise.all(urls.map(toData));
  const map = new Map(urls.map((u, i) => [u, datas[i]]));
  return css.replace(URL_RE, (all, _q: string, u: string) => (external(u) ? (map.get(new URL(u, base).href) ? `url("${map.get(new URL(u, base).href)}")` : "none") : all));
}

const sheetCache = new Map<string, Promise<string>>();
const sheet = (href: string) => {
  let p = sheetCache.get(href);
  if (!p) {
    p = fetch(href)
      .then((r) => (r.ok ? r.text() : ""))
      .then((css) => inlineUrls(css, href))
      .catch(() => "");
    sheetCache.set(href, p);
  }
  return p;
};

/**
 * A picture of a frame's page as it is now, at design size (one picture pixel per page pixel).
 * The page is copied (no scripts, media as plain boxes), its images, fonts and style sheets are
 * embedded, and the copy is drawn through an SVG image onto a canvas.
 */
export async function captureFrame(doc: Document): Promise<{ blob: Blob; w: number; h: number } | null> {
  const w = doc.documentElement.clientWidth;
  const h = Math.min(MAX_HEIGHT, doc.documentElement.scrollHeight);
  if (w < 50 || h < 50 || !doc.body?.childElementCount) return null;
  await doc.fonts?.ready;
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script, noscript").forEach((e) => e.remove());
  // Canvases keep what they show; embeds and media become plain boxes (an SVG picture can't load them).
  const canvases = [...doc.querySelectorAll("canvas")];
  [...clone.querySelectorAll("canvas")].forEach((c, i) => {
    try {
      const img = doc.createElement("img");
      img.src = canvases[i]!.toDataURL();
      img.className = c.className;
      img.setAttribute("style", c.getAttribute("style") ?? "");
      c.replaceWith(img);
    } catch {
      /* a canvas we can't read stays empty */
    }
  });
  clone.querySelectorAll("iframe, model-viewer, audio, video").forEach((el) => {
    const box = doc.createElement("div");
    box.className = el.className;
    box.setAttribute("style", "width:100%;height:100%;min-height:60px;background:#1C1C1F;border-radius:inherit");
    el.replaceWith(box);
  });
  const base = doc.baseURI;
  const links = [...clone.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
  const texts = await Promise.all(links.map((l) => sheet(new URL(l.getAttribute("href") ?? "", base).href)));
  links.forEach((l, i) => {
    const s = doc.createElement("style");
    s.textContent = texts[i]!;
    l.replaceWith(s);
  });
  clone.querySelectorAll("link").forEach((l) => l.remove());
  await Promise.all([...clone.querySelectorAll("style")].map(async (s) => void (s.textContent = await inlineUrls(s.textContent ?? "", base))));
  await Promise.all([...clone.querySelectorAll('[style*="url("]')].map(async (e) => e.setAttribute("style", await inlineUrls(e.getAttribute("style") ?? "", base))));
  const imgs = [...doc.querySelectorAll("img")];
  await Promise.all(
    [...clone.querySelectorAll("img")].map(async (img, i) => {
      const src = imgs[i]?.currentSrc || img.getAttribute("src");
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.removeAttribute("loading");
      if (!src || src.startsWith("data:")) return;
      const data = await toData(new URL(src, base).href);
      if (data) img.setAttribute("src", data);
      else img.removeAttribute("src");
    }),
  );
  const fit = doc.createElement("style");
  fit.textContent = `html{width:${w}px!important;height:${h}px!important;overflow:hidden!important}`;
  clone.querySelector("head")?.append(fit);
  const xhtml = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const image = new Image();
  // A data URL (not a blob): Chrome won't let a canvas export a foreignObject picture loaded any other way.
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = getComputedStyle(doc.body).backgroundColor || "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  return blob ? { blob, w, h } : null;
}

// ------------------------------------------------------------------ when to take them

const frameDoc = (bp: Breakpoint): Document | null => {
  const f = document.querySelector<HTMLIFrameElement>(`.bd-frame[data-bp="${bp}"] iframe`);
  try {
    return f?.contentDocument ?? null;
  } catch {
    return null;
  }
};

const dirty = new Set<Breakpoint>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let started = false;

/** Ask for fresh pictures (all frames, or one), after things have been quiet for a moment. */
export function refreshStills(bp?: Breakpoint) {
  (bp ? [bp] : BPS).forEach((b) => dirty.add(b));
  clearTimeout(timer);
  timer = setTimeout(() => void run(), QUIET_MS);
}

const idle = () =>
  new Promise<void>((resolve) => {
    const w = window as Window & { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 1500 });
    else setTimeout(resolve, 50);
  });

async function run() {
  if (running) return;
  running = true;
  try {
    while (dirty.size) {
      const b = getBoard();
      // Never while the board moves: wait for it to settle.
      if (b.moving || b.interacting) {
        clearTimeout(timer);
        timer = setTimeout(() => void run(), 400);
        return;
      }
      const bp = BPS.find((x) => dirty.has(x))!;
      dirty.delete(bp);
      if (b.hidden[bp] || !b.ready[bp]) continue;
      const doc = frameDoc(bp);
      if (!doc) continue;
      await idle();
      const pageId = getState().pageId;
      const shot = await captureFrame(doc).catch(() => null);
      // The page changed while we drew it: that picture is already out of date.
      if (!shot || getState().pageId !== pageId) continue;
      setStill(bp, { url: URL.createObjectURL(shot.blob), pageId, w: shot.w, h: shot.h, at: Date.now() });
    }
  } finally {
    running = false;
  }
}

/** Keep the pictures fresh: after edits, when frames finish drawing or change height, on page change. */
export function startStills(): () => void {
  if (started) return () => undefined;
  started = true;
  let page = currentPage(getState());
  let site = getState().site;
  let pageId = getState().pageId;
  const offEditor = subscribeEditor(() => {
    const s = getState();
    if (s.pageId !== pageId) {
      pageId = s.pageId;
      clearStills();
      refreshStills();
    }
    const p = currentPage(s);
    if (p !== page || s.site !== site) {
      page = p;
      site = s.site;
      refreshStills();
    }
  });
  let ready = getBoard().ready;
  let heights = getBoard().heights;
  let hidden = getBoard().hidden;
  const offBoard = subscribeBoard(() => {
    const b = getBoard();
    if (b.ready !== ready || b.heights !== heights || b.hidden !== hidden) {
      for (const bp of BPS) if (b.ready[bp] !== ready[bp] || b.heights[bp] !== heights[bp] || b.hidden[bp] !== hidden[bp]) refreshStills(bp);
      ready = b.ready;
      heights = b.heights;
      hidden = b.hidden;
    }
  });
  refreshStills();
  return () => {
    offEditor();
    offBoard();
    started = false;
  };
}
