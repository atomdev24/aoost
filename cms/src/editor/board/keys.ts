import { getPalette } from "../commands/palette-store";
import { runAction } from "../commands/run";
import { matchShortcut } from "../commands/shortcuts";
import { closeUnpinnedFlyout, getRailState } from "../workspace/rail-store";
import { selectBlock } from "./bridge";
import { getBoard, setSpaceDown } from "./store";
import { runTool, type Tool } from "./tools";

/**
 * Keyboard for the whole workspace, attached to the editor's document and to
 * every frame's document (keys pressed while a frame has focus land there).
 * The keys are in commands/shortcuts.ts and what they run in commands/run.ts;
 * the cheat sheet (?) lists them all.
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
    const sc = matchShortcut(e);
    if (!sc) return;
    if (typing(doc) && !sc.whileTyping) return;
    // The cheat sheet is up: only ? (and its own Esc) reach the editor.
    if (getPalette().cheat && sc.id !== "help.shortcuts" && sc.id !== "palette.open") return;
    if (sc.id === "canvas.pan") {
      e.preventDefault();
      if (!e.repeat) setSpaceDown(true);
      return;
    }
    // Esc first closes an unpinned flyout, then steps out of the selection.
    if (sc.id === "block.stepOut") {
      const rail = getRailState();
      if (!rail.pinned && rail.active) {
        e.preventDefault();
        e.stopPropagation();
        closeUnpinnedFlyout();
        return;
      }
    }
    if (!sc.action || !runAction(sc.action)) return;
    // Ours, not the browser's (⌘1–4, ⌘+/−, ⌘D, ⌘K…) and not Puck's (⌘Z, Delete).
    e.preventDefault();
    e.stopImmediatePropagation();
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
