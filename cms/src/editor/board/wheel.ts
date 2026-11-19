import { getBoard, markMoving, panBy, zoomTo } from "./store";

/**
 * Trackpad and mouse wheel on the board: scroll pans, pinch (or ⌘/Ctrl +
 * scroll) zooms around the pointer. Frames forward their wheel events here
 * with the pointer already converted to board coordinates.
 */
export function onBoardWheel(e: WheelEvent, at: { x: number; y: number }) {
  e.preventDefault();
  markMoving();
  const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
  if (e.ctrlKey || e.metaKey) {
    const dy = Math.max(-50, Math.min(50, e.deltaY * scale));
    zoomTo(getBoard().view.zoom * Math.exp(-dy * 0.01), at.x, at.y);
    return;
  }
  const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
  panBy(-dx * scale, -dy * scale);
}
