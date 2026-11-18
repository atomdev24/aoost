import { Puck } from "@puckeditor/core";
import { useEffect, useRef, useState } from "react";
import { addSection, createSection, locate } from "../../model/page-ops";
import type { Section } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { InsertPanel } from "../insert/InsertPanel";
import { LibraryPanel } from "../ui/LibraryPanel";
import { FontsPanel } from "../ui/FontsPanel";
import { LayersPanel } from "../ui/LayersPanel";
import { MediaLibrary } from "../ui/MediaLibrary";
import { NavPanel } from "../ui/NavPanel";
import { PagesPanel } from "../ui/PagesPanel";
import { ThemePanel } from "../ui/ThemePanel";
import {
  closeFlyout,
  togglePanel,
  togglePinned,
  useRail,
  type PanelId,
} from "./rail-store";

const PANEL_TITLES: Record<PanelId, string> = {
  layers: "Layers",
  pages: "Pages",
  insert: "Insert",
  media: "Media",
  nav: "Navigation",
  theme: "Theme",
  fonts: "Fonts",
  global: "Global",
};

const KINDS: { kind: Section["kind"]; label: string; hint: string }[] = [
  { kind: "flow", label: "Section", hint: "Blocks stacked in a column" },
  { kind: "grid", label: "Grid section", hint: "Blocks in columns" },
  { kind: "canvas", label: "Free-layout section", hint: "Place layers anywhere" },
];

/** "+ Add section" at the foot of the layers list: after the selected section, or at the end. */
export function AddSection() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const add = (kind: Section["kind"]) => {
    setOpen(false);
    const page = currentPage(getState());
    const at = getState().selection[0] ? locate(page, getState().selection[0]!) : null;
    const index = at && at.kind !== "overlay" ? page.sections.indexOf(at.section) + 1 : page.sections.length;
    const section = createSection(kind);
    updatePage(page.id, (p) => addSection(p, section, index), "Add section");
    selectBlock(section.id);
  };
  return (
    <div className="ed-addsection" ref={box}>
      {open ? (
        <ul className="ed-menu ed-menu-up" role="menu" aria-label="Add a section">
          {KINDS.map((k) => (
            <li key={k.kind} role="none">
              <button type="button" role="menuitem" onClick={() => add(k.kind)}>
                <span>{k.label}</span>
                <small>{k.hint}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="ed-dashed" aria-expanded={open} onClick={() => setOpen(!open)}>
        + Add section
      </button>
    </div>
  );
}

const RailIcon = ({ id }: { id: PanelId }) => {
  switch (id) {
    case "layers":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 4.5L8 1.5l6 3-6 3-6-3zM2 8.5l6 3 6-3M2 12.5l6 3 6-3" />
        </svg>
      );
    case "pages":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
          <path d="M9 2v4h4" />
        </svg>
      );
    case "insert":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 2.5v11M2.5 8h11" />
        </svg>
      );
    case "media":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
          <circle cx="5.5" cy="6" r="1.2" fill="currentColor" />
          <path d="M2 11.5l3.5-3.5 3 3 2.5-2.5 3 3" />
        </svg>
      );
    case "nav":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
          <path d="M3 4.5h10M3 8h10M3 11.5h10" />
        </svg>
      );
    case "theme":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
          <circle cx="10.5" cy="6.5" r="1" fill="currentColor" />
          <circle cx="8" cy="11" r="1" fill="currentColor" />
        </svg>
      );
    case "fonts":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
          <path d="M3 4h10M8 4v9M5.5 13h5" />
        </svg>
      );
    case "global":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <ellipse cx="8" cy="8" rx="2.5" ry="6" strokeWidth="1.1" />
          <path d="M2 8h12" strokeWidth="1.1" />
        </svg>
      );
  }
};

const PinIcon = ({ pinned }: { pinned: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill={pinned ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ transform: pinned ? "rotate(0deg)" : "rotate(35deg)", transition: "transform 140ms ease" }}
  >
    <path d="M9.5 2.5l4 4M8 4L3.5 8.5 7.5 12.5 12 8 8 4zM3.5 8.5L1.5 14.5l6-2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const TOP_PANELS: PanelId[] = ["layers", "pages", "insert", "media"];
const BOTTOM_PANELS: PanelId[] = ["nav", "theme", "fonts", "global"];

/**
 * Direction B left panel: a slim 36px frosted rail and floating flyouts beside it.
 */
export function LeftPanel() {
  const active = useRail((s) => s.active);
  const pinned = useRail((s) => s.pinned);
  const pageId = useEditor((s) => s.pageId);

  const renderPanelButton = (id: PanelId) => {
    const isSelected = active === id;
    const title = PANEL_TITLES[id];
    return (
      <button
        key={id}
        type="button"
        className={`ed-rail-btn${isSelected ? " is-active" : ""}`}
        aria-label={title}
        aria-pressed={isSelected}
        title={title}
        onClick={() => togglePanel(id)}
      >
        <RailIcon id={id} />
      </button>
    );
  };

  return (
    <>
      <nav className="ed-rail" aria-label="Editor panels">
        <div className="ed-rail-group">
          {TOP_PANELS.map(renderPanelButton)}
        </div>
        <span className="ed-rail-divider" aria-hidden="true" />
        <div className="ed-rail-group">
          {BOTTOM_PANELS.map(renderPanelButton)}
        </div>
      </nav>

      {active ? (
        <aside
          className={`ed-flyout${pinned ? " is-pinned" : ""}`}
          aria-label={PANEL_TITLES[active]}
          data-panel={active}
        >
          <header className="ed-flyout-head">
            <strong className="ed-flyout-title">{PANEL_TITLES[active]}</strong>
            <div className="ed-flyout-actions">
              <button
                type="button"
                className={`ed-mini ed-pin-btn${pinned ? " is-pinned" : ""}`}
                aria-label={pinned ? "Unpin flyout" : "Pin flyout"}
                aria-pressed={pinned}
                title={pinned ? "Unpin flyout (auto-close on canvas click)" : "Pin flyout (keep open)"}
                onClick={togglePinned}
              >
                <PinIcon pinned={pinned} />
              </button>
              <button
                type="button"
                className="ed-mini"
                aria-label="Close flyout"
                title="Close (Esc)"
                onClick={closeFlyout}
              >
                <CloseIcon />
              </button>
            </div>
          </header>
          <div className="ed-flyout-body">
            {active === "layers" ? (
              <>
                <LayersPanel key={pageId} />
                <AddSection />
              </>
            ) : null}
            {active === "pages" ? <PagesPanel /> : null}
            {active === "insert" ? <InsertPanel /> : null}
            {active === "media" ? (
              <div className="ed-panel ed-theme">
                <MediaLibrary compact />
              </div>
            ) : null}
            {active === "nav" ? (
              <div className="ed-panel ed-theme">
                <NavPanel />
              </div>
            ) : null}
            {active === "theme" ? (
              <div className="ed-panel ed-theme">
                <ThemePanel />
              </div>
            ) : null}
            {active === "fonts" ? (
              <div className="ed-panel ed-theme">
                <FontsPanel />
              </div>
            ) : null}
            {active === "global" ? (
              <LibraryPanel mode="globals" />
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
