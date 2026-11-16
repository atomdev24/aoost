import type { PuckApi } from "@puckeditor/core";
import { DESIGN_WIDTH, type Breakpoint } from "../../schema";
import { getState, setOverlay } from "../store";
import { frameOrigin, revealRect } from "./store";

/**
 * Puck owns the selection and the active viewport. Code outside Puck's tree
 * (the passive frames, the tools, keyboard shortcuts) reaches it through here.
 */
let getPuck: (() => PuckApi) | null = null;
export const connectPuck = (fn: () => PuckApi) => {
  getPuck = fn;
};

/** Make a breakpoint the active one: Puck's live frame moves to it and the inspector follows. */
export function activateBreakpoint(bp: Breakpoint, select?: string | null) {
  const puck = getPuck?.();
  if (!puck) return;
  const ui: Record<string, unknown> = {};
  if (puck.appState.ui.viewports.current.width !== DESIGN_WIDTH[bp]) ui.viewports = { ...puck.appState.ui.viewports, current: { width: DESIGN_WIDTH[bp], height: "auto" } };
  if (select !== undefined) {
    setOverlay(null);
    ui.itemSelector = select ? (puck.getSelectorForId(select) ?? null) : null;
  }
  if (Object.keys(ui).length) puck.dispatch({ type: "setUi", ui: ui as never });
}

/** Select a block by id once Puck has it (new blocks arrive on the next tick). */
export function selectBlock(id: string | null) {
  setTimeout(() => {
    const puck = getPuck?.();
    if (!puck) return;
    setOverlay(null);
    puck.dispatch({ type: "setUi", ui: { itemSelector: id ? (puck.getSelectorForId(id) ?? null) : null } });
    if (id) revealBlock(id, getState().bp);
  }, 0);
}

/** Pan the board so a block in the active frame is in view (after selecting it from the layers list). */
export function revealBlock(id: string, bp: Breakpoint) {
  requestAnimationFrame(() => {
    const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
    const el = doc?.querySelector(`[data-node-id="${CSS.escape(id)}"], [data-section-id="${CSS.escape(id)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const o = frameOrigin(bp);
    revealRect({ x: o.x + r.left, y: o.y + r.top, w: r.width, h: Math.max(1, r.height) });
  });
}
