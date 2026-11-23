import { getComponent } from "../../components/registry";
import { updateNode } from "../../model/page-ops";
import type { Node } from "../../schema";
import { getState, updatePage } from "../store";

/** Whether resizing keeps a block's proportions: pictures and video do unless switched off; other blocks only when switched on. */
export const keepsRatio = (n: Node) => n.style.base.keepRatio ?? !!getComponent(n.type)?.framed;

export function toggleKeepRatio(n: Node) {
  const next = !keepsRatio(n);
  updatePage(getState().pageId, (p) => updateNode(p, n.id, (x) => ({ ...x, style: { ...x.style, base: { ...x.style.base, keepRatio: next } } })), next ? "Keep proportions" : "Free proportions");
}
