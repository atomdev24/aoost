import { blocksPlugin, outlinePlugin, Puck, type Plugin } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { deepEqual } from "../responsive/resolve";
import { DESIGN_WIDTH } from "../schema";
import "./editor.css";
import { pageToPuck, puckToPage, type PuckData } from "./puck/adapter";
import { puckConfig } from "./puck/config";
import { markFromPuck } from "./puck/PuckSync";
import { currentPage, getState, redo, undo, updatePage, useEditor } from "./store";
import { PagesPanel } from "./ui/PagesPanel";
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
      outlinePlugin({ label: "Layers" }),
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
