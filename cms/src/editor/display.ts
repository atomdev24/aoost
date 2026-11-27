import { useSyncExternalStore } from "react";

/*
 * Display settings for this browser. "Glass" is the blurred see-through look of
 * the floating toolbars. Chrome (and the browsers built on it) draws that blur
 * unreliably while the board zooms: panels flicker or show a stale, smeared
 * strip, even at a steady 60 fps with the panels never leaving the page (seen
 * in a real report, Chrome 157 on an M1 at 90% page zoom). So Chrome-based
 * browsers start with plain solid panels and Safari keeps the glass; the "…"
 * menu switches it either way, kept per browser.
 */
const KEY = "aoost.glass";
const listeners = new Set<() => void>();
/** Run fn whenever a display setting (glass, theme) changes. Returns a way to stop. */
export function onDisplayChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Chrome, Edge, Brave, Arc, Opera…: Blink engine. Safari and Firefox are not. */
export function isChromium(): boolean {
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  if (brands?.length) return brands.some((b) => /Chromium/i.test(b.brand));
  return /Chrome\/|CriOS\/|Edg\//.test(navigator.userAgent);
}

function read(): boolean {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (saved === "on") return true;
  if (saved === "off") return false;
  return !isChromium();
}

let glass = read();
export const glassOn = () => glass;

function apply() {
  document.documentElement.classList.toggle("ed-no-glass", !glass);
}

export function setGlass(on: boolean) {
  glass = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: still applies for this visit */
  }
  apply();
  listeners.forEach((l) => l());
}

export const useGlass = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => glass,
  );

/*
 * Colour theme for this browser: Graphite (default), Ink or Paper at night.
 * Set in the "…" menu and kept per browser, like the glass setting.
 */
export type EditorTheme = "graphite" | "ink" | "paper";
export const THEMES: { id: EditorTheme; name: string; hint: string }[] = [
  { id: "graphite", name: "Graphite", hint: "Neutral grey, blue highlights" },
  { id: "ink", name: "Ink", hint: "Near-black and cool" },
  { id: "paper", name: "Paper at night", hint: "Warm and monochrome" },
];
const THEME_KEY = "aoost.theme";
/** A saved value back to a theme; anything unknown is Graphite. */
export const themeFrom = (v: unknown): EditorTheme => (v === "ink" || v === "paper" ? v : "graphite");

let theme: EditorTheme = (() => {
  try {
    return themeFrom(localStorage.getItem(THEME_KEY));
  } catch {
    return "graphite";
  }
})();
export const currentTheme = () => theme;

/** The selection colour inside page frames (they are separate documents, so they get it as a rule). */
const SELECT: Record<EditorTheme, string> = { graphite: "#0a84ff", ink: "#6e8bff", paper: "#ff9a52" };
export const frameThemeCss = (t: EditorTheme) => `:root{--ed-sel:${SELECT[t]}}`;

/** Mark a document with the theme. Page frames are documents of their own and get it too. */
export function markTheme(doc: Document, t: EditorTheme = theme) {
  const root = doc.documentElement;
  if (t === "graphite") root.removeAttribute("data-ed-theme");
  else root.setAttribute("data-ed-theme", t);
}
const applyTheme = () => markTheme(document);

export function setTheme(next: EditorTheme) {
  theme = themeFrom(next);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked: still applies for this visit */
  }
  applyTheme();
  listeners.forEach((l) => l());
}

export const useTheme = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => theme,
  );

/** Apply the saved settings before the editor draws. */
export function startDisplay() {
  apply();
  applyTheme();
}
