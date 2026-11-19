import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import { activateBreakpoint } from "../board/bridge";
import { setFrameHidden, toggleFrameHidden, useBoard } from "../board/store";
import { PuckSync } from "../puck/PuckSync";
import { BREAKPOINT_LABEL, DESIGN_WIDTH, type Breakpoint } from "../../schema";
import { currentPage, flush, megaItemId, redo, setPage, undo, useEditor } from "../store";
import { ClaudePill } from "./ClaudePill";
import { loadPublished, openSheet, publish, usePublish } from "./publish";
import { PublishSheet, useChanges } from "./PublishSheet";
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

/** Widest first, as the frames sit on the board. */
const ISLAND_ORDER: Breakpoint[] = ["widescreen", "desktop", "tablet", "mobile"];
/** Short labels for the phone's top bar. */
const SHORT: Record<Breakpoint, string> = { widescreen: "Wide", desktop: "Desk", tablet: "Tab", mobile: "Mob" };

/** Three floating islands over the canvas: left (mark, page, save), centre (tools, breakpoints), right (Claude, preview, publish). */
export function TopBar() {
  const save = useEditor((s) => s.save);
  const saveError = useEditor((s) => s.saveError);
  const savedAt = useEditor((s) => s.savedAt);
  const unpublished = useEditor((s) => s.unpublished);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const lastLabel = useEditor((s) => s.lastLabel);
  const live = useEditor((s) => s.live);
  const bp = useEditor((s) => s.bp);
  const hidden = useBoard((s) => s.hidden);
  const page = useEditor(currentPage);
  const returnPageId = useEditor((s) => s.returnPageId);
  const editingMenu = !!megaItemId(page.id);
  const [notice, setNotice] = useState<string | null>(null);
  const now = useNow(20_000);
  const remote = lastLabel && /^(Claude|Another window): /.test(lastLabel) ? lastLabel : null;
  const phase = usePublish((p) => p.phase);
  const changes = useChanges();
  useEffect(() => void loadPublished(), []);
  // Once a publish lands (here, or in another window), what is live changes.
  useEffect(() => {
    if (!unpublished) void loadPublished();
  }, [unpublished]);
  const count = unpublished ? (changes?.count ?? null) : 0;

  const lastSaved = savedAt ? `Last saved ${ago(savedAt, now)}` : "No changes saved in this session yet";
  const saveTitle = save === "error" ? `Not saved: ${saveError}. ${lastSaved}.` : save === "saving" ? `Saving… ${lastSaved}.` : `Saved. ${lastSaved}.`;

  const preview = async () => {
    await flush();
    window.open(`/preview${editingMenu || page.slug === "/" ? "/" : page.slug}`, "aoost-preview");
  };

  const discard = async () => {
    if (!window.confirm("Discard the draft and reload exactly what is live on alexoostendurp.com? Unpublished changes on every page will be lost.")) return;
    setNotice("Discarding draft…");
    try {
      await api.reset();
      window.location.reload();
    } catch (e) {
      setNotice(e instanceof ApiError || e instanceof Error ? e.message : "Couldn't discard the draft.");
    }
  };

  return (
    <header className="ed-islands ed-top">
      <PuckSync />
      {/* Left island: site mark, page switcher, save state */}
      <div className="ed-island ed-island-left" role="region" aria-label="Page and save status">
        <span className="ed-mark" aria-label="aoost editor" role="img">
          a
        </span>
        <PageSwitcher />
        {editingMenu ? (
          <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" onClick={() => returnPageId && setPage(returnPageId)}>
            Done editing menu panel
          </button>
        ) : null}
        <span className="ed-savedot" data-state={save === "error" ? "error" : save === "saving" ? "saving" : "saved"} role="img" aria-label={saveTitle} title={saveTitle} />
        {notice || remote ? (
          <span className="ed-status" role="status" title={lastLabel ?? undefined}>
            {notice ?? remote}
          </span>
        ) : null}
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

      {/* Centre island: segmented tool group, hairline divider, breakpoint buttons */}
      <div className="ed-island ed-island-center" role="toolbar" aria-label="Tools and breakpoints">
        <ToolGroup />
        <span className="ed-island-divider" aria-hidden="true" />
        <div className="ed-island-bps" role="group" aria-label="Breakpoints">
          {ISLAND_ORDER.map((b) => (
            <button
              key={b}
              type="button"
              className={`ed-tool-bp${bp === b ? " is-active" : ""}${hidden[b] ? " is-hidden" : ""}`}
              data-short={SHORT[b]}
              aria-pressed={bp === b}
              title={`${BREAKPOINT_LABEL[b]} (${DESIGN_WIDTH[b]}px). ${hidden[b] ? "Click to show and edit." : "Shift-click to hide."}`}
              onClick={(e) => {
                if (e.shiftKey) toggleFrameHidden(b);
                else {
                  setFrameHidden(b, false);
                  activateBreakpoint(b);
                }
              }}
            >
              {BREAKPOINT_LABEL[b]}
            </button>
          ))}
        </div>
      </div>

      {/* Right island: Claude status pill, Preview, Discard draft, Publish */}
      <div className="ed-island ed-island-right" role="toolbar" aria-label="Publishing and preview">
        <ClaudePill />
        <button type="button" className="ed-btn ed-desk-only" onClick={preview}>
          Preview
        </button>
        <PublishButton phase={phase} count={count} disabled={!unpublished && save !== "error" && phase === "idle"} />
        <MoreMenu canDiscard={unpublished} onDiscard={discard} onPreview={() => void preview()} />
        <PublishSheet />
      </div>
    </header>
  );
}

/**
 * Publish, with its real stages: a spinner and "Saving…", then "Rebuilding…",
 * then a green "Live" for a few seconds. The badge counts unpublished changes;
 * clicking it opens the details sheet.
 */
function PublishButton({ phase, count, disabled }: { phase: string; count: number | null; disabled: boolean }) {
  const busy = phase === "github" || phase === "rebuilding";
  const label = phase === "github" ? "Saving…" : phase === "rebuilding" ? "Rebuilding…" : phase === "live" ? "Live" : "Publish";
  return (
    <span className={`ed-publish is-${phase}`}>
      <button type="button" className="ed-btn ed-btn-accent ed-pill ed-publish-btn" onClick={() => void publish()} disabled={busy || (disabled && phase !== "error")} aria-live="polite">
        {busy ? <span className="ed-spinner" aria-hidden="true" /> : phase === "live" ? <span aria-hidden="true">✓</span> : null}
        {label}
      </button>
      {count && phase === "idle" ? (
        <button type="button" className="ed-publish-badge" aria-label={`${count} unpublished ${count === 1 ? "change" : "changes"}: show details`} title="What will be published" onClick={openSheet}>
          {count}
        </button>
      ) : phase === "error" ? (
        <button type="button" className="ed-publish-badge is-error" aria-label="Publishing failed: show details" onClick={openSheet}>
          !
        </button>
      ) : null}
    </span>
  );
}

/** The right island's "…" menu: Discard draft lives here. */
function MoreMenu({ canDiscard, onDiscard, onPreview }: { canDiscard: boolean; onDiscard: () => void; onPreview: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className="ed-more" ref={box}>
      <button type="button" className="ed-icon ed-more-btn" aria-label="More" aria-haspopup="menu" aria-expanded={open} title="More" onClick={() => setOpen(!open)}>
        …
      </button>
      {open ? (
        <ul className="ed-menu ed-more-menu" role="menu" aria-label="More">
          {/* On a phone, Preview lives here to keep the top row short. */}
          <li role="none" className="ed-phone-only">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPreview();
              }}
            >
              Preview
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={!canDiscard}
              title={canDiscard ? "Throw away unpublished changes and reload what is live" : "Nothing to discard"}
              onClick={() => {
                setOpen(false);
                onDiscard();
              }}
            >
              Discard draft
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
