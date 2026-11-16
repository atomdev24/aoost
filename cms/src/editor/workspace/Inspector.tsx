import { Puck } from "@puckeditor/core";
import { getComponent } from "../../components/registry";
import { locate } from "../../model/page-ops";
import type { Breakpoint, Section } from "../../schema";
import { activateBreakpoint } from "../board/bridge";
import { currentPage, useEditor } from "../store";
import { GlobalPanel } from "../ui/GlobalPanel";
import { OverlayPanel } from "../ui/OverlayPanel";
import { PageSettings } from "../ui/PageSettings";

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

/** The 284px inspector: what is selected, which breakpoint is being edited, and its settings. */
export function Inspector() {
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  const selected = useEditor((s) => s.selection.length > 0);
  const bp = useEditor((s) => s.bp);
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
      {bp === "mobile" && (selected || overlayId) ? <p className="ed-inspector-note">Layout and frame changes apply to Mobile only. Content is shared.</p> : null}
      <div className="ed-inspector-body">
        {overlayId ? <OverlayPanel overlayId={overlayId} /> : globalId ? <GlobalPanel globalId={globalId} /> : selected ? <Puck.Fields /> : <PageSettings />}
      </div>
    </aside>
  );
}
