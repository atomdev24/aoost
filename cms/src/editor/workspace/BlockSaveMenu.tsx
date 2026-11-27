import { useEffect, useRef, useState } from "react";
import { getComponent } from "../../components/registry";
import { locate } from "../../model/page-ops";
import { blockDefault, clearBlockDefault, saveBlock, setBlockDefault } from "../../model/saved-blocks";
import { currentPage, getState, update, useEditor } from "../store";
import { openPanel } from "./rail-store";
import { openSavedTab } from "../insert/saved-open";

/**
 * "…" in the settings panel's header for a selected block:
 *   Save as a block: keep it exactly as it is, to add again from Insert → Saved;
 *   Make this the start for new <block>: every new one starts like this one (pictures, words, style);
 *   Back to the built-in start: undo that.
 */
export function BlockSaveMenu({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const page = useEditor(currentPage);
  const site = useEditor((s) => s.site);
  const at = locate(page, nodeId);
  const node = at?.kind === "node" ? at.node : at?.kind === "overlay" ? at.overlay.node : null;
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  if (!node) return null;
  const label = (getComponent(node.type)?.label ?? node.type).split(":")[0]!;
  const hasDefault = !!blockDefault(site, node.type);
  const pick = (fn: () => void) => () => (setOpen(false), fn());
  const fresh = () => {
    const now = currentPage(getState());
    const a = locate(now, nodeId);
    return a?.kind === "node" ? a.node : a?.kind === "overlay" ? a.overlay.node : null;
  };
  return (
    <div className="bd-frame-menu ed-blockmenu" ref={box}>
      <button type="button" className="bd-label-more" aria-label={`More for ${label}`} aria-haspopup="menu" aria-expanded={open} title="Save this block, or make it the start for new ones" onClick={() => setOpen(!open)}>
        …
      </button>
      {open ? (
        <ul className="bd-menu ed-blockmenu-list" role="menu" aria-label={label}>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={pick(() => {
                const n = fresh();
                if (!n) return;
                let id = "";
                update((s) => {
                  const r = saveBlock(s, n, n.name ?? label);
                  id = r.id;
                  return r.site;
                }, `Save ${label} as a block`);
                openPanel("insert");
                openSavedTab(id);
              })}
            >
              Save as a block
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" title={`Every new ${label} starts with this one's pictures, words and style`} onClick={pick(() => fresh() && update((s) => setBlockDefault(s, fresh()!), `New ${label} blocks start like this`))}>
              Make this the start for new {label}
            </button>
          </li>
          {hasDefault ? (
            <li role="none">
              <button type="button" role="menuitem" onClick={pick(() => update((s) => clearBlockDefault(s, node.type), `${label}: back to the built-in start`))}>
                New {label}: back to the built-in start
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
