/*
 * A trackpad pinch must zoom the board, never the browser page. Chrome turns a
 * pinch into ctrl + wheel events and zooms the whole page itself unless the page
 * cancels them; Safari sends its own gesture events. The board cancels pinches
 * that land on it, but not ones over the toolbars, rail, panels, zoom bar,
 * dialogs, or a page frame that is still loading. Those zoomed the whole page,
 * pushing the toolbars out of sight. This guard cancels every pinch in a window
 * (it does not stop it, so the board still zooms), and is installed on the
 * editor and on each page frame.
 */
export function guardPinch(win: Window | null | undefined): () => void {
  if (!win) return () => undefined;
  const wheel = (e: WheelEvent) => {
    if (e.ctrlKey && e.cancelable) e.preventDefault();
  };
  const gesture = (e: Event) => e.preventDefault();
  win.addEventListener("wheel", wheel, { passive: false, capture: true });
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) win.addEventListener(t, gesture, { passive: false, capture: true });
  return () => {
    win.removeEventListener("wheel", wheel, { capture: true });
    for (const t of ["gesturestart", "gesturechange", "gestureend"]) win.removeEventListener(t, gesture, { capture: true });
  };
}

/** The browser's own pinch zoom (1 = none). */
export const browserZoom = () => window.visualViewport?.scale ?? 1;
