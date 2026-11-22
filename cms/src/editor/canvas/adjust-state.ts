import { useSyncExternalStore } from "react";
import { beginGesture, endGesture } from "../store";
import type { SlotPath } from "./slots";

/** Which picture is being adjusted (the overlay itself, AdjustImage.tsx, loads after the board). */
// ------------------------------------------------------------ which image is being adjusted

/** A block's own picture (Image, Video), or one picture inside its content (`path`, the aoost blocks). */
export type AdjustTarget = { id: string; path?: SlotPath };

let adjusting: AdjustTarget | null = null;
const listeners = new Set<() => void>();
/** Enter adjust mode. The whole session, however many drags and scrolls, is one undo step. */
export const startAdjust = (id: string, path?: SlotPath) => {
  if (adjusting) endGesture();
  adjusting = { id, path };
  beginGesture();
  listeners.forEach((l) => l());
};
export const stopAdjust = () => {
  if (adjusting === null) return;
  adjusting = null;
  endGesture();
  listeners.forEach((l) => l());
};
export const isAdjusting = () => adjusting !== null;
export const useAdjusting = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => adjusting,
  );

/** Can this block be adjusted on the canvas? (A framed picture with a loaded image.) */
export function adjustable(el: Element | null): el is HTMLElement {
  return !!el?.querySelector(".frame > .media, .frame > a > .media") && el.querySelector<HTMLImageElement>("img.media") !== null;
}

