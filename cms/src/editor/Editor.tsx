import { blocksPlugin, Puck, type Plugin } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { deepEqual } from "../responsive/resolve";
import { DESIGN_WIDTH } from "../schema";
import "./editor.css";
import { pageToPuck, puckToPage, type PuckData } from "./puck/adapter";
import { puckConfig } from "./puck/config";
import { markFromPuck } from "./puck/PuckSync";
import { currentPage, getState, redo, undo, updatePage, useEditor } from "./store";
import { GlobalPanel } from "./ui/GlobalPanel";
import { LayersPanel } from "./ui/LayersPanel";
import { LibraryPanel } from "./ui/LibraryPanel";
import { OverlayPanel } from "./ui/OverlayPanel";
import { PageSettings } from "./ui/PageSettings";
import { PagesPanel } from "./ui/PagesPanel";
import { ThemePanel } from "./ui/ThemePanel";
import { TopBar } from "./ui/TopBar";

const VIEWPORTS = [
  { width: DESIGN_WIDTH.desktop, height: "auto" as const, label: "Desktop", icon: "Monitor" as const },
  { width: DESIGN_WIDTH.mobile, height: "auto" as const, label: "Mobile", icon: "Smartphone" as const },
];

const PagesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 1.5h5.5L12.500 4.500V14.500H4z" />
  </svg>
);

const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2l6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3" />
  </svg>
);

const LibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <path d="M11.500 9.500v4M9.500 11.500h4" strokeLinecap="round" />
  </svg>
);

const ThemeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 2v12M8 2a6 6 0 0 1 0 12" fill="currentColor" fillOpacity=".25" />
  </svg>
);

/** The right-hand panel: overlay or global settings, page settings when nothing is selected, otherwise Puck's fields. */
function Fields({ children, itemSelector }: { children: ReactNode; itemSelector?: unknown }) {
  const overlayId = useEditor((s) => s.overlayId);
  const globalId = useEditor((s) => s.globalId);
  if (overlayId) return <OverlayPanel overlayId={overlayId} />;
  if (globalId) return <GlobalPanel globalId={globalId} />;
  // Nothing selected on the canvas: the panel is about the page itself.
  if (!itemSelector) return <PageSettings />;
  return <>{children}</>;
}

/** ⌘Z / ⇧⌘Z drive the editor's own undo stack (it also holds Claude's and panel edits). */
function useUndoKeys(doc: Document | undefined) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const el = doc.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.shiftKey) redo();
      else undo();
    };
    doc.addEventListener("keydown", onKey, true);
    return () => doc.removeEventListener("keydown", onKey, true);
  }, [doc]);
}

/** Runs inside the preview iframe: load the site's fonts and forward undo keys. */
function Frame({ children, document: doc }: { children: ReactNode; document?: Document }) {
  const fonts = useEditor((s) => s.site.theme.googleFonts);
  useUndoKeys(doc);
  useEffect(() => {
    if (!doc || !fonts.length) return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
    doc.head.appendChild(link);
    doc.documentElement.classList.add("js");
    return () => link.remove();
  }, [doc, fonts]);
  return <>{children}</>;
}

export function Editor() {
  const pageId = useEditor((s) => s.pageId);
  const bp = useEditor((s) => s.bp);
  useUndoKeys(document);

  // Initial data per page; later store changes reach Puck through <PuckSync>.
  const initial = useMemo(() => pageToPuck(currentPage(getState())), [pageId]);
  const pendingLabel = useRef<{ label: string; merge?: string } | null>(null);

  const plugins = useMemo<Plugin[]>(
    () => [
      { name: "pages", label: "Pages", icon: <PagesIcon />, render: () => <PagesPanel /> },
      blocksPlugin({ label: "Add" }),
      { name: "outline", label: "Layers", icon: <LayersIcon />, render: () => <LayersPanel /> },
      { name: "library", label: "Library", icon: <LibraryIcon />, render: () => <LibraryPanel /> },
      { name: "theme", label: "Theme", icon: <ThemeIcon />, render: () => <ThemePanel /> },
    ],
    [],
  );

  return (
    <Puck
      key={pageId}
      config={puckConfig}
      data={initial as never}
      plugins={plugins}
      viewports={VIEWPORTS}
      iframe={{ enabled: true, waitForStyles: false }}
      ui={{
        viewports: { current: { width: DESIGN_WIDTH[bp], height: "auto" }, controlsVisible: false, options: VIEWPORTS },
        plugin: { current: "pages" },
      }}
      overrides={{
        header: () => <TopBar />,
        iframe: Frame,
        fields: Fields,
      }}
      onAction={(action) => {
        if (action.type === "insert") pendingLabel.current = { label: `Add ${action.componentType}` };
        else if (action.type === "remove") pendingLabel.current = { label: "Delete" };
        else if (action.type === "duplicate") pendingLabel.current = { label: "Duplicate" };
        else if (action.type === "move" || action.type === "reorder") pendingLabel.current = { label: "Move" };
        else if (action.type === "replace") pendingLabel.current = { label: "Edit", merge: `edit:${action.destinationZone}:${action.destinationIndex}` };
      }}
      onChange={(data) => {
        const page = currentPage(getState());
        const next = puckToPage(data as unknown as PuckData, page);
        if (deepEqual(next.sections, page.sections)) return;
        const step = pendingLabel.current ?? { label: "Edit" };
        pendingLabel.current = null;
        markFromPuck(next);
        updatePage(page.id, () => next, step.label, { merge: step.merge });
      }}
    />
  );
}
