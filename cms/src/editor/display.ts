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

/** Apply the saved setting before the editor draws. */
export const startDisplay = apply;
