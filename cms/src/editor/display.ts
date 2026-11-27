import { useSyncExternalStore } from "react";

/*
 * Display settings for this browser. The floating toolbars (top bar islands, rail, zoom bar,
 * variant band, phone tabs) come in three looks, chosen in the "…" menu and kept per browser:
 * - Liquid glass (default): frosted, and the page behind bends at the rounded edges. Only
 *   Chromium can draw the bend (an SVG filter in backdrop-filter); Safari and Firefox show it as
 *   frosted. While the board zooms or pans it drops to plain frosted (see ui/liquid.css).
 * - Frosted glass: the blurred see-through look (the "acrylic" style).
 * - Solid: plain panels, for anyone who finds glass busy or sees it flicker.
 * The old on/off setting ("aoost.glass") is read once: on → liquid, off → solid.
 */
export type GlassStyle = "liquid" | "frosted" | "solid";
export const GLASS_STYLES: { id: GlassStyle; name: string; hint: string }[] = [
  { id: "liquid", name: "Liquid glass", hint: "Frosted, and the page bends at the edges (Chrome, Edge, Arc; frosted elsewhere)" },
  { id: "frosted", name: "Frosted glass", hint: "Blurred and see-through, like acrylic" },
  { id: "solid", name: "Solid", hint: "Plain panels, nothing behind shows through" },
];
const KEY = "aoost.glassStyle";
const OLD_KEY = "aoost.glass";
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

/** A saved value (new or old setting) back to a style; anything unknown is liquid. */
export function glassStyleFrom(saved: string | null, old: string | null): GlassStyle {
  if (saved === "liquid" || saved === "frosted" || saved === "solid") return saved;
  if (old === "off") return "solid";
  return "liquid";
}

function read(): GlassStyle {
  try {
    return glassStyleFrom(localStorage.getItem(KEY), localStorage.getItem(OLD_KEY));
  } catch {
    return "liquid";
  }
}

let style = read();
export const glassStyle = () => style;
/** Any glass at all (liquid or frosted). */
export const glassOn = () => style !== "solid";

function apply() {
  document.documentElement.classList.toggle("ed-no-glass", style === "solid");
  document.documentElement.setAttribute("data-ed-glass", style);
}

export function setGlassStyle(next: GlassStyle) {
  style = glassStyleFrom(next, null);
  try {
    localStorage.setItem(KEY, style);
  } catch {
    /* storage blocked: still applies for this visit */
  }
  apply();
  listeners.forEach((l) => l());
}

export const useGlassStyle = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => style,
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
