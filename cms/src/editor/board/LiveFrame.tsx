import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { components } from "../../components/registry";
import { pageCss, PageBody } from "../../render/document";
import { updateNavItem } from "../../model/nav";
import { BREAKPOINT_LABEL, type Breakpoint, type Page, type Site } from "../../schema";
import { currentPage, megaItemId, useEditor } from "../store";
import { activateBreakpoint } from "./bridge";
import { pieceFromClick, selectPiece } from "../canvas/ResizePiece";
import { overriddenIds } from "./overrides";
import { changedIds } from "../../model/variants";
import { useVariantPrefs } from "../variants/actions";
import { useAgent } from "../agent/store";
import { frameBaseCss, pinViewportUnits, SCREEN_HEIGHT, stillMotion } from "./frame-css";
import { attachKeys } from "./keys";
import { frameOrigin, getBoard, setHeight, setReady, useBoard } from "./store";
import { onBoardWheel } from "./wheel";
import { attachFrameGestures } from "../touch/gestures";
import { ZoomVar } from "./PuckFrame";
import { closeUnpinnedFlyout } from "../workspace/rail-store";
import { watchWindow } from "../problems";
import { frameThemeCss, markTheme, useTheme } from "../display";
import { guardPinch } from "../pinch-guard";

/** Editor-only rules for a passive frame: still motion, no live media, nav drawn in place. */
export const passiveCss = `
html.js [data-enter]{opacity:1!important;translate:none!important;scale:none!important}
.skip{display:none}
.nav{position:absolute!important}
.sheet,.search{display:none!important}
.n iframe,.n video,.n audio,.n model-viewer{pointer-events:none}
body{cursor:default}
a{cursor:default}
[data-ed-sel]{outline:calc(1px * var(--ed-px,1)) dashed var(--ed-sel,#0A84FF)!important;outline-offset:calc(-1px * var(--ed-px,1))}
[data-ed-flash]{animation:ed-flash 2s ease-out}
[data-ed-agent]{outline:calc(2px * var(--ed-px,1)) solid #D97757!important;outline-offset:calc(1px * var(--ed-px,1))}
[data-ed-changed]:not([data-ed-sel]){outline:calc(1.5px * var(--ed-px,1)) dashed rgba(191,90,242,.95);outline-offset:calc(-1.5px * var(--ed-px,1))}
[data-ed-over]:not([data-ed-sel]){outline:calc(1.5px * var(--ed-px,1)) solid rgba(255,159,10,.85);outline-offset:calc(-1.5px * var(--ed-px,1))}
.s[data-ed-over]:not([data-ed-sel]){outline:none;box-shadow:inset calc(3px * var(--ed-px,1)) 0 0 rgba(255,159,10,.85)}
@keyframes ed-flash{0%,60%{outline:3px solid var(--ed-sel,#0A84FF);outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}
`;

/** Re-render at most every `ms` while values keep changing (typing in a frame or a field). */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/** The id of the block under a click: a node (.n.n-<id>) or a section (.s#<id>). */
function blockIdAt(target: EventTarget | null): string | null {
  let el = target as Element | null;
  while (el && el.nodeType === 1) {
    if (el.classList.contains("n")) {
      const cls = [...el.classList].find((c) => c.startsWith("n-"));
      if (cls) return cls.slice(2);
    }
    if (el.classList.contains("s") && el.id) return el.id;
    el = el.parentElement;
  }
  return null;
}

/** Mega-menu panels are edited as a page; the frame shows them on the site's surface. */
function frameModel(site: Site, page: Page): { site: Site; page: Page } {
  const mega = megaItemId(page.id);
  if (mega) return { site: updateNavItem(site, mega, { panel: page.sections }), page: { ...page, hideNav: true } };
  return { site: { ...site, pages: site.pages.map((p) => (p.id === page.id ? page : p)) }, page };
}

/**
 * A live, read-only render of the draft at one breakpoint, for every frame
 * except the active one (which is Puck's editable preview). It uses the same
 * renderer as the draft preview, so it shows what visitors get; the aoost
 * blocks show their first paint, as in the editable frame. Click a block to
 * make this breakpoint active with that block selected.
 */
export function LiveFrame({ bp, visible }: { bp: Breakpoint; visible: boolean }) {
  const theme = useTheme();
  const ref = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const liveSite = useEditor((s) => s.site);
  const livePage = useEditor(currentPage);
  const site = useSettled(liveSite, 150);
  const page = useSettled(livePage, 150);
  const selection = useEditor((s) => s.selection);
  const highlight = useEditor((s) => s.highlight);
  const agent = useAgent();
  const linked = useBoard((s) => s.linked);
  const { outline } = useVariantPrefs();
  // Off-screen frames render nothing; their last height is kept meanwhile.
  const shown = useRef(visible);
  shown.current = visible;

  // An empty same-origin document to render into.
  useEffect(() => {
    const frame = ref.current!;
    const ready = () => {
      const d = frame.contentDocument!;
      d.documentElement.lang = "en";
      d.documentElement.classList.add("js");
      if (!d.head.querySelector("meta[name=viewport]")) d.head.insertAdjacentHTML("beforeend", `<meta name="viewport" content="width=device-width, initial-scale=1">`);
      setDoc(d);
    };
    if (frame.contentDocument?.readyState === "complete") ready();
    frame.addEventListener("load", ready);
    return () => frame.removeEventListener("load", ready);
  }, []);

  // Fonts, keyboard, wheel, clicks and the frame's height.
  const themeFonts = site.theme.googleFonts;
  const fonts = useMemo(() => [...new Set([...themeFonts, ...components.flatMap((c) => c.kit?.googleFonts ?? [])])], [themeFonts]);
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
    const detach = attachKeys(doc);
    const unwatch = watchWindow(doc.defaultView!, `${bp} frame`);
    const unguard = guardPinch(doc.defaultView);
    const unstill = stillMotion(doc);
    const wheel = (e: WheelEvent) => {
      const { view } = getBoard();
      const o = frameOrigin(bp);
      onBoardWheel(e, { x: (o.x + e.clientX) * view.zoom + view.x, y: (o.y + e.clientY) * view.zoom + view.y });
    };
    const click = (e: MouseEvent) => {
      e.preventDefault();
      // A click on a project piece also picks it, so its handles show once this frame is active.
      const piece = pieceFromClick(doc, e, bp);
      activateBreakpoint(bp, blockIdAt(e.target));
      selectPiece(piece);
    };
    doc.addEventListener("wheel", wheel, { passive: false });
    doc.addEventListener("click", click, true);
    const detachTouch = attachFrameGestures(
      doc,
      (e) => {
        const { view } = getBoard();
        const o = frameOrigin(bp);
        return { x: (o.x + e.clientX) * view.zoom + view.x, y: (o.y + e.clientY) * view.zoom + view.y };
      },
      () => [],
    );
    // A press inside a frame is a canvas click: unpinned flyouts close.
    doc.addEventListener("pointerdown", closeUnpinnedFlyout, true);
    const RO = doc.defaultView!.ResizeObserver;
    const ro = new RO(() => {
      if (!shown.current || doc.body.childElementCount === 0) return;
      setHeight(bp, doc.documentElement.scrollHeight);
      setReady(bp);
    });
    ro.observe(doc.body);
    return () => {
      detach();
      unwatch();
      unguard();
      unstill();
      detachTouch();
      doc.removeEventListener("wheel", wheel);
      doc.removeEventListener("click", click, true);
      doc.removeEventListener("pointerdown", closeUnpinnedFlyout, true);
      ro.disconnect();
    };
  }, [doc, bp]);

  // Once this frame has drawn the open page, its loading snapshot can fade away.
  useEffect(() => {
    if (!doc || !visible) return;
    const r = requestAnimationFrame(() => doc.body.childElementCount > 0 && setReady(bp));
    return () => cancelAnimationFrame(r);
  }, [doc, visible, page.id, bp]);

  const model = useMemo(() => frameModel(site, page), [site, page]);
  const css = useMemo(() => pinViewportUnits(pageCss(model.site, model.page), SCREEN_HEIGHT[bp]), [model, bp]);
  // Linked selection: the block selected in the active frame is outlined here too. The outline
  // rules are fixed (passiveCss); only the selected and flashing blocks get a marker. (Rewriting a
  // style sheet on every selection made Chrome restyle and lay out the whole page in every frame.)
  useEffect(() => {
    if (!doc || !visible) return;
    const mark = (attr: string, ids: string[]) => {
      const want = new Set(ids.length ? doc.querySelectorAll(ids.flatMap((id) => [`.n-${CSS.escape(id)}`, `.s#${CSS.escape(id)}`]).join(",")) : []);
      doc.querySelectorAll(`[${attr}]`).forEach((el) => !want.has(el) && el.removeAttribute(attr));
      want.forEach((el) => !el.hasAttribute(attr) && el.setAttribute(attr, ""));
    };
    mark("data-ed-sel", linked ? selection : []);
    mark("data-ed-flash", highlight);
    // Orange: what this size changes from the size it follows (UI spec, Nov 2026).
    mark("data-ed-over", overriddenIds(page, bp));
    mark("data-ed-agent", agent.state === "idle" ? [] : agent.nodeIds);
    // Purple, dashed: what a variant changed from its page (EDITOR-VARIANTS.md).
    mark("data-ed-changed", outline && page.variantOf ? changedIds(site, page) : []);
  }, [doc, visible, selection, highlight, linked, model, page, bp, agent, outline, site]);

  return (
    <>
      <iframe ref={ref} className="bd-live" title={`${BREAKPOINT_LABEL[bp]} frame`} tabIndex={-1} data-bp={bp} />
      {doc && visible
        ? createPortal(
            <>
              <style>{css}</style>
              <style ref={(el) => void (el && markTheme(el.ownerDocument, theme))}>{frameBaseCss + passiveCss + frameThemeCss(theme)}</style>
              <ZoomVar doc={doc} />
              <PageBody site={model.site} page={model.page} editing />
            </>,
            doc.body,
          )
        : null}
    </>
  );
}
