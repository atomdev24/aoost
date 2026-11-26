import { startRichEdit } from "../rich/edit-store";
import { resetTips } from "../tips/tips";
import { nodeToBoard } from "../board/ref-page";
import { openProblemLog, openReport } from "../problems";
import { locate } from "../../model/page-ops";
import type { Breakpoint } from "../../schema";
import { activateBreakpoint, selectBlock } from "../board/bridge";
import { applyTool } from "../board/keys";
import { resetBlockOverrides } from "../board/overrides";
import { fit, frameRects, revealRect, setFrameHidden, toggleDotGrid, zoomStep, zoomTo } from "../board/store";
import { deleteBlock, duplicateBlock, moveBlock, toggleBlockHidden } from "../canvas/actions";
import { adjustable, isAdjusting, startAdjust } from "../canvas/adjust-state";
import { openQuickInsert } from "../insert/QuickInsert";
import { currentPage, flush, getState, megaItemId, redo, undo, updatePage } from "../store";
import { openSheet, publish, pushStaging } from "../workspace/publish";
import { newVariant } from "../workspace/PageSwitcher";
import { electCurrentVariant, getStaging, sendToStaging } from "../workspace/staging";
import { togglePanel } from "../workspace/rail-store";
import { openPalette, toggleCheatSheet, togglePalette } from "./palette-store";
import { isTouchOnly } from "../touch/device";
import { actionById, type ActionId } from "./registry";

const selected = () => getState().selection[0] ?? null;

/** Make a frame the one being edited and bring it into view (shown if it was hidden). */
function showFrame(bp: Breakpoint) {
  setFrameHidden(bp, false);
  activateBreakpoint(bp);
  const f = frameRects().find((r) => r.bp === bp);
  if (f) revealRect({ x: f.x, y: f.y, w: f.w, h: Math.min(f.h, 900) });
}

export async function previewPage() {
  await flush();
  const page = currentPage(getState());
  window.open(`/preview${megaItemId(page.id) || page.slug === "/" ? "/" : page.slug}`, "aoost-preview");
}

/** The element of a block in the editable frame. */
const blockEl = (id: string) => document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument?.querySelector(`[data-node-id="${CSS.escape(id)}"]`) ?? null;

/** Enter: adjust a picture, step into a section, or put the cursor in the block's first field. */
function editSelection(): boolean {
  const id = selected();
  if (!id) return false;
  const page = currentPage(getState());
  const at = locate(page, id);
  if (!at) return false;
  if (at.kind === "section") {
    const first = at.section.children[0];
    if (first) selectBlock(first.id);
    return true;
  }
  // Text: edit the words where they are.
  const node = at.kind === "node" ? at.node : at.kind === "overlay" ? at.overlay.node : null;
  if (node?.type === "Text" && !node.locked) {
    startRichEdit(id, getState().bp);
    return true;
  }
  if (adjustable(blockEl(id))) {
    startAdjust(id);
    return true;
  }
  const field = document.querySelector<HTMLElement>(".ed-inspector-body textarea, .ed-inspector-body input[type=text], .ed-inspector-body input:not([type])");
  field?.focus();
  return !!field;
}

/** Esc: from a block to its section, from a section (or overlay, or global) to nothing. */
function stepOut(): boolean {
  const s = getState();
  if (s.overlayId || s.globalId) {
    activateBreakpoint(s.bp, null);
    return true;
  }
  const id = selected();
  if (!id) return false;
  const at = locate(currentPage(s), id);
  if (at?.kind === "node") selectBlock(at.section.id);
  else activateBreakpoint(s.bp, null);
  return true;
}

const withSelection = (fn: (id: string) => void) => () => {
  const id = selected();
  if (!id) return false;
  fn(id);
  return true;
};

/** What each action does. Returning false means "nothing to do here" (the key goes on to the browser). */
export const RUNNERS: Record<ActionId, () => boolean | void> = {
  "palette.open": togglePalette,
  "help.shortcuts": toggleCheatSheet,
  "help.report": openReport,
  "help.problems": openProblemLog,
  "help.tips": resetTips,
  "tool.select": () => applyTool("select"),
  "tool.frame": () => applyTool("frame"),
  "tool.text": () => applyTool("text"),
  "tool.image": () => applyTool("image"),
  "tool.comment": () => applyTool("comment"),
  "tool.section": () => applyTool("section"),
  "canvas.zoomIn": () => zoomStep(1),
  "canvas.zoomOut": () => zoomStep(-1),
  "canvas.zoom100": () => zoomTo(1),
  "canvas.fitAll": () => void fit(),
  "canvas.grid": toggleDotGrid,
  "frame.widescreen": () => showFrame("widescreen"),
  "frame.desktop": () => showFrame("desktop"),
  "frame.tablet": () => showFrame("tablet"),
  "frame.mobile": () => showFrame("mobile"),
  "block.duplicate": withSelection(duplicateBlock),
  "block.delete": withSelection(deleteBlock),
  "block.moveUp": withSelection((id) => moveBlock(id, -1)),
  "block.moveDown": withSelection((id) => moveBlock(id, 1)),
  "block.hide": withSelection(toggleBlockHidden),
  "block.edit": () => !isAdjusting() && editSelection(),
  "block.stepOut": stepOut,
  "block.toBoard": withSelection((id) => void nodeToBoard(id)),
  "block.resetOverrides": withSelection((id) => {
    const { bp } = getState();
    if (bp === "desktop") return;
    const page = currentPage(getState());
    updatePage(page.id, (p) => resetBlockOverrides(p, id, bp), `Reset ${bp} changes`);
  }),
  "panel.layers": () => togglePanel("layers"),
  "panel.pages": () => togglePanel("pages"),
  "panel.media": () => togglePanel("media"),
  "panel.history": () => togglePanel("history"),
  "panel.insert": () => togglePanel("insert"),
  "panel.nav": () => togglePanel("nav"),
  "panel.theme": () => togglePanel("theme"),
  "panel.fonts": () => togglePanel("fonts"),
  "panel.global": () => togglePanel("global"),
  "insert.quick": () => !isAdjusting() && (openQuickInsert(), true),
  "history.undo": undo,
  "history.redo": redo,
  "draft.save": () => void flush(),
  "publish.sheet": openSheet,
  "publish.now": () => void publish(),
  "page.preview": () => void previewPage(),
  "variant.new": () => newVariant(),
  "variant.elect": () => void electCurrentVariant(),
  "staging.send": () => void sendToStaging().then((ok) => ok && openSheet()),
  "staging.push": () => void (getStaging().info ? pushStaging() : sendToStaging().then((ok) => ok && openSheet())),
  "claude.ask": openPalette,
};

/** Can it run now? (Block actions need a selection.) */
export const canRun = (id: ActionId) => {
  // The shortcuts sheet means nothing without a keyboard, so touch-only devices don't list it.
  if (id === "help.shortcuts" && isTouchOnly()) return false;
  return !actionById(id).needsSelection || !!selected();
};

/** Run an action. False when it had nothing to act on. */
export function runAction(id: ActionId): boolean {
  if (!canRun(id)) return false;
  return RUNNERS[id]() !== false;
}
