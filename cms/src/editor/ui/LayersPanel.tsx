import { useState, type DragEvent, type KeyboardEvent, type ReactElement } from "react";
import { components, getComponent } from "../../components/registry";
import { arrayDeltaForUp, arrayIndexForDrop, displayChildren } from "../../model/layer-order";
import { createOverlay, isHidden, moveNode, moveSection, nudgeOrder, remove, rename, setHidden, setLocked } from "../../model/page-ops";
import type { Node, Section } from "../../schema";
import { revealBlock } from "../board/bridge";
import { usePuck } from "../puck/usePuck";
import { currentPage, getState, setOverlay, updatePage, useEditor } from "../store";
import { Select } from "./kit";
import { LayerIcon } from "./LayerIcon";

const KIND_LABEL: Record<Section["kind"], string> = { flow: "Flow", grid: "Grid", canvas: "Free layout" };

const Eye = ({ off }: { off: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M1.500 8S4 3.500 8 3.500 14.500 8 14.500 8 12 12.500 8 12.500 1.500 8 1.500 8z" />
    <circle cx="8" cy="8" r="2" />
    {off ? <path d="M2.500 2.500l11 11" /> : null}
  </svg>
);
const Lock = ({ on }: { on: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <rect x="3.500" y="7" width="9" height="6.500" rx="1.500" />
    <path d={on ? "M5.500 7V5a2.500 2.500 0 0 1 5 0v2" : "M5.500 7V5a2.500 2.500 0 0 1 4.800-1"} />
  </svg>
);
const Chevron = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={open ? "M2 3.500l3 3 3-3" : "M3.500 2l3 3-3 3"} />
  </svg>
);

type Drag = { kind: "node"; id: string } | { kind: "section"; id: string };
type Drop = { kind: "node"; sectionId: string; index: number } | { kind: "section"; index: number };

const isGlobalSection = (s: Section) => s.children.some((n) => n.type === "Global" || n.type === "Footer");
const nodeLabel = (n: Node) => n.name ?? getComponent(n.type)?.label ?? n.type;
const before = (e: DragEvent) => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientY < r.top + r.height / 2;
};

/**
 * Layers, as a Figma-style tree: each section is a bold row with a colour bar, its layers sit
 * indented on a guide line, and the topmost layer is listed first. Drag rows to reorder (a gap
 * opens where the row will land), Alt+↑/↓ does the same from the keyboard. Hidden layers fade and
 * are struck through. Click to select, double-click to rename.
 */
export function LayersPanel() {
  const page = useEditor(currentPage);
  const bp = useEditor((s) => s.bp);
  const selection = useEditor((s) => s.selection);
  const overlayId = useEditor((s) => s.overlayId);
  const dispatch = usePuck((s) => s.dispatch);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newOverlay, setNewOverlay] = useState("");
  const [openState, setOpenState] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);

  const edit = (fn: Parameters<typeof updatePage>[1], label: string) => updatePage(page.id, fn, label);

  const select = (id: string) => {
    setOverlay(null);
    const selector = getSelectorForId(id);
    if (selector) dispatch({ type: "setUi", ui: { itemSelector: selector } });
    revealBlock(id, getState().bp);
  };
  const selectOverlay = (id: string) => {
    dispatch({ type: "setUi", ui: { itemSelector: null } });
    setOverlay(id);
  };

  const endDrag = () => {
    setDrag(null);
    setDrop(null);
  };
  const commitDrop = () => {
    if (!drag || !drop) return endDrag();
    if (drag.kind === "section" && drop.kind === "section") {
      const from = page.sections.findIndex((s) => s.id === drag.id);
      // drop.index counts sections without the dragged one, which is what moveSection expects.
      if (from >= 0) edit((p) => moveSection(p, drag.id, drop.index), "Reorder sections");
    }
    if (drag.kind === "node" && drop.kind === "node") {
      const target = page.sections.find((s) => s.id === drop.sectionId);
      if (target) {
        const count = target.children.filter((n) => n.id !== drag.id).length;
        edit((p) => moveNode(p, drag.id, target.id, arrayIndexForDrop(target, drop.index, count)), "Move layer");
      }
    }
    endDrag();
  };

  // Alt+↑/↓ moves the row up or down in the panel, whichever way its section stacks.
  const keyMove = (e: KeyboardEvent, id: string, section?: Section) => {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const up = e.key === "ArrowUp";
    const delta = section ? (up ? arrayDeltaForUp(section) : (-arrayDeltaForUp(section) as -1 | 1)) : up ? -1 : 1;
    edit((p) => nudgeOrder(p, id, delta), "Reorder layers");
  };

  const tools = (item: Section | Node, id: string, label: string) => {
    const hidden = isHidden(item, bp);
    return (
      <span className="ed-layer-tools">
        <button
          type="button"
          className="ed-mini"
          aria-pressed={hidden}
          aria-label={`${hidden ? "Show" : "Hide"} ${label} on ${bp}`}
          title={`${hidden ? "Hidden" : "Visible"} on ${bp}`}
          onClick={() => edit((p) => setHidden(p, id, getState().bp, !hidden), hidden ? "Show layer" : "Hide layer")}
        >
          <Eye off={hidden} />
        </button>
        <button type="button" className="ed-mini" aria-pressed={!!item.locked} aria-label={`${item.locked ? "Unlock" : "Lock"} ${label}`} onClick={() => edit((p) => setLocked(p, id, !item.locked), item.locked ? "Unlock layer" : "Lock layer")}>
          <Lock on={!!item.locked} />
        </button>
      </span>
    );
  };

  const nameButton = (item: Section | Node, id: string, label: string, meta: string, onSelect: () => void, onKey: (e: KeyboardEvent) => void) =>
    renaming === id ? (
      <input
        className="ed-input"
        autoFocus
        defaultValue={item.name ?? ""}
        placeholder={label}
        aria-label="Layer name"
        onBlur={(e) => {
          edit((p) => rename(p, id, e.target.value), "Rename layer");
          setRenaming(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setRenaming(null);
        }}
      />
    ) : (
      <button type="button" className="ed-layer-name" onClick={onSelect} onDoubleClick={() => setRenaming(id)} onKeyDown={onKey} title="Click to select, double-click to rename, drag to move">
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
      </button>
    );

  const gap = (key: string) => <li key={key} className="ed-layer-gap" aria-hidden="true" />;

  const sectionBlock = (s: Section, i: number, sectionDropIndex: number) => {
    const label = s.name ?? `Section ${i + 1}`;
    const selectedInside = selection.some((id) => id === s.id || s.children.some((n) => n.id === id));
    const open = openState[s.id] ?? (s.children.length > 1 || selectedInside);
    const hidden = isHidden(s, bp);
    const global = isGlobalSection(s);
    const shown = displayChildren(s);
    const rows: ReactElement[] = [];
    let k = 0; // index among rows that aren't being dragged
    shown.forEach((n) => {
      const dragging = drag?.kind === "node" && drag.id === n.id;
      const idx = k;
      if (!dragging && drop?.kind === "node" && drop.sectionId === s.id && drop.index === idx) rows.push(gap(`gap-${n.id}`));
      const nHidden = isHidden(n, bp);
      const label = nodeLabel(n);
      rows.push(
        <li
          key={n.id}
          className={`ed-layer ed-layer-child${selection.includes(n.id) ? " is-selected" : ""}${nHidden ? " is-hidden" : ""}${dragging ? " is-dragging" : ""}`}
          draggable={renaming !== n.id}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", n.id);
            setDrag({ kind: "node", id: n.id });
          }}
          onDragOver={(e) => {
            if (drag?.kind !== "node" || dragging) return;
            e.preventDefault();
            setDrop({ kind: "node", sectionId: s.id, index: before(e) ? idx : idx + 1 });
          }}
          onDrop={(e) => {
            e.preventDefault();
            commitDrop();
          }}
          onDragEnd={endDrag}
        >
          <LayerIcon type={n.type} className="ed-layer-icon" />
          {nameButton(n, n.id, label, n.type === "Text" ? String(n.content.text ?? "").slice(0, 24) : "", () => select(n.id), (e) => keyMove(e, n.id, s))}
          {tools(n, n.id, label)}
        </li>,
      );
      if (!dragging) k++;
    });
    if (drop?.kind === "node" && drop.sectionId === s.id && drop.index === k) rows.push(gap(`gap-end-${s.id}`));

    const sDragging = drag?.kind === "section" && drag.id === s.id;
    return [
      !sDragging && drop?.kind === "section" && drop.index === sectionDropIndex ? gap(`sgap-${s.id}`) : null,
      <li
        key={s.id}
        className={`ed-layer ed-layer-section${global ? " is-global" : ""}${selection.includes(s.id) ? " is-selected" : ""}${hidden ? " is-hidden" : ""}${sDragging ? " is-dragging" : ""}`}
        draggable={renaming !== s.id}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", s.id);
          setDrag({ kind: "section", id: s.id });
        }}
        onDragOver={(e) => {
          if (!drag || sDragging) return;
          e.preventDefault();
          if (drag.kind === "node") {
            // Dropping a layer on a section header puts it first in that section.
            setOpenState((o) => (o[s.id] ? o : { ...o, [s.id]: true }));
            setDrop({ kind: "node", sectionId: s.id, index: 0 });
          } else setDrop({ kind: "section", index: before(e) ? sectionDropIndex : sectionDropIndex + 1 });
        }}
        onDrop={(e) => {
          e.preventDefault();
          commitDrop();
        }}
        onDragEnd={endDrag}
      >
        <button type="button" className="ed-layer-caret" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${label}`} onClick={() => setOpenState((o) => ({ ...o, [s.id]: !open }))}>
          <Chevron open={open} />
        </button>
        <LayerIcon type={s.kind} className="ed-layer-icon" />
        {nameButton(s, s.id, label, global ? "Global" : KIND_LABEL[s.kind], () => select(s.id), (e) => keyMove(e, s.id))}
        {tools(s, s.id, label)}
      </li>,
      open && rows.length ? (
        <li key={`${s.id}-kids`} className="ed-layer-kids">
          <ul>{rows}</ul>
        </li>
      ) : null,
    ];
  };

  const firstSelected = selection[0];
  const anchorSection = page.sections.find((s) => s.id === firstSelected || s.children.some((n) => n.id === firstSelected));
  let si = 0;
  const sectionItems = page.sections.flatMap((s, i) => {
    const out = sectionBlock(s, i, si);
    if (!(drag?.kind === "section" && drag.id === s.id)) si++;
    return out;
  });

  return (
    <div className="ed-panel ed-layers-panel">
      <div className="ed-panel-head">
        <span className="ed-caps">{page.title}</span>
      </div>
      <ul className="ed-layers ed-tree" onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as globalThis.Node | null) && setDrop(null)}>
        {sectionItems}
        {drag?.kind === "section" && drop?.kind === "section" && drop.index === si ? gap("sgap-end") : null}
      </ul>

      <div className="ed-panel-head">
        <span className="ed-caps">Overlays</span>
      </div>
      <ul className="ed-layers ed-tree">
        {[...page.overlays].reverse().map((o) => {
          const label = nodeLabel(o.node);
          const hidden = isHidden(o.node, bp);
          return (
            <li key={o.id} className={`ed-layer${overlayId === o.id ? " is-selected" : ""}${hidden ? " is-hidden" : ""}`}>
              <LayerIcon type={o.node.type} className="ed-layer-icon" />
              {nameButton(
                o.node,
                o.id,
                label,
                o.anchor === "viewport" ? "On screen" : `On ${page.sections.find((s) => o.anchor !== "viewport" && s.id === o.anchor.sectionId)?.name ?? "section"}`,
                () => selectOverlay(o.id),
                (e) => {
                  if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                  e.preventDefault();
                  // Overlays later in the list paint on top, and the panel lists them reversed.
                  edit((p) => nudgeOrder(p, o.id, e.key === "ArrowUp" ? 1 : -1), "Reorder layers");
                },
              )}
              {tools(o.node, o.id, label)}
            </li>
          );
        })}
        {!page.overlays.length ? <li className="ed-empty">No overlays yet. An overlay straddles a section edge or floats over the screen.</li> : null}
      </ul>
      <div className="ed-panel-foot">
        <Select
          ariaLabel="Add an overlay"
          value={newOverlay}
          options={[{ value: "", label: "Add an overlay…" }, ...components.filter((c) => c.type !== "Global" && c.type !== "Footer").map((c) => ({ value: c.type, label: c.label }))]}
          onChange={(type) => {
            setNewOverlay("");
            if (!type) return;
            const overlay = createOverlay(type, anchorSection ? { sectionId: anchorSection.id, edge: "top" } : "viewport");
            edit((p) => ({ ...p, overlays: [...p.overlays, overlay] }), "Add overlay");
            selectOverlay(overlay.id);
          }}
        />
        <p className="ed-hint">Select a section first to attach the overlay to its top edge; otherwise it floats over the screen.</p>
      </div>
      <button type="button" className="ed-sr" onClick={() => firstSelected && edit((p) => remove(p, firstSelected), "Delete layer")}>
        Delete selected layer
      </button>
    </div>
  );
}
