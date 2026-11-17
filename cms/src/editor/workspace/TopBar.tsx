import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { PuckSync } from "../puck/PuckSync";
import { currentPage, flush, megaItemId, redo, setPage, setUnpublished, undo, useEditor } from "../store";
import { ClaudePill } from "./ClaudePill";
import { PageSwitcher } from "./PageSwitcher";
import { ToolGroup } from "./ToolGroup";

/** "just now", "2 min ago", "at 14:05". */
function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `at ${new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const Icon = ({ d }: { d: string }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** The 52px top bar: site mark, page switcher and save state · tools · Claude, Preview, Publish. */
export function TopBar() {
  const save = useEditor((s) => s.save);
  const saveError = useEditor((s) => s.saveError);
  const savedAt = useEditor((s) => s.savedAt);
  const unpublished = useEditor((s) => s.unpublished);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const lastLabel = useEditor((s) => s.lastLabel);
  const live = useEditor((s) => s.live);
  const page = useEditor(currentPage);
  const returnPageId = useEditor((s) => s.returnPageId);
  const editingMenu = !!megaItemId(page.id);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const now = useNow(20_000);
  const remote = lastLabel && /^(Claude|Another window): /.test(lastLabel) ? lastLabel : null;

  const status =
    save === "error"
      ? `Not saved: ${saveError}`
      : save === "saving"
        ? "Draft · saving…"
        : !unpublished
          ? "Published · no changes"
          : savedAt
            ? `Draft · saved ${ago(savedAt, now)}`
            : "Draft · unpublished changes";

  const preview = async () => {
    await flush();
    window.open(`/preview${editingMenu || page.slug === "/" ? "/" : page.slug}`, "aoost-preview");
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
      <div className="ed-top-left">
        <span className="ed-mark" aria-label="aoost editor" role="img">
          a
        </span>
        <PageSwitcher />
        {editingMenu ? (
          <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" onClick={() => returnPageId && setPage(returnPageId)}>
            Done editing menu panel
          </button>
        ) : null}
        <span className={`ed-status${save === "error" ? " ed-status-error" : ""}`} role="status" title={lastLabel ?? undefined}>
          {notice ?? remote ?? status}
        </span>
        <span className={`ed-live${live ? " is-on" : ""}`} title={live ? "Live: changes from Claude appear here as they happen" : "Reconnecting to live sync…"} aria-label={live ? "Live sync connected" : "Live sync reconnecting"} role="img" />
        <span className="ed-history">
          <button type="button" className="ed-icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">
            <Icon d="M5 3L2 6l3 3M2 6h7.5a4 4 0 0 1 0 8H7" />
          </button>
          <button type="button" className="ed-icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
            <Icon d="M11 3l3 3-3 3M14 6H6.500a4 4 0 0 0 0 8H9" />
          </button>
        </span>
      </div>
      <ToolGroup />
      <div className="ed-top-actions">
        <ClaudePill />
        <button type="button" className="ed-btn" onClick={preview}>
          Preview
        </button>
        <button type="button" className="ed-btn ed-btn-accent" onClick={publish} disabled={publishing || (!unpublished && save !== "error")}>
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </div>
    </header>
  );
}
