import { setMode, useMode, useSimple } from "./mode";
import { AgentPill } from "../agent/AgentPill";
import { createPortal } from "react-dom";
import { TeamModal } from "../team/TeamModal";

import { useCan } from "../team/role";
import { addTranslation, languageName, siteLanguages, translatable } from "../../model/i18n";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import { activateBreakpoint } from "../board/bridge";
import { setFrameHidden, toggleFrameHidden, useBoard } from "../board/store";
import { PuckSync } from "../puck/PuckSync";
import { BREAKPOINT_LABEL, DESIGN_WIDTH, type Breakpoint } from "../../schema";
import { currentPage, flush, megaItemId, redo, setLang, setPage, undo, update, useEditor } from "../store";
import { loadPublished, openSheet, publish, usePublish } from "./publish";
import { PublishMenu, ReleaseChip } from "./Release";
import { Preflight } from "./Preflight";
import { loadStaging, useStaging } from "./staging";
import { useChanges } from "./changes-count";
import { DEMO } from "../demo";
import { Avatars, DemoBar, PublishSheet } from "../parts";
import { StatusPill } from "./StatusPill";
import { PageSwitcher } from "./PageSwitcher";
import { ToolGroup } from "./ToolGroup";
import { openPalette } from "../commands/palette-store";
import { openProblemLog, openReport } from "../problems";
import { setGlass, useGlass } from "../display";
// Opened now and then: loads on first use.
const DemoModal = lazy(() => import("../team/DemoModal").then((m) => ({ default: m.DemoModal })));
const InsightsModal = lazy(() => import("../insights/InsightsModal").then((m) => ({ default: m.InsightsModal })));

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
  const canPublish = useCan("publish");
  const canPromote = useCan("promote");
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
  const simple = useSimple();
  const now = useNow(20_000);
  // Claude has its own pill (agent/AgentPill); this line is for edits from another window.
  const remote = lastLabel && /^Another window: /.test(lastLabel) ? lastLabel : null;
  const phase = usePublish((p) => p.phase);
  const changes = useChanges();
  useEffect(() => void loadPublished(), []);
  useEffect(() => void loadStaging(), []);
  const staged = useStaging((st) => !!st.info);
  const sheetOpen = usePublish((st) => st.sheet);
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
        {/* Phones open the palette from here (⌘K on a keyboard). */}
        <button type="button" className="ed-icon ed-phone-only ed-search-btn" aria-label="Search and commands" title="Search and commands (⌘K)" onClick={openPalette}>
          <Icon d="M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 10.5L14 14" />
        </button>
        <PageSwitcher />
        <LangSwitch />
        {editingMenu ? (
          <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" onClick={() => returnPageId && setPage(returnPageId)}>
            Done editing menu panel
          </button>
        ) : null}
        <StatusPill
          save={save === "error" ? "error" : save === "saving" ? "saving" : "saved"}
          saveTitle={saveTitle}
          savedText={savedAt ? ago(savedAt, now) : "All saved"}
          count={count}
          live={live}
        />
        {notice || remote ? (
          <span className="ed-status" role="status" title={lastLabel ?? undefined}>
            {notice ?? remote}
          </span>
        ) : null}
        <ModeSwitch />
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
          {ISLAND_ORDER.filter((b) => !simple || b === "desktop" || b === "mobile" || b === bp).map((b) => (
            <button
              key={b}
              type="button"
              className={`ed-tool-bp${bp === b ? " is-active" : ""}${hidden[b] ? " is-hidden" : ""}`}
              data-short={SHORT[b]}
              aria-label={BREAKPOINT_LABEL[b]}
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

      {/* Claude at work: its own pill, centred under the top bar so it never crowds the controls. */}
      <div className="ed-agent-dock">
        <AgentPill />
      </div>

      {/* Right island: Claude status pill, Preview, Discard draft, Publish */}
      <div className="ed-island ed-island-right" role="toolbar" aria-label="Publishing and preview">
        {DEMO ? <DemoBar /> : null}
        <Avatars />
        <Preflight />
        <button type="button" className="ed-btn ed-desk-only" onClick={preview}>
          Preview
        </button>
        {staged ? (
          <button type="button" className="ed-btn ed-staging-chip ed-desk-only" title="Something is in staging: share it or push it to production" onClick={openSheet}>
            Staging
          </button>
        ) : null}
        <ReleaseChip canPromote={canPromote} />
        {canPublish ? (
          <span className="ed-publish-group">
            <PublishButton phase={phase} count={count} disabled={!unpublished && save !== "error" && phase === "idle"} />
            <PublishMenu canPromote={canPromote} />
          </span>
        ) : (
          <span className="ed-viewonly" title="You can look around and leave comments. Ask an owner (… → Team) for the Editor role to make changes.">
            View only · you can comment
          </span>
        )}
        <MoreMenu canDiscard={unpublished} onDiscard={discard} onPreview={() => void preview()} />
        {sheetOpen ? <PublishSheet /> : null}
      </div>
    </header>
  );
}

/** Simple / Full (direction B): what this person sees. Remembered per person. */
function ModeSwitch() {
  const mode = useMode();
  return (
    <div className="ed-seg ed-mode-switch ed-desk-only" role="radiogroup" aria-label="Editing mode" title="Simple: words and pictures. Full: style, layout and screen sizes too.">
      <button type="button" role="radio" aria-checked={mode === "simple"} onClick={() => setMode("simple")}>
        Simple
      </button>
      <button type="button" role="radio" aria-checked={mode === "full"} onClick={() => setMode("full")}>
        Full
      </button>
    </div>
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
  // The count sits in the button (one number, not a second badge); the status pill lists them.
  const n = count && phase === "idle" ? count : null;
  return (
    <span className={`ed-publish is-${phase}`} onPointerEnter={() => void PublishSheet.prefetch()}>
      <button type="button" className="ed-btn ed-btn-accent ed-pill ed-publish-btn" onClick={() => void publish()} disabled={busy || (disabled && phase !== "error")} aria-live="polite">
        {busy ? <span className="ed-spinner" aria-hidden="true" /> : phase === "live" ? <span aria-hidden="true">✓</span> : null}
        {label}
        {n ? (
          <span className="ed-publish-n" aria-label={`, ${n} ${n === 1 ? "change" : "changes"}`}>
            {n}
          </span>
        ) : null}
      </button>
      {phase === "error" ? (
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
  const [teamOpen, setTeamOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const glass = useGlass();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className="ed-more" ref={box}>
      {teamOpen ? createPortal(<TeamModal onClose={() => setTeamOpen(false)} />, document.body) : null}
      {demoOpen ? createPortal(<Suspense fallback={null}><DemoModal onClose={() => setDemoOpen(false)} /></Suspense>, document.body) : null}
      {insightsOpen ? createPortal(<Suspense fallback={null}><InsightsModal onClose={() => setInsightsOpen(false)} /></Suspense>, document.body) : null}
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
              onClick={() => {
                setOpen(false);
                setTeamOpen(true);
              }}
            >
              Team…
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setInsightsOpen(true);
              }}
            >
              Visitor insights…
            </button>
          </li>
          {DEMO ? null : (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setDemoOpen(true);
                }}
              >
                Demo editor…
              </button>
            </li>
          )}
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
          <li role="none">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={glass}
              title="The blurred see-through toolbars. Off by default in Chrome, where the blur can flicker while zooming."
              onClick={() => setGlass(!glass)}
            >
              {glass ? "✓ " : ""}Glass toolbars
            </button>
          </li>
          <li role="separator" className="ed-menu-sep" />
          <li role="none">
            <button
              type="button"
              role="menuitem"
              title="Tell Claude what went wrong; the editor attaches what it saw"
              onClick={() => {
                setOpen(false);
                openReport();
              }}
            >
              Report a problem…
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openProblemLog();
              }}
            >
              Problem log
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}


/**
 * EN · ES: which language the open page is edited in (only when the site has more than one).
 * Picking a language the page doesn't have yet starts a draft of it.
 */
function LangSwitch() {
  const site = useEditor((s) => s.site);
  const lang = useEditor((s) => s.lang);
  const page = useEditor((s) => s.site.pages.find((p) => p.id === s.pageId));
  const langs = siteLanguages(site);
  if (langs.length < 2 || !page || !translatable(page)) return null;
  const main = langs[0]!;
  const active = lang && page.translations?.[lang] ? lang : main;
  return (
    <div className="ed-langs" role="group" aria-label="Language">
      {langs.map((l) => {
        const t = l === main ? null : page.translations?.[l];
        return (
          <button
            key={l}
            type="button"
            aria-pressed={active === l}
            title={l === main ? `Edit in ${languageName(l)}` : t ? `Edit the ${languageName(l)} version (${t.status === "published" ? "live" : "draft"})` : `Start a ${languageName(l)} version of this page`}
            onClick={() => {
              if (l !== main && !t) update((s) => ({ ...s, pages: s.pages.map((p) => (p.id === page.id ? addTranslation(p, l) : p)) }), `Start the ${languageName(l)} version of ${page.title}`);
              setLang(l === main ? null : l);
            }}
          >
            {l.toUpperCase()}
            {t && t.status !== "published" ? <i aria-label="draft" /> : null}
          </button>
        );
      })}
    </div>
  );
}
