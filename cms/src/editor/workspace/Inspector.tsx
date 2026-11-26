import { setMode, useSimple } from "./mode";
import { useSettingsShown } from "./settings-pref";
import { Puck } from "@puckeditor/core";
import { getComponent } from "../../components/registry";
import { locate } from "../../model/page-ops";
import { BREAKPOINT_LABEL, type Breakpoint, type Section } from "../../schema";
import { REFERENCE } from "../../responsive/resolve";
import { blockOverrides, resetBlockOverrides } from "../board/overrides";
import { currentPage, updatePage, useEditor } from "../store";
import { GlobalPanel, OverlayPanel } from "../parts";
import { usePhone } from "../touch/device";
import { nearestCardSize, type CardSize } from "./card";
import { useEffect, useRef, useState } from "react";
import { useRail } from "./rail-store";
import { tagInspectorTabs, type InspectorTab } from "./inspector-tabs";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "style", label: "Style" },
  { id: "layout", label: "Layout" },
];

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

/**
 * The floating 284px inspector: what is selected and its settings. The screen size being
 * edited is picked in the top bar (or by clicking a frame label); the scope bar names it.
 * It only shows while something is selected; page settings live in the Pages flyout.
 */
export function Inspector() {
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  const selected = useEditor((s) => s.selection.length > 0);
  const shown = useSettingsShown();
  const phone = usePhone();
  if (!selected && !overlayId && !globalId) return null;
  // Desktop: the settings show when asked for (Settings in the block's action bar); phones keep the sheet.
  if (!shown && !phone && !overlayId && !globalId) return null;
  return <InspectorPanel />;
}

function InspectorPanel() {
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  const selected = useEditor((s) => s.selection.length > 0);
  const subject = useSubject();
  const phone = usePhone();
  const card = useCard();
  // On a phone the sheet steps aside (just its title row) while a left panel is open.
  const panelOpen = useRail((s) => s.active !== null);
  const size = phone && panelOpen ? "collapsed" : card.size;
  // Each new selection opens short, at the top: the Content fields.
  const target = useEditor((s) => s.overlayId ?? s.globalId ?? s.selection[0] ?? null);
  const body = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<InspectorTab>("content");
  const [present, setPresent] = useState<InspectorTab[]>(["content", "style", "layout"]);
  useEffect(() => {
    if (phone) card.reset();
    body.current?.scrollTo({ top: 0 });
  }, [target, phone]);
  // Content / Style / Layout tabs: tag each field with its tab, and keep the tags as fields change.
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const run = () => {
      const has = tagInspectorTabs(el);
      setPresent((p) => (p.join() === has.join() ? p : has));
    };
    run();
    const mo = new MutationObserver(run);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [target]);
  // Each new selection opens on its first tab with something in it.
  useEffect(() => {
    setTab((t) => (present.includes(t) ? t : (present[0] ?? "content")));
  }, [present]);
  useEffect(() => setTab(present[0] ?? "content"), [target]);
  const simple = useSimple();
  // Simple mode: just the words and pictures (Content); the rest is one click away in Full.
  const shownTabs = simple && !overlayId && !globalId ? present.filter((t) => t === "content") : present;
  const shownTab = simple && !overlayId && !globalId ? "content" : tab;
  return (
    <aside className={`ed-inspector${phone ? " is-card" : ""}`} aria-label="Inspector" data-size={phone ? size : undefined} style={phone && card.drag !== null ? { height: card.drag } : undefined}>
      {phone ? (
        <button type="button" className="ed-card-grip" aria-label={size === "full" ? "Shrink the inspector" : "Expand the inspector"} aria-expanded={size === "full"} onPointerDown={card.onPointerDown} onClick={card.onClick}>
          <span aria-hidden="true" />
        </button>
      ) : null}
      <header className="ed-inspector-head" onPointerDown={phone ? card.onPointerDown : undefined}>
        <div className="ed-inspector-title">
          <strong title={subject.name}>{subject.name}</strong>
          <span>{subject.type}</span>
        </div>
      </header>
      {selected || overlayId ? <ScopeBar /> : null}
      {shownTabs.length > 1 ? (
        <div className="ed-itabs" role="tablist" aria-label="Settings">
          {TABS.filter((t) => shownTabs.includes(t.id)).map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ed-inspector-body" ref={body} data-tab={present.length > 1 || simple ? shownTab : undefined} data-simple={simple && !overlayId && !globalId ? "" : undefined}>
        {overlayId ? <OverlayPanel overlayId={overlayId} /> : globalId ? <GlobalPanel globalId={globalId} /> : <Puck.Fields />}
      </div>
      {simple && !overlayId && !globalId ? (
        <p className="ed-simple-note">
          {present.includes("content") ? "Simple: words and pictures. " : "This block has no words or pictures to change. "}
          <button type="button" onClick={() => setMode("full")}>
            Switch to Full
          </button>{" "}
          for style and layout.
        </p>
      ) : null}
    </aside>
  );
}

/**
 * On a phone the inspector is a card at the bottom right. Drag its header (or
 * the grip) to resize it: it settles at just its title, about a third of the screen,
 * or nearly full height. A tap on the grip toggles full height.
 */
function useCard() {
  const [size, setSize] = useState<CardSize>("short");
  const [drag, setDrag] = useState<number | null>(null);
  const moved = useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const card = (e.currentTarget as HTMLElement).closest<HTMLElement>(".ed-inspector");
    if (!card) return;
    const startY = e.clientY;
    const startH = card.getBoundingClientRect().height;
    const top = card.offsetParent?.getBoundingClientRect().height ?? window.innerHeight;
    moved.current = false;
    const move = (m: PointerEvent) => {
      const dy = m.clientY - startY;
      if (!moved.current && Math.abs(dy) < 6) return;
      moved.current = true;
      setDrag(Math.max(48, Math.min(top - 60, startH - dy)));
    };
    const up = (m: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (moved.current) setSize(nearestCardSize(startH - (m.clientY - startY), top));
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const onClick = () => {
    if (moved.current) return void (moved.current = false);
    setSize((s) => (s === "full" ? "short" : "full"));
  };
  const reset = () => setSize("short");
  return { size, drag, onPointerDown, onClick, reset };
}

const DEVICE: Record<Breakpoint, string> = {
  desktop: "M2 3.5h12v8H2zM6 14h4M8 11.5V14",
  mobile: "M5 1.5h6a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM7 12.5h2",
  tablet: "M3.5 1.5h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM7 12.5h2",
  widescreen: "M1 3h14v7.5H1zM5.5 14h5M8 10.5V14",
};
const BP_NAME = BREAKPOINT_LABEL;

/**
 * Which breakpoint the inspector edits, and how many values this block
 * changes there. Desktop is the reference; every other size holds changes
 * from the size it inherits (mobile and widescreen from desktop, tablet from
 * mobile), so the bar is tinted there and offers "Reset all" (one undo step).
 */
function ScopeBar() {
  const bp = useEditor((s) => s.bp);
  const page = useEditor(currentPage);
  const id = useEditor((s) => s.overlayId ?? s.selection[0] ?? null);
  const reference = bp === "desktop";
  const count = id && !reference ? blockOverrides(page, id, bp) : 0;
  const from = REFERENCE[bp];
  return (
    <div className={`ed-scope${reference ? "" : " is-override"}`} role="status" title={reference ? "Desktop is the base. Changes here show on every size unless a size has its own value." : `Layout and frame changes here apply to ${BP_NAME[bp]} only. Unchanged values follow ${from ? BP_NAME[from] : "Desktop"}. Content is shared.`}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={DEVICE[bp]} />
      </svg>
      <span className="ed-scope-text">
        Editing {BP_NAME[bp]}
        {reference ? null : ` · ${count === 1 ? "1 change" : `${count} changes`}`}
      </span>
      {!reference && count > 0 && id ? (
        <button type="button" className="ed-scope-reset" onClick={() => updatePage(page.id, (p) => resetBlockOverrides(p, id, bp), `Reset all ${BP_NAME[bp]} changes`)}>
          Reset all
        </button>
      ) : null}
    </div>
  );
}
