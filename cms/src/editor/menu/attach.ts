import { locate } from "../../model/page-ops";
import { selectBlock } from "../board/bridge";
import { currentPage, getState } from "../store";
import { openContextMenu } from "./context-store";

/**
 * Right-click in the editable page frame: pick what's under the pointer (a block, else its section,
 * else the page) and open the menu there, in the editor's own coordinates. Text being edited keeps
 * the browser's own menu (spelling, paste).
 */
export function attachContextMenu(doc: Document): () => void {
  const menu = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target?.closest || target.closest("[data-rich-editing], input, textarea, [contenteditable='true']")) return;
    const page = currentPage(getState());
    const nodeEl = target.closest("[data-node-id]");
    const nodeId = nodeEl?.getAttribute("data-node-id") ?? null;
    const sectionId = target.closest("section.s[id]")?.id ?? null;
    const id = nodeId && locate(page, nodeId) ? nodeId : sectionId && locate(page, sectionId) ? sectionId : null;
    const kind = id === null ? "page" : id === nodeId ? "node" : "section";
    e.preventDefault();
    e.stopPropagation();
    // Right-clicking something outside the selection selects it (as in Figma); inside keeps it.
    if (id && !getState().selection.includes(id)) selectBlock(id);
    const frame = doc.defaultView?.frameElement as HTMLElement | null;
    const r = frame?.getBoundingClientRect();
    const scale = r && doc.documentElement.clientWidth ? r.width / doc.documentElement.clientWidth : 1;
    openContextMenu({ x: (r?.left ?? 0) + e.clientX * scale, y: (r?.top ?? 0) + e.clientY * scale, id, kind });
  };
  doc.addEventListener("contextmenu", menu, true);
  return () => doc.removeEventListener("contextmenu", menu, true);
}
