import { isAdjusting } from "../canvas/AdjustImage";
import { openQuickInsert } from "../insert/QuickInsert";
import { flush, getState, redo, undo } from "../store";
import { closeUnpinnedFlyout, getRailState } from "../workspace/rail-store";
import { activateBreakpoint, selectBlock } from "./bridge";
import { fit, getBoard, setSpaceDown, toggleDotGrid, zoomStep, zoomTo } from "./store";
import { runTool, type Tool } from "./tools";

/**
 * Keyboard for the whole workspace, attached to the editor's document and to
 * every frame's document (keys pressed while a frame has focus land there):
 *   V select · F frame · T text · Space-drag pan · ⌘+ ⌘− ⌘0 zoom · ⇧1 fit all
 *   ⌘Z / ⇧⌘Z undo / redo · ⌘S save the draft now
 */
let onTool: ((tool: Tool) => void) | null = null;
export const setToolListener = (fn: ((tool: Tool) => void) | null) => {
  onTool = fn;
};

const typing = (doc: Document) => {
  const el = doc.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export function applyTool(tool: Tool) {
  onTool?.(tool);
  if (tool === "select" || tool === "claude") return;
  const id = runTool(tool);
  if (id) selectBlock(id);
}

export function attachKeys(doc: Document): () => void {
  const down = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === "s") {
      e.preventDefault();
      void flush();
      return;
    }
    if (typing(doc)) return;
    if (key === "escape") {
      const rail = getRailState();
      if (!rail.pinned && rail.active) {
        e.preventDefault();
        e.stopPropagation();
        closeUnpinnedFlyout();
        return;
      }
      if (getState().selection.length > 0 || getState().overlayId || getState().globalId) {
        e.preventDefault();
        activateBreakpoint(getState().bp, null);
        return;
      }
    }
    if (mod && key === "z") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && (key === "=" || key === "+")) {
      e.preventDefault();
      zoomStep(1);
      return;
    }
    if (mod && (key === "-" || key === "_")) {
      e.preventDefault();
      zoomStep(-1);
      return;
    }
    if (mod && key === "0") {
      e.preventDefault();
      zoomTo(1);
      return;
    }
    if (mod || e.altKey) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) setSpaceDown(true);
      return;
    }
    if (e.shiftKey && e.code === "Digit1") {
      e.preventDefault();
      fit();
      return;
    }
    if (key === "'" || e.code === "Quote") {
      e.preventDefault();
      toggleDotGrid();
      return;
    }
    if (e.key === "/" && !isAdjusting()) {
      e.preventDefault();
      openQuickInsert();
      return;
    }
    if (e.shiftKey) return;
    if (key === "v") applyTool("select");
    else if (key === "f") applyTool("frame");
    else if (key === "t") applyTool("text");
  };
  const up = (e: KeyboardEvent) => {
    if (e.code === "Space" && getBoard().spaceDown) setSpaceDown(false);
  };
  const blur = () => setSpaceDown(false);
  doc.addEventListener("keydown", down, true);
  doc.addEventListener("keyup", up, true);
  doc.defaultView?.addEventListener("blur", blur);
  return () => {
    doc.removeEventListener("keydown", down, true);
    doc.removeEventListener("keyup", up, true);
    doc.defaultView?.removeEventListener("blur", blur);
  };
}
