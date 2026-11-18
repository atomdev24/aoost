import { Puck } from "@puckeditor/core";
import { getComponent } from "../../components/registry";
import { locate } from "../../model/page-ops";
import type { Breakpoint, Section } from "../../schema";
import { activateBreakpoint } from "../board/bridge";
import { blockOverrides, resetBlockOverrides } from "../board/overrides";
import { currentPage, updatePage, useEditor } from "../store";
import { GlobalPanel } from "../ui/GlobalPanel";
import { OverlayPanel } from "../ui/OverlayPanel";

const KIND: Record<Section["kind"], string> = { flow: "Section", grid: "Grid section", canvas: "Free-layout section" };

/** What the inspector is about: the block's name and its type. */
function useSubject(): { name: string; type: string } {
  const page = useEditor(currentPage);
  const id = useEditor((s) => s.selection[0]);
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  const globals = useEditor((s) => s.site.globals);
  if (globalId) {
    const g = globals.find((x) => x.id === globalId);
    return { name: g?.name ?? "Global component", type: "Global component · every page" };
  }
  if (overlayId) {
    const o = page.overlays.find((x) => x.id === overlayId);
    return { name: o?.node.name ?? getComponent(o?.node.type ?? "")?.label ?? "Overlay", type: `Overlay · on ${page.title}` };
  }
  const at = id ? locate(page, id) : null;
  if (at?.kind === "section") return { name: at.section.name ?? KIND[at.section.kind], type: `${KIND[at.section.kind]} · on ${page.title}` };
  if (at?.kind === "node") {
    const def = getComponent(at.node.type);
    const kind = def?.category === "aoost" ? "aoost block" : (def?.label ?? at.node.type);
    return { name: at.node.name ?? def?.label?.replace(/^aoost · /, "") ?? at.node.type, type: `${kind} · on ${page.title}` };
  }
  return { name: page.title, type: "Page settings" };
}

/** The Desktop / Mobile switch for the breakpoint being edited. The active frame on the board follows it. */
export function BreakpointSwitch() {
  const bp = useEditor((s) => s.bp);
  const opt = (value: Breakpoint, label: string) => (
    <button type="button" aria-pressed={bp === value} onClick={() => activateBreakpoint(value)}>
      {label}
    </button>
  );
  return (
    <div className="ed-bpswitch" role="group" aria-label="Editing breakpoint">
      {opt("desktop", "Desktop")}
      {opt("mobile", "Mobile")}
    </div>
  );
}

/**
 * The floating 284px inspector: what is selected, which breakpoint is being edited, and its settings.
 * It only shows while something is selected; page settings live in the Pages flyout.
 */
export function Inspector() {
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  const selected = useEditor((s) => s.selection.length > 0);
  if (!selected && !overlayId && !globalId) return null;
  return <InspectorPanel />;
}

function InspectorPanel() {
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  const selected = useEditor((s) => s.selection.length > 0);
  const subject = useSubject();
  return (
    <aside className="ed-inspector" aria-label="Inspector">
      <header className="ed-inspector-head">
        <div className="ed-inspector-title">
          <strong>{subject.name}</strong>
          <span>{subject.type}</span>
        </div>
        <BreakpointSwitch />
      </header>
      {selected || overlayId ? <ScopeBar /> : null}
      <div className="ed-inspector-body">
        {overlayId ? <OverlayPanel overlayId={overlayId} /> : globalId ? <GlobalPanel globalId={globalId} /> : <Puck.Fields />}
      </div>
    </aside>
  );
}

const DEVICE: Record<Breakpoint, string> = {
  desktop: "M2 3.5h12v8H2zM6 14h4M8 11.5V14",
  mobile: "M5 1.5h6a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM7 12.5h2",
};
const BP_NAME: Record<Breakpoint, string> = { desktop: "Desktop", mobile: "Mobile" };

/**
 * Which breakpoint the inspector edits, and how many values this block
 * changes there. Desktop is the reference; Mobile holds the changes, so the
 * bar is tinted there and offers "Reset all" (one undo step).
 * Written per breakpoint, so more breakpoints can slot in later.
 */
function ScopeBar() {
  const bp = useEditor((s) => s.bp);
  const page = useEditor(currentPage);
  const id = useEditor((s) => s.overlayId ?? s.selection[0] ?? null);
  const reference = bp === "desktop";
  const count = id && !reference ? blockOverrides(page, id) : 0;
  return (
    <div className={`ed-scope${reference ? "" : " is-override"}`} role="status" title={reference ? "Desktop is the base. Changes here show on every size unless a size has its own value." : "Layout and frame changes here apply to Mobile only. Content is shared."}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={DEVICE[bp]} />
      </svg>
      <span className="ed-scope-text">
        Editing {BP_NAME[bp]}
        {reference ? null : ` · ${count === 1 ? "1 change" : `${count} changes`}`}
      </span>
      {!reference && count > 0 && id ? (
        <button type="button" className="ed-scope-reset" onClick={() => updatePage(page.id, (p) => resetBlockOverrides(p, id), `Reset all ${BP_NAME[bp]} changes`)}>
          Reset all
        </button>
      ) : null}
    </div>
  );
}
