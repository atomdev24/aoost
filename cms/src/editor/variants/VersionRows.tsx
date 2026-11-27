import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { components } from "../../components/registry";
import { pageCss, PageBody } from "../../render/document";
import { changedIds, statusOf, STATUS_LABEL, versionsOf } from "../../model/variants";
import { BREAKPOINT_LABEL, type Breakpoint, type Page } from "../../schema";
import { activateBreakpoint } from "../board/bridge";
import { frameBaseCss, pinViewportUnits, SCREEN_HEIGHT, stillMotion } from "../board/frame-css";
import { passiveCss } from "../board/LiveFrame";
import { ZoomVar } from "../board/PuckFrame";
import { getBoard, setExtraFitRects, useBoard } from "../board/store";
import { isVisible, type FrameRect, type View } from "../board/viewport";
import { onBoardWheel } from "../board/wheel";
import { useOpenComments } from "./comment-count";
import { useEditor } from "../store";
import { attachFrameGestures } from "../touch/gestures";
import { usePhone } from "../touch/device";
import { closeUnpinnedFlyout } from "../workspace/rail-store";
import { openDesigns } from "../templates/designs-open";
import { newVariant, openVersion, propose, removeVariant, setVersionHidden, useVariantPrefs, voter, vote } from "./actions";
import { openPick } from "./pick-open";
import { renameVariant } from "../../model/variants";
import { update } from "../store";
import { CHANGED_CSS } from "./changed-css";
import { PlayButton } from "../play/PlayButton";
import { hiddenList, useMarks } from "../board/marks";
import { VersionStill } from "./VersionStill";
import "./variants.css";

/**
 * Variants side by side on the board (EDITOR-VARIANTS.md): to the right of the page being edited
 * (after its frames and the "add a screen size" card), every other
 * version of it (the page itself and its variants) draws as its own row of frames, one per screen
 * size shown. Click a row to edit that version; it takes the top row, where the camera already is.
 * Changed blocks are outlined in purple. Below the rows: "+ New variant".
 */

/** Space between one version's frames and the next version's. */
const COL_GAP = 320;
const LABEL_W = 220;

// Heights of each version's frames (pageId:bp), measured as they draw.
const heights = new Map<string, number>();
const hl = new Set<() => void>();
const setRowHeight = (id: string, bp: Breakpoint, h: number) => {
  const k = `${id}:${bp}`;
  if (Math.abs((heights.get(k) ?? 0) - h) < 2) return;
  heights.set(k, h);
  hl.forEach((l) => l());
};
let tick = 0;
hl.add(() => tick++);
const useHeights = () =>
  useSyncExternalStore(
    (l) => (hl.add(l), () => hl.delete(l)),
    () => tick,
  );

/** One other version: its frames sit at the open page's frames moved right by `dx`; hidden ones fold to a narrow strip. */
export type VersionRow = { page: Page; dx: number; h: number; hidden: boolean; w: number };
/** A folded version's strip on the board (board units). */
const FOLDED_W = 240;

/**
 * Where the other versions sit: to the right of the open page's frames (and of the "add a screen
 * size" card when it shows, `after`), one group of frames per version, in the group's order. When a
 * screen size is added or hidden, the frames' span changes and every version moves along with it.
 */
export function useVersionLayout(frames: FrameRect[], after = -Infinity): { group: Page[]; rows: VersionRow[]; top: number; left: number; right: number; span: number; end: number } {
  const site = useEditor((s) => s.site);
  const pageId = useEditor((s) => s.pageId);
  const prefs = useVariantPrefs();
  useHeights();
  const group = useMemo(() => versionsOf(site, pageId), [site, pageId]);
  const left = Math.min(...frames.map((f) => f.x));
  const right = Math.max(...frames.map((f) => f.x + f.w));
  const top = Math.min(...frames.map((f) => f.y));
  const span = right - left;
  let x = Math.max(right, after) + COL_GAP;
  const rows: VersionRow[] = [];
  if (prefs.rows !== "none")
    for (const p of group) {
      if (p.id === pageId) continue;
      if (prefs.rows === "proposed" && p.variantOf && statusOf(p) !== "proposed") continue;
      const h = Math.max(...frames.map((f) => heights.get(`${p.id}:${f.bp}`) ?? f.h));
      const hidden = prefs.hidden.includes(p.id);
      const w = hidden ? FOLDED_W : span;
      rows.push({ page: p, dx: x - left, h, hidden, w });
      x += w + COL_GAP;
    }
  return { group, rows, top, left, right, span, end: x - COL_GAP / 2 };
}

/** One version drawn at one screen size: read-only, same renderer as the live frames. */
function VersionFrame({ page, bp, x, y, w, visible, outline }: { page: Page; bp: Breakpoint; x: number; y: number; w: number; visible: boolean; outline: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const liveSite = useEditor((s) => s.site);
  const [site, setSite] = useState(liveSite);
  useEffect(() => {
    const t = setTimeout(() => setSite(liveSite), 300);
    return () => clearTimeout(t);
  }, [liveSite]);
  const origin = useRef({ x, y });
  origin.current = { x, y };
  const shown = useRef(visible);
  shown.current = visible;

  useEffect(() => {
    const frame = ref.current!;
    const ready = () => {
      const d = frame.contentDocument!;
      d.documentElement.lang = "en";
      d.documentElement.classList.add("js");
      setDoc(d);
    };
    if (frame.contentDocument?.readyState === "complete") ready();
    frame.addEventListener("load", ready);
    return () => frame.removeEventListener("load", ready);
  }, []);

  const fonts = useMemo(() => [...new Set([...site.theme.googleFonts, ...components.flatMap((c) => c.kit?.googleFonts ?? [])])], [site.theme.googleFonts]);
  useEffect(() => {
    if (!doc || !fonts.length) return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
    doc.head.appendChild(link);
    return () => link.remove();
  }, [doc, fonts]);

  useEffect(() => {
    if (!doc) return;
    const unstill = stillMotion(doc);
    const toBoard = (e: { clientX: number; clientY: number }) => {
      const { view } = getBoard();
      return { x: (origin.current.x + e.clientX) * view.zoom + view.x, y: (origin.current.y + e.clientY) * view.zoom + view.y };
    };
    const wheel = (e: WheelEvent) => onBoardWheel(e, toBoard(e));
    const click = (e: MouseEvent) => {
      e.preventDefault();
      let el = e.target as Element | null;
      let id: string | null = null;
      while (el && el.nodeType === 1 && !id) {
        if (el.classList.contains("n")) id = [...el.classList].find((c) => c.startsWith("n-"))?.slice(2) ?? null;
        else if (el.classList.contains("s") && el.id) id = el.id;
        el = el.parentElement;
      }
      openVersion(page.id);
      activateBreakpoint(bp, id);
    };
    doc.addEventListener("wheel", wheel, { passive: false });
    doc.addEventListener("click", click, true);
    doc.addEventListener("pointerdown", closeUnpinnedFlyout, true);
    const detachTouch = attachFrameGestures(doc, toBoard, () => []);
    const ro = new (doc.defaultView!.ResizeObserver)(() => {
      if (shown.current && doc.body.childElementCount) setRowHeight(page.id, bp, doc.documentElement.scrollHeight);
    });
    ro.observe(doc.body);
    return () => {
      unstill();
      detachTouch();
      doc.removeEventListener("wheel", wheel);
      doc.removeEventListener("click", click, true);
      doc.removeEventListener("pointerdown", closeUnpinnedFlyout, true);
      ro.disconnect();
    };
  }, [doc, page.id, bp]);

  const css = useMemo(() => pinViewportUnits(pageCss(site, page), SCREEN_HEIGHT[bp]), [site, page, bp]);
  const height = heights.get(`${page.id}:${bp}`) ?? 900;
  const stamp = useStamp([site, page, outline, height, hiddenList(useMarks())]);
  const changed = useMemo(() => (outline && page.variantOf ? changedIds(site, page) : []), [site, page, outline]);
  useEffect(() => {
    if (!doc || !visible) return;
    const want = new Set(changed.length ? doc.querySelectorAll(changed.flatMap((id) => [`.n-${CSS.escape(id)}`, `.s#${CSS.escape(id)}`]).join(",")) : []);
    doc.querySelectorAll("[data-ed-changed]").forEach((el) => !want.has(el) && el.removeAttribute("data-ed-changed"));
    want.forEach((el) => el.setAttribute("data-ed-changed", ""));
  });

  return (
    <div className="bd-frame vr-frame" data-bp={bp} style={{ left: x, top: y, width: w, height }}>
      <iframe ref={ref} className="bd-live" title={`${page.variantName ?? page.title}, ${BREAKPOINT_LABEL[bp]}`} tabIndex={-1} />
      <VersionStill doc={doc} ready={visible} stamp={stamp} bp={bp} pageId={page.id} />
      {doc && visible
        ? createPortal(
            <>
              <style>{css}</style>
              <style>{frameBaseCss + passiveCss + CHANGED_CSS}</style>
              <ZoomVar doc={doc} />
              <PageBody site={site} page={page} editing />
            </>,
            doc.body,
          )
        : null}
    </div>
  );
}


/** A number that goes up whenever one of `deps` changes (what a frame's picture shows). */
function useStamp(deps: unknown[]): number {
  const r = useRef({ deps, n: 0 });
  if (deps.length !== r.current.deps.length || deps.some((d, i) => d !== r.current.deps[i])) r.current = { deps, n: r.current.n + 1 };
  return r.current.n;
}

/** The rows' frames, in board space (inside .bd-world). */
export function VersionRowFrames({ frames, view, size, after }: { frames: FrameRect[]; view: View; size: { w: number; h: number }; after?: number }) {
  const layout = useVersionLayout(frames, after);
  const prefs = useVariantPrefs();
  const phone = usePhone();
  // Fit takes in the versions beside the page (and room for the "New variant" button after them).
  const fitRef = useRef(layout);
  fitRef.current = layout;
  useEffect(() => {
    if (phone) return;
    setExtraFitRects(() => {
      const l = fitRef.current;
      if (!l.rows.length) return [];
      return [...l.rows.map((r) => ({ x: l.left + r.dx, y: l.top, w: r.w, h: r.h })), { x: l.end, y: l.top, w: 260, h: 10 }];
    }, "versions");
    return () => setExtraFitRects(() => [], "versions");
  }, [phone]);
  // Phones show one frame at a time: versions are reached from the variant band and Review there.
  if (phone) return null;
  return (
    <>
      {layout.rows.map((r) =>
        r.hidden ? (
          <div key={r.page.id} className={`vr-folded${r.page.variantOf ? "" : " is-owner"}`} style={{ left: layout.left + r.dx, top: layout.top, width: r.w, height: Math.max(...frames.map((f) => f.h)) }} aria-hidden="true" />
        ) : frames.map((f) => (
          <VersionFrame
            key={`${r.page.id}:${f.bp}`}
            page={r.page}
            bp={f.bp}
            x={f.x + r.dx}
            y={f.y}
            w={f.w}
            outline={prefs.outline}
            visible={!size.w || isVisible(view, { x: f.x + r.dx, y: f.y, w: f.w, h: r.h }, size.w, size.h, Math.max(size.w, size.h))}
          />
        )),
      )}
    </>
  );
}

function RowMenu({ page, isOwner, current }: { page: Page; isOwner: boolean; current: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const status = statusOf(page);
  return (
    <div className="vr-menu-wrap" ref={box}>
      <button type="button" className="vr-more" aria-haspopup="menu" aria-expanded={open} aria-label={`More for ${page.variantName ?? page.title}`} onClick={() => setOpen(!open)}>
        ···
      </button>
      {open ? (
        <ul className="ed-menu vr-menu" role="menu">
          {!current ? (
            <li role="none">
              <button type="button" role="menuitem" onClick={run(() => openVersion(page.id))}>
                Edit this one
              </button>
            </li>
          ) : null}
          {!isOwner ? (
            <>
              <li role="none">
                <button type="button" role="menuitem" onClick={run(() => propose(page.id, status !== "proposed"))}>
                  {status === "proposed" ? "Back to draft" : "Propose for review"}
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={run(() => {
                    const name = window.prompt("Name this variant", page.variantName ?? "");
                    if (name?.trim()) update((s) => renameVariant(s, page.id, name), "Rename variant");
                  })}
                >
                  Rename
                </button>
              </li>
            </>
          ) : null}
          <li role="none">
            <button type="button" role="menuitem" onClick={run(() => openDesigns(page.variantOf ?? page.id))}>
              Review side by side
            </button>
          </li>
          {!isOwner ? (
            <li role="none">
              <button type="button" role="menuitem" onClick={run(() => openPick(page.id))}>
                Pick this one…
              </button>
            </li>
          ) : null}
          <li role="none">
            <button type="button" role="menuitem" onClick={run(() => newVariant(page.id))}>
              New variant from this
            </button>
          </li>
          {!isOwner ? (
            <li role="none">
              <button type="button" role="menuitem" className="is-danger" onClick={run(() => window.confirm(`Delete ${page.variantName}? The page itself stays as it is.`) && removeVariant(page.id))}>
                Delete variant
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

const EYE = (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const EYE_OFF = (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M2 2l12 12M6.3 4c.5-.2 1.1-.3 1.7-.3 4.1 0 6.5 4.3 6.5 4.3a11 11 0 0 1-1.7 2.2M10 11.9c-.6.4-1.3.6-2 .6-4.1 0-6.5-4.5-6.5-4.5a11 11 0 0 1 2.3-2.8" />
  </svg>
);

/**
 * A version's header (board clarity, option A): one line above its frames with a rule under it,
 * marking where it starts. Dot (green: the page, purple: a variant), name, status, votes and
 * comments, the eye that folds it away, and its menu. A click on the name opens it for editing.
 */
function VersionHeader({ page, current, owner, hidden, style }: { page: Page; current: boolean; owner: Page; hidden: boolean; style: React.CSSProperties }) {
  const isOwner = page.id === owner.id;
  const status = isOwner ? null : statusOf(page);
  const comments = useOpenComments(page.id);
  const me = voter().id;
  const votes = page.variantVotes ?? [];
  const mine = votes.some((v) => v.id === me);
  const name = isOwner ? page.title : (page.variantName ?? "Variant");
  const state = isOwner ? (owner.status === "published" ? "Live page" : "The page") : STATUS_LABEL[status!];
  return (
    <div className={`vr-head-line${isOwner ? " is-owner" : " is-variant"}${current ? " is-current" : ""}${hidden ? " is-hidden" : ""}`} style={style} onPointerDown={(e) => e.stopPropagation()}>
      <span className="vr-dot" aria-hidden="true" />
      {current ? (
        <strong title={name}>{name}</strong>
      ) : (
        <button type="button" className="vr-name" title={`Edit ${name}`} onClick={() => openVersion(page.id)}>
          {name}
        </button>
      )}
      {hidden ? null : (
        <span className="vr-state">
          {state}
          {!isOwner && page.variantBy ? ` · ${page.variantBy}` : ""}
          {current ? " · editing" : ""}
        </span>
      )}
      <span className="vr-sp" />
      {!isOwner && !hidden ? (
        <button type="button" className={`vr-vote${mine ? " is-on" : ""}`} aria-pressed={mine} title={votes.length ? votes.map((v) => v.name).join(", ") : "Vote for this one"} onClick={() => vote(page.id)}>
          ▲ {votes.length}
        </button>
      ) : null}
      {!hidden && comments ? <span className="vr-state" title="Open comments">{comments === 1 ? "1 comment" : `${comments} comments`}</span> : null}
      <button
        type="button"
        className="vr-eye"
        aria-pressed={!hidden}
        disabled={current}
        aria-label={current ? `You're editing ${name}` : hidden ? `Show ${name}` : `Hide ${name}`}
        title={current ? "You're editing this one" : hidden ? "Show it on the board" : "Hide it on the board"}
        onClick={() => setVersionHidden(page.id, !hidden)}
      >
        {hidden ? EYE_OFF : EYE}
      </button>
      {hidden ? null : <RowMenu page={page} isOwner={isOwner} current={current} />}
    </div>
  );
}

/** The name above one version's frame, with Play (see it moving, without publishing). */
function VersionFrameLabel({ page, bp, style }: { page: Page; bp: Breakpoint; style: React.CSSProperties }) {
  return (
    <div className="bd-label-wrap vr-frame-label" style={style} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="bd-label" onClick={() => (openVersion(page.id), activateBreakpoint(bp))} title="Click to edit this version">
        <strong>{BREAKPOINT_LABEL[bp]}</strong>
      </button>
      <PlayButton pageId={page.id} bp={bp} />
    </div>
  );
}

/** Row labels and "+ New variant", in screen space (outside .bd-world). */
export function VersionRowLabels({ frames, after }: { frames: FrameRect[]; after?: number }) {
  const view = useBoard((s) => s.view);
  const pageId = useEditor((s) => s.pageId);
  const site = useEditor((s) => s.site);
  const phone = usePhone();
  const layout = useVersionLayout(frames, after);
  const current = site.pages.find((p) => p.id === pageId);
  if (!current || !frames.length || phone) return null;
  const owner = layout.group[0] ?? current;
  const at = (x: number, y: number) => ({ left: x * view.zoom + view.x, top: y * view.zoom + view.y });
  // One header line per version, above its frame names: where it starts, and its eye.
  const headPos = (dx: number, w: number) => {
    const p = at(layout.left + dx, layout.top);
    return { left: p.left, top: p.top - 40, width: Math.max(w * view.zoom, 160), transform: "translateY(-100%)" };
  };
  // After the last header (a folded one is wider on screen than its strip), never on top of it.
  const lastHead = layout.rows.length ? headPos(layout.rows.at(-1)!.dx, layout.rows.at(-1)!.w) : headPos(0, layout.span);
  const button = { left: Math.max(at(layout.end, layout.top).left, lastHead.left + lastHead.width + 24), top: at(0, layout.top).top };
  return (
    <>
      {layout.group.length > 1 ? <VersionHeader page={current} current owner={owner} hidden={false} style={headPos(0, layout.span)} /> : null}
      {layout.rows.map((r) => (
        <VersionHeader key={r.page.id} page={r.page} current={false} owner={owner} hidden={r.hidden} style={headPos(r.dx, r.w)} />
      ))}
      {layout.rows.map((r) =>
        r.hidden ? null : frames.map((f) => <VersionFrameLabel key={`${r.page.id}:${f.bp}`} page={r.page} bp={f.bp} style={{ ...at(f.x + r.dx, f.y), transform: "translateY(calc(-100% - 6px))" }} />),
      )}
      <button
        type="button"
        className="vr-new"
        style={{ left: button.left, top: button.top - 40, transform: "translateY(-100%)" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => newVariant(owner.id)}
        title="A copy of the page to try ideas on. The live page isn't touched."
      >
        + New variant of {owner.title}
      </button>
    </>
  );
}
