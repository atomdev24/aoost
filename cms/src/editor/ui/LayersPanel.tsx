import { useState } from "react";
import { components, getComponent } from "../../components/registry";
import { createOverlay, isHidden, nudgeOrder, remove, rename, setHidden, setLocked } from "../../model/page-ops";
import type { Node, Section } from "../../schema";
import { revealBlock } from "../board/bridge";
import { usePuck } from "../puck/usePuck";
import { currentPage, getState, setOverlay, updatePage, useEditor } from "../store";
import { Select } from "./kit";
import { LayerIcon } from "./LayerIcon";

const KIND_LABEL: Record<Section["kind"], string> = { flow: "Flow", grid: "Grid", canvas: "Canvas" };

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
const Arrow = ({ up }: { up: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d={up ? "M3 7.500l3-3 3 3" : "M3 4.500l3 3 3-3"} />
  </svg>
);

/**
 * Layers: every section and node on the page, plus overlays. Click to select,
 * double-click to rename, and lock, hide (per breakpoint) or reorder from the row.
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

  const row = (item: Section | Node, opts: { id: string; label: string; meta: string; typeOrKind: string; depth: number; selected: boolean; onSelect: () => void }) => {
    const hidden = isHidden(item, bp);
    return (
      <li key={opts.id} className={`ed-layer${opts.selected ? " is-selected" : ""}${hidden ? " is-hidden" : ""}`} style={{ paddingLeft: 8 + opts.depth * 14 }}>
        <LayerIcon type={opts.typeOrKind} className="ed-layer-icon" />
        {renaming === opts.id ? (
          <input
            className="ed-input"
            autoFocus
            defaultValue={item.name ?? ""}
            placeholder={opts.label}
            aria-label="Layer name"
            onBlur={(e) => {
              edit((p) => rename(p, opts.id, e.target.value), "Rename layer");
              setRenaming(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(null);
            }}
          />
        ) : (
          <button type="button" className="ed-layer-name" onClick={opts.onSelect} onDoubleClick={() => setRenaming(opts.id)} title="Click to select, double-click to rename">
            <span>{opts.label}</span>
            <small>{opts.meta}</small>
          </button>
        )}
        <span className="ed-layer-tools">
          <button type="button" className="ed-mini" aria-label={`Move ${opts.label} up`} onClick={() => edit((p) => nudgeOrder(p, opts.id, -1), "Reorder layers")}>
            <Arrow up />
          </button>
          <button type="button" className="ed-mini" aria-label={`Move ${opts.label} down`} onClick={() => edit((p) => nudgeOrder(p, opts.id, 1), "Reorder layers")}>
            <Arrow up={false} />
          </button>
          <button
            type="button"
            className="ed-mini"
            aria-pressed={hidden}
            aria-label={`${hidden ? "Show" : "Hide"} ${opts.label} on ${bp}`}
            title={`${hidden ? "Hidden" : "Visible"} on ${bp}`}
            onClick={() => edit((p) => setHidden(p, opts.id, getState().bp, !hidden), hidden ? "Show layer" : "Hide layer")}
          >
            <Eye off={hidden} />
          </button>
          <button type="button" className="ed-mini" aria-pressed={!!item.locked} aria-label={`${item.locked ? "Unlock" : "Lock"} ${opts.label}`} onClick={() => edit((p) => setLocked(p, opts.id, !item.locked), item.locked ? "Unlock layer" : "Lock layer")}>
            <Lock on={!!item.locked} />
          </button>
        </span>
      </li>
    );
  };

  const firstSelected = selection[0];
  const anchorSection = page.sections.find((s) => s.id === firstSelected || s.children.some((n) => n.id === firstSelected));

  return (
    <div className="ed-panel">
      <div className="ed-panel-head">
        <span className="ed-caps">{page.title}</span>
      </div>
      <ul className="ed-layers">
        {page.sections.flatMap((s, i) => [
          row(s, { id: s.id, label: s.name ?? `Section ${i + 1}`, meta: KIND_LABEL[s.kind], typeOrKind: s.kind, depth: 0, selected: selection.includes(s.id), onSelect: () => select(s.id) }),
          // One-block sections (the homepage) show just the section until it is selected; bigger ones always list their blocks.
          ...(s.children.length > 1 || selection.some((id) => id === s.id || s.children.some((n) => n.id === id)) ? s.children : []).map((n) =>
            row(n, { id: n.id, label: n.name ?? getComponent(n.type)?.label ?? n.type, meta: n.type === "Text" ? String(n.content.text ?? "").slice(0, 24) : "", typeOrKind: n.type, depth: 1, selected: selection.includes(n.id), onSelect: () => select(n.id) }),
          ),
        ])}
      </ul>

      <div className="ed-panel-head">
        <span className="ed-caps">Overlays</span>
      </div>
      <ul className="ed-layers">
        {page.overlays.map((o) =>
          row(o.node, {
            id: o.id,
            label: o.node.name ?? getComponent(o.node.type)?.label ?? o.node.type,
            meta: o.anchor === "viewport" ? "On screen" : `On ${page.sections.find((s) => o.anchor !== "viewport" && s.id === o.anchor.sectionId)?.name ?? "section"}`,
            typeOrKind: o.node.type,
            depth: 0,
            selected: overlayId === o.id,
            onSelect: () => selectOverlay(o.id),
          }),
        )}
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
