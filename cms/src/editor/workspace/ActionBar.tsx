import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { isHidden, locate } from "../../model/page-ops";
import { useBoard } from "../board/store";
import { deleteBlock, duplicateBlock, moveBlock, toggleBlockHidden } from "../canvas/actions";
import { currentPage, useEditor } from "../store";
import { chooseMedia } from "../canvas/drops";
import { startRichEdit } from "../rich/edit-store";
import { toggleSettings, useSettingsShown } from "./settings-pref";

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const UP = "M8 13V3M3.5 7.5L8 3l4.5 4.5";
const DOWN = "M8 3v10M3.5 8.5L8 13l4.5-4.5";
const COPY = "M5.5 5.5h7v7h-7zM3.5 10.5v-7h7";
const EYE = "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 9.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z";
const EYE_OFF = "M2 2l12 12M6.4 3.8A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a11 11 0 0 1-1.9 2.5M10 12.2a6 6 0 0 1-2 .3C4 12.5 1.5 8 1.5 8a11 11 0 0 1 2.4-3";
const TRASH = "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5";

/**
 * Puck's action bar on the selected block, drawn as the board's name tag: a
 * small accent pill above the block's top-left corner. Hovering it expands the
 * pill into quick actions (move up, move down, duplicate, hide, delete). Each
 * goes through the store, so it is one undo step. The tag is counter-scaled so
 * it stays the same size on screen at any zoom.
 */
export function ActionBar({ label, parentAction }: { label?: string; children?: ReactNode; parentAction?: ReactNode }) {
  const zoom = useBoard((s) => s.view.zoom);
  const id = useEditor((s) => s.selection[0]);
  const bp = useEditor((s) => s.bp);
  const page = useEditor(currentPage);
  const at = id ? locate(page, id) : null;
  const item = at?.kind === "section" ? at.section : at?.kind === "node" ? at.node : null;
  const hidden = item ? isHidden(item, bp) : false;
  const name = item?.name ?? label;
  const settings = useSettingsShown();
  const node = at?.kind === "node" ? at.node : null;
  // The block's main action, in words (direction A): type in text, replace a picture or video.
  const main =
    node && !node.locked
      ? node.type === "Text"
        ? { label: "Edit text", run: (x: string) => startRichEdit(x, bp) }
        : node.type === "Image" || node.type === "Video"
          ? { label: "Replace", run: (x: string) => void chooseMedia(x, node.type === "Video" ? "video" : "image") }
          : null
      : null;
  // A block at the very top of its frame has no room above it, so the tag tucks inside its top edge instead.
  const ref = useRef<HTMLDivElement>(null);
  const [inside, setInside] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => setOpen(false), [id]);
  useLayoutEffect(() => {
    const anchor = ref.current?.parentElement;
    if (!anchor) return;
    const room = anchor.getBoundingClientRect().top + (anchor.ownerDocument.defaultView?.scrollY ?? 0);
    const next = room < 24 / zoom;
    if (next !== inside) setInside(next);
  });
  const act = (fn: (id: string) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id) fn(id);
  };
  return (
    <div
      ref={ref}
      className={`ed-tag${inside ? " is-inside" : ""}${open ? " is-open" : ""}`}
      style={{ transform: `scale(${1 / zoom}) translateY(${inside ? "4px" : "calc(-100% - 4px)"})` }}
      onPointerDown={(e) => e.stopPropagation()}>
      {/* On touch there is no hover: a tap on the name opens the quick actions. */}
      <span className="ed-tag-name" onClick={() => setOpen((o) => !o)}>
        {name}
      </span>
      {item ? (
        <span className="ed-tag-actions" role="toolbar" aria-label="Block actions">
          {main ? (
            <button type="button" className="ed-tag-word" onClick={act(main.run)}>
              {main.label}
            </button>
          ) : null}
          {parentAction}
          <button type="button" aria-label="Move up" title="Move up" onClick={act((x) => moveBlock(x, -1))}>
            <Icon d={UP} />
          </button>
          <button type="button" aria-label="Move down" title="Move down" onClick={act((x) => moveBlock(x, 1))}>
            <Icon d={DOWN} />
          </button>
          <button type="button" aria-label="Duplicate" title="Duplicate" onClick={act(duplicateBlock)}>
            <Icon d={COPY} />
          </button>
          <button type="button" aria-label={hidden ? `Show on ${bp}` : `Hide on ${bp}`} aria-pressed={hidden} title={hidden ? `Hidden on ${bp}: show it (Visible on)` : `Hide on ${bp} (Visible on)`} onClick={act(toggleBlockHidden)}>
            <Icon d={hidden ? EYE_OFF : EYE} />
          </button>
          <button type="button" aria-label="Delete" title="Delete" onClick={act(deleteBlock)}>
            <Icon d={TRASH} />
          </button>
          <button type="button" className="ed-tag-word ed-desk-only" aria-pressed={settings} title={settings ? "Hide the settings panel" : "Show the settings panel"} onClick={act(() => toggleSettings())}>
            Settings
          </button>
        </span>
      ) : null}
    </div>
  );
}
