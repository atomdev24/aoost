import { Puck } from "@puckeditor/core";
import { useEffect, useRef, useState } from "react";
import { addSection, createSection, locate } from "../../model/page-ops";
import type { Section } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { LayersPanel } from "../ui/LayersPanel";
import { CommentsPanel, FontsPanel, HistoryPanel, InsertPanel, LibraryPanel, MediaLibrary, NavPanel, PagesPanel, ThemePanel } from "../parts";
import type { Part } from "../lazy";
import {
  closeFlyout,
  getRailState,
  RAIL_HOME,
  railLayout,
  setRailPos,
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
  comments: "Comments",
  history: "History",
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
    case "comments":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 2.5a5.5 5 0 1 1-3.2 9.1L2.5 13l.9-2.6A5 5 0 0 1 8 2.5z" />
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
    case "history":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
          <path d="M2.2 2.5v2.6h2.6M8 5v3.2l2.2 1.4" />
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

/** The panels that load after the board: hovering a rail button starts loading its panel. */
const PANEL_PARTS: Partial<Record<PanelId, Part<never>>> = {
  pages: PagesPanel as Part<never>,
  history: HistoryPanel as Part<never>,
  insert: InsertPanel as Part<never>,
  media: MediaLibrary as Part<never>,
  comments: CommentsPanel as Part<never>,
  nav: NavPanel as Part<never>,
  theme: ThemePanel as Part<never>,
  fonts: FontsPanel as Part<never>,
  global: LibraryPanel as Part<never>,
};

/* Build (what is on this page) above the line, Site (what every page shares) below it. */
const TOP_PANELS: PanelId[] = ["layers", "insert", "media", "comments", "history"];
const BOTTOM_PANELS: PanelId[] = ["pages", "nav", "theme", "fonts", "global"];

/**
 * Direction B left panel: a slim 36px frosted rail and floating flyouts beside it.
 */
export function LeftPanel() {
  const active = useRail((s) => s.active);
  const pinned = useRail((s) => s.pinned);
  const pos = useRail((s) => s.pos);
  const pageId = useEditor((s) => s.pageId);
  const railRef = useRef<HTMLElement>(null);
  const [win, setWin] = useState(() => ({ w: innerWidth, h: innerHeight }));
  const [railH, setRailH] = useState(330);
  useEffect(() => {
    const onResize = () => setWin({ w: innerWidth, h: innerHeight });
    addEventListener("resize", onResize);
    const ro = railRef.current ? new ResizeObserver(() => setRailH(railRef.current?.offsetHeight ?? 330)) : null;
    if (railRef.current) ro?.observe(railRef.current);
    return () => {
      removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, []);
  // Phones keep their own layout; on a desktop the rail can be dragged anywhere by its grip.
  const movable = win.w >= 768;
  const place = movable ? railLayout(pos, win.w, win.h, railH) : null;
  const [dragging, setDragging] = useState(false);

  const startDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !place) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, rx: place.x, ry: place.y };
    let moved = false;
    const move = (m: PointerEvent) => {
      const dx = m.clientX - start.x;
      const dy = m.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) setDragging(true);
      moved = true;
      setRailPos({ x: start.rx + dx, y: start.ry + dy });
    };
    const up = () => {
      setDragging(false);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      // Settle where it's drawn (snapped and kept on screen), or home when it ends up there.
      const p = getRailState().pos;
      if (p) {
        const settled = railLayout(p, innerWidth, innerHeight, railRef.current?.offsetHeight ?? 330);
        setRailPos(settled.x === RAIL_HOME.x && settled.y <= RAIL_HOME.y + 4 ? null : { x: settled.x, y: settled.y });
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const nudge = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!place) return;
    const step = e.shiftKey ? 40 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setRailPos({ x: place.x + d[0]!, y: place.y + d[1]! });
  };

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
        onPointerEnter={() => void PANEL_PARTS[id]?.prefetch()}
      >
        <RailIcon id={id} />
      </button>
    );
  };

  return (
    <>
      <nav ref={railRef} className={`ed-rail${dragging ? " is-dragging" : ""}${place && place.side !== "left" ? " is-moved" : ""}`} aria-label="Editor panels" style={place && pos ? { left: place.x, top: place.y } : undefined}>
        {movable ? (
          <button
            type="button"
            className="ed-rail-grip"
            aria-label="Move the panel bar (drag, or arrow keys; double-click to put it back)"
            title="Drag to move · double-click to put back"
            onPointerDown={startDrag}
            onDoubleClick={() => setRailPos(null)}
            onKeyDown={nudge}
          >
            <svg width="14" height="6" viewBox="0 0 14 6" fill="currentColor" aria-hidden="true">
              {[2, 7, 12].flatMap((x) => [1.5, 4.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />))}
            </svg>
          </button>
        ) : null}
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
          data-side={place?.side ?? "left"}
          style={place && pos ? { left: place.flyoutX, top: place.flyoutY, maxHeight: `calc(100dvh - ${place.flyoutY + 10}px)` } : undefined}
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
            {active === "history" ? <HistoryPanel /> : null}
            {active === "comments" ? <CommentsPanel /> : null}
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
