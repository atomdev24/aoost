import { useRef } from "react";

/** How long a press must last to count as a long-press (ms), and how far it may wander (px). */
export const LONG_PRESS_MS = 500;
const WANDER = 10;

/**
 * Long-press stands in for right-click on touch screens. Returns pointer
 * handlers to spread on the element; `onLong` gets the press position. The
 * click that follows a long-press is swallowed.
 */
export function useLongPress(onLong: (at: { x: number; y: number }) => void, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => {
    clearTimeout(timer.current);
    start.current = null;
  };
  if (!enabled) return {};
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const at = start.current;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fired.current = true;
        start.current = null;
        onLong(at);
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > WANDER) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // The browser's own long-press menu (Android) would otherwise open as well.
    onContextMenu: (e: React.MouseEvent) => {
      if (fired.current || start.current) e.preventDefault();
    },
  };
}

/** Double-tap on touch: two taps within 300ms and 24px. Calls `onDouble` with the second tap's event. */
export function attachDoubleTap(doc: Document, onDouble: (e: PointerEvent) => void): () => void {
  let last: { t: number; x: number; y: number } | null = null;
  let downAt: { x: number; y: number } | null = null;
  const down = (e: PointerEvent) => {
    if (e.pointerType === "touch") downAt = { x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || !downAt) return;
    const tap = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 10;
    downAt = null;
    if (!tap) return void (last = null);
    const now = e.timeStamp;
    if (last && now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 24) {
      last = null;
      onDouble(e);
      return;
    }
    last = { t: now, x: e.clientX, y: e.clientY };
  };
  doc.addEventListener("pointerdown", down, true);
  doc.addEventListener("pointerup", up, true);
  return () => {
    doc.removeEventListener("pointerdown", down, true);
    doc.removeEventListener("pointerup", up, true);
  };
}
