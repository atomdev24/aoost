import { useSyncExternalStore } from "react";

/**
 * First-time tips: a quiet bar at the bottom (TipBar.tsx) the first time someone does something,
 * saying what they can do next. Each tip shows once per browser; "Show tips again" resets them.
 */
export const TIPS = {
  select: "What you picked has its settings in the side panel. Double-click text to type in it.",
  image: "Drag the corner to resize. Double-click the picture to move or zoom it inside its frame.",
  imageEmpty: "Double-click the empty picture to choose one, or drop a file on it.",
  video: "Double-click the video to paste a YouTube link, or to move its cover inside the frame.",
  adjust: "Drag to move the picture, scroll or pinch to zoom. Esc when you're done.",
  free: "Free: drag the corner to change the shape. Click Free again to keep proportions.",
  section: "Drag the section's bottom edge to change its height.",
  ref: "References stay on the board and never go live. Drag one onto the page to use it.",
} as const;
export type TipId = keyof typeof TIPS;

const KEY = "ed-tips-seen";
const seen = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};

let current: TipId | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show a tip if this browser hasn't seen it yet. */
export function showTip(id: TipId) {
  const s = seen();
  if (s.has(id) || current === id) return;
  s.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* shown, just not remembered */
  }
  current = id;
  emit();
}
export function hideTip() {
  if (current === null) return;
  current = null;
  emit();
}
/** "Show tips again" in the command search. */
export function resetTips() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
}
export const useTip = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
