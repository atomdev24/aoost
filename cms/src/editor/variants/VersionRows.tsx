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
import { getBoard, useBoard } from "../board/store";
import { isVisible, type FrameRect, type View } from "../board/viewport";
import { onBoardWheel } from "../board/wheel";
import { useOpenComments } from "./comment-count";
import { useEditor } from "../store";
import { attachFrameGestures } from "../touch/gestures";
import { usePhone } from "../touch/device";
import { closeUnpinnedFlyout } from "../workspace/rail-store";
import { openDesigns } from "../templates/designs-open";
import { newVariant, openVersion, propose, removeVariant, useVariantPrefs, voter, vote } from "./actions";
import { openPick } from "./pick-open";
import { renameVariant } from "../../model/variants";
import { update } from "../store";
import { CHANGED_CSS } from "./changed-css";
import { PlayButton } from "../play/PlayButton";
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

/** One other version: its frames sit at the open page's frames moved right by `dx`. */
export type VersionRow = { page: Page; dx: number; h: number };

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
      rows.push({ page: p, dx: x - left, h });
      x += span + COL_GAP;
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
  const changed = useMemo(() => (outline && page.variantOf ? changedIds(site, page) : []), [site, page, outline]);
  useEffect(() => {
    if (!doc || !visible) return;
    const want = new Set(changed.length ? doc.querySelectorAll(changed.flatMap((id) => [`.n-${CSS.escape(id)}`, `.s#${CSS.escape(id)}`]).join(",")) : []);
    doc.querySelectorAll("[data-ed-changed]").forEach((el) => !want.has(el) && el.removeAttribute("data-ed-changed"));
    want.forEach((el) => el.setAttribute("data-ed-changed", ""));
  });

  return (
    <div className="bd-frame vr-frame" data-bp={bp} style={{ left: x, top: y, width: w, height: heights.get(`${page.id}:${bp}`) ?? 900 }}>
      <iframe ref={ref} className="bd-live" title={`${page.variantName ?? page.title}, ${BREAKPOINT_LABEL[bp]}`} tabIndex={-1} />
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


/** The rows' frames, in board space (inside .bd-world). */
export function VersionRowFrames({ frames, view, size, after }: { frames: FrameRect[]; view: View; size: { w: number; h: number }; after?: number }) {
  const layout = useVersionLayout(frames, after);
  const prefs = useVariantPrefs();
  // Phones show one frame at a time: versions are reached from the variant band and Review there.
  if (usePhone()) return null;
  return (
    <>
      {layout.rows.map((r) =>
        frames.map((f) => (
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

/** A row's name, status, votes and comments, to the left of its frames (screen space). */
function RowLabel({ page, current, owner, style }: { page: Page; current: boolean; owner: Page; style: React.CSSProperties }) {
  const isOwner = page.id === owner.id;
  const status = isOwner ? null : statusOf(page);
  const comments = useOpenComments(page.id);
  const me = voter().id;
  const votes = page.variantVotes ?? [];
  const mine = votes.some((v) => v.id === me);
  return (
    <div className={`vr-label${current ? " is-current" : ""}${isOwner ? " is-owner" : ""}`} style={style} onPointerDown={(e) => e.stopPropagation()}>
      <div className="vr-head">
        <strong title={page.variantName ?? page.title}>{isOwner ? page.title : page.variantName}</strong>
        <RowMenu page={page} isOwner={isOwner} current={current} />
      </div>
      {isOwner ? (
        <span className={`vr-chip ${owner.status === "published" ? "is-live" : "is-page"}`}>{owner.status === "published" ? "Live page" : "The page"}</span>
      ) : (
        <span className={`vr-chip is-${status}`}>{STATUS_LABEL[status!]}</span>
      )}
      <span className="vr-meta">{isOwner ? "As it is now" : page.variantBy ? `By ${page.variantBy}` : "Variant"}</span>
      {!isOwner ? (
        <span className="vr-social">
          <button type="button" className={`vr-vote${mine ? " is-on" : ""}`} aria-pressed={mine} title={votes.length ? votes.map((v) => v.name).join(", ") : "Vote for this one"} onClick={() => vote(page.id)}>
            ▲ {votes.length}
          </button>
          <span>{comments === 1 ? "1 comment" : `${comments} comments`}</span>
        </span>
      ) : null}
      {current ? (
        <span className="vr-editing">You're editing this</span>
      ) : (
        <button type="button" className="vr-open" onClick={() => openVersion(page.id)}>
          Edit this one
        </button>
      )}
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
  // Each version's card sits above its frames, clear of the frame names.
  const labelPos = (dx: number) => {
    const p = at(layout.left + dx, layout.top);
    return { left: p.left, top: p.top - 44, width: LABEL_W, transform: "translateY(-100%)" };
  };
  const button = at(layout.end, layout.top);
  return (
    <>
      {layout.group.length > 1 ? <RowLabel page={current} current owner={owner} style={labelPos(0)} /> : null}
      {layout.rows.map((r) => (
        <RowLabel key={r.page.id} page={r.page} current={false} owner={owner} style={labelPos(r.dx)} />
      ))}
      {layout.rows.map((r) =>
        frames.map((f) => <VersionFrameLabel key={`${r.page.id}:${f.bp}`} page={r.page} bp={f.bp} style={{ ...at(f.x + r.dx, f.y), transform: "translateY(calc(-100% - 6px))" }} />),
      )}
      <button
        type="button"
        className="vr-new"
        style={{ left: button.left, top: button.top, width: LABEL_W }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => newVariant(owner.id)}
        title="A copy of the page to try ideas on. The live page isn't touched."
      >
        + New variant of {owner.title}
      </button>
    </>
  );
}
