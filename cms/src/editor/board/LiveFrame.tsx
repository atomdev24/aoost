import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { components } from "../../components/registry";
import { pageCss, PageBody } from "../../render/document";
import { updateNavItem } from "../../model/nav";
import type { Breakpoint, Page, Site } from "../../schema";
import { currentPage, megaItemId, useEditor } from "../store";
import { activateBreakpoint } from "./bridge";
import { frameBaseCss, pinViewportUnits, SCREEN_HEIGHT } from "./frame-css";
import { attachKeys } from "./keys";
import { frameOrigin, getBoard, setHeight, useBoard } from "./store";
import { onBoardWheel } from "./wheel";

/** Editor-only rules for a passive frame: still motion, no live media, nav drawn in place. */
const passiveCss = `
html.js [data-enter]{opacity:1!important;translate:none!important;scale:none!important}
.skip{display:none}
.nav{position:absolute!important}
.sheet,.search{display:none!important}
.n iframe,.n video,.n audio,.n model-viewer{pointer-events:none}
body{cursor:default}
a{cursor:default}
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
  const ref = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const liveSite = useEditor((s) => s.site);
  const livePage = useEditor(currentPage);
  const site = useSettled(liveSite, 150);
  const page = useSettled(livePage, 150);
  const selection = useEditor((s) => s.selection);
  const highlight = useEditor((s) => s.highlight);
  const linked = useBoard((s) => s.linked);
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
    const wheel = (e: WheelEvent) => {
      const { view } = getBoard();
      const o = frameOrigin(bp);
      onBoardWheel(e, { x: (o.x + e.clientX) * view.zoom + view.x, y: (o.y + e.clientY) * view.zoom + view.y });
    };
    const click = (e: MouseEvent) => {
      e.preventDefault();
      activateBreakpoint(bp, blockIdAt(e.target));
    };
    doc.addEventListener("wheel", wheel, { passive: false });
    doc.addEventListener("click", click, true);
    const RO = doc.defaultView!.ResizeObserver;
    const ro = new RO(() => shown.current && doc.body.childElementCount > 0 && setHeight(bp, doc.documentElement.scrollHeight));
    ro.observe(doc.body);
    return () => {
      detach();
      doc.removeEventListener("wheel", wheel);
      doc.removeEventListener("click", click, true);
      ro.disconnect();
    };
  }, [doc, bp]);

  const model = useMemo(() => frameModel(site, page), [site, page]);
  const css = useMemo(() => pinViewportUnits(pageCss(model.site, model.page), SCREEN_HEIGHT[bp]), [model, bp]);
  // Linked selection: the block selected in the active frame is outlined here too.
  const selectionCss = useMemo(() => {
    const ids = linked ? selection : [];
    const sel = ids.flatMap((id) => [`.n-${CSS.escape(id)}`, `.s#${CSS.escape(id)}`]).join(",");
    const flash = highlight.flatMap((id) => [`.n-${CSS.escape(id)}`, `.s#${CSS.escape(id)}`]).join(",");
    return [sel && `${sel}{outline:2px solid #0A84FF!important;outline-offset:-2px}`, flash && `${flash}{animation:ed-flash 2s ease-out}@keyframes ed-flash{0%,60%{outline:3px solid #0A84FF;outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}`].filter(Boolean).join("");
  }, [selection, highlight, linked]);

  return (
    <>
      <iframe ref={ref} className="bd-live" title={`${bp === "desktop" ? "Desktop" : "Mobile"} frame`} tabIndex={-1} data-bp={bp} />
      {doc && visible
        ? createPortal(
            <>
              <style>{css}</style>
              <style>{frameBaseCss + passiveCss}</style>
              <style>{selectionCss}</style>
              <PageBody site={model.site} page={model.page} editing />
            </>,
            doc.body,
          )
        : null}
    </>
  );
}
