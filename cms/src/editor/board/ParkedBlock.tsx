import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pageCss, PageBody } from "../../render/document";
import type { RefItem } from "../../model/refs";
import type { Breakpoint, Node, Page, Section } from "../../schema";
import { currentPage, useEditor } from "../store";
import { frameBaseCss, SCREEN_HEIGHT, pinViewportUnits, stillMotion } from "./frame-css";
import { sizeRef } from "./refs-store";
import { frameRects, useBoard } from "./store";

/**
 * A block parked on the board, drawn live as it looks on the page: its own little frame renders
 * the block inside the section it came from (at the screen size it left), then shows just the
 * block. Read-only and never published; it goes back by dragging it onto a frame (board/ref-page.ts).
 */
export function ParkedBlock({ item }: { item: RefItem }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number } | null>(null);
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const node = item.node as unknown as Node;
  const bp = (item.bp ?? "desktop") as Breakpoint;
  const width = useBoard((s) => frameRects(s).find((f) => f.bp === bp)?.w ?? 1440);

  const model = useMemo(() => {
    const from = (item.section ?? { id: `parked-${node.id}`, kind: "flow", layout: { base: {} }, children: [] }) as unknown as Section;
    const mini: Page = { ...page, hideNav: true, overlays: [], sections: [{ ...from, children: [node] }] };
    return { site, page: mini };
  }, [site, page, item.section, node]);
  const css = useMemo(() => pinViewportUnits(pageCss(model.site, model.page), SCREEN_HEIGHT[bp]), [model, bp]);

  useEffect(() => {
    const frame = ref.current!;
    const ready = () => {
      const d = frame.contentDocument!;
      d.documentElement.classList.add("js");
      setDoc(d);
    };
    if (frame.contentDocument?.readyState === "complete") ready();
    frame.addEventListener("load", ready);
    return () => frame.removeEventListener("load", ready);
  }, []);
  useEffect(() => (doc ? stillMotion(doc) : undefined), [doc]);

  // Show just the block: measure it in its frame and size the board item to it.
  useEffect(() => {
    if (!doc) return;
    let raf = 0;
    const measure = () => {
      const el = doc.querySelector(`.n-${CSS.escape(node.id)}`);
      const r = el?.getBoundingClientRect();
      if (r && r.width && r.height) {
        setCrop((c) => (c && Math.abs(c.x - r.left) < 1 && Math.abs(c.y - r.top) < 1 ? c : { x: r.left, y: r.top }));
        if (Math.abs(r.width - item.w) > 1 || Math.abs(r.height - item.h) > 1) sizeRef(item.id, r.width, r.height);
      }
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(doc.body);
    raf = requestAnimationFrame(measure);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [doc, node.id, item.id, item.w, item.h]);

  return (
    <div className="bd-parked">
      <iframe
        ref={ref}
        title={`Parked ${node.type}`}
        tabIndex={-1}
        aria-hidden="true"
        style={{ width, height: SCREEN_HEIGHT[bp] * 3, transform: crop ? `translate(${-crop.x}px, ${-crop.y}px)` : undefined, visibility: crop ? "visible" : "hidden" }}
      />
      {doc
        ? createPortal(
            <>
              <style>{css}</style>
              <style>{frameBaseCss + "html{overflow:hidden}"}</style>
              <PageBody site={model.site} page={model.page} />
            </>,
            doc.body,
          )
        : null}
    </div>
  );
}
