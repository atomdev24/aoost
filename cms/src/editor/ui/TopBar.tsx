import { useState } from "react";
import { DESIGN_WIDTH, type Breakpoint } from "../../schema";
import { api, ApiError } from "../api";
import { PuckSync } from "../puck/PuckSync";
import { usePuck } from "../puck/usePuck";
import { currentPage, flush, redo, setUnpublished, undo, useEditor } from "../store";
import { Button } from "./kit";

const SunMark = () => (
  <svg width="22" height="22" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="15" cy="15" r="4.5" />
    <path d="M15 2.5v6M15 21.5v6M2.5 15h6M21.5 15h6M6.2 6.2l4.2 4.2M19.6 19.6l4.2 4.2M23.8 6.2l-4.2 4.2M10.4 19.6l-4.2 4.2" />
  </svg>
);

export function TopBar() {
  const dispatch = usePuck((s) => s.dispatch);
  const bp = useEditor((s) => s.bp);
  const save = useEditor((s) => s.save);
  const saveError = useEditor((s) => s.saveError);
  const unpublished = useEditor((s) => s.unpublished);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const lastLabel = useEditor((s) => s.lastLabel);
  const page = useEditor(currentPage);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const setBp = (next: Breakpoint) =>
    dispatch({ type: "setUi", ui: (ui) => ({ viewports: { ...ui.viewports, current: { width: DESIGN_WIDTH[next], height: "auto" } } }) });

  const status = save === "error" ? `Not saved: ${saveError}` : save === "saving" ? "Saving…" : unpublished ? "Unpublished changes" : "All changes published";

  const preview = async () => {
    await flush();
    window.open(`/preview${page.slug === "/" ? "/" : page.slug}`, "aoost-preview");
  };

  const publish = async () => {
    setPublishing(true);
    setNotice(null);
    try {
      if (!(await flush())) throw new Error("Fix the save error first.");
      const result = await api.publish();
      setUnpublished(false);
      setNotice(result.commit ? "Published. The site rebuilds in about a minute." : "Nothing new to publish.");
      setTimeout(() => setNotice(null), 6000);
    } catch (e) {
      setNotice(e instanceof ApiError || e instanceof Error ? e.message : "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <header className="ed-top">
      <PuckSync />
      <div className="ed-brand">
        <SunMark />
        <strong>aoost</strong>
        <span>/ Editor</span>
      </div>
      <div className="ed-seg ed-seg-lg" role="group" aria-label="Breakpoint">
        <button type="button" aria-pressed={bp === "desktop"} onClick={() => setBp("desktop")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
            <path d="M5.5 14h5" />
          </svg>
          Desktop
        </button>
        <button type="button" aria-pressed={bp === "mobile"} onClick={() => setBp("mobile")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="4" y="1.5" width="8" height="13" rx="1.5" />
            <path d="M7 12.5h2" />
          </svg>
          Mobile
        </button>
      </div>
      <div className="ed-top-actions">
        <span className={`ed-status${save === "error" ? " ed-status-error" : ""}`} role="status" title={lastLabel ?? undefined}>
          {notice ?? status}
        </span>
        <button type="button" className="ed-icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 3L2 6l3 3M2 6h7.5a4 4 0 0 1 0 8H7" />
          </svg>
        </button>
        <button type="button" className="ed-icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 3l3 3-3 3M14 6H6.500a4 4 0 0 0 0 8H9" />
          </svg>
        </button>
        <Button onClick={preview}>Preview</Button>
        <Button variant="accent" onClick={publish} disabled={publishing || (!unpublished && save !== "error")}>
          {publishing ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </header>
  );
}
