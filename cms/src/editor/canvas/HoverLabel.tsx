import { useEffect, useRef } from "react";
import { getComponent } from "../../components/registry";
import { currentPage, getState } from "../store";

/** The name a click on this element would select: the layer's own name, else its block type. */
export function hoverName(id: string, kind: "node" | "section"): string | null {
  const page = currentPage(getState());
  if (kind === "section") {
    const i = page.sections.findIndex((s) => s.id === id);
    return i < 0 ? null : (page.sections[i]!.name ?? `Section ${i + 1}`);
  }
  for (const s of page.sections) {
    const n = s.children.find((c) => c.id === id);
    if (n) return n.name ?? getComponent(n.type)?.label.split(":")[0] ?? n.type;
  }
  return null;
}

/**
 * Hover outline (UI spec, Nov 2026): a dashed outline and a name tag on whatever a click will
 * select, so you see it before you click. Lives inside the preview frame, never blocks the pointer,
 * and steps aside for the selected block (Puck draws that one) and while a button is held.
 */
export function HoverLabel() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const doc = marker.current!.ownerDocument;
    const box = doc.createElement("div");
    box.className = "ed-hover";
    box.setAttribute("aria-hidden", "true");
    const tag = doc.createElement("span");
    box.appendChild(tag);
    doc.body.appendChild(box);
    let target: HTMLElement | null = null;
    let raf = 0;
    const hide = () => {
      target = null;
      box.style.display = "none";
    };
    const place = () => {
      raf = 0;
      if (!target || !target.isConnected) return hide();
      const r = target.getBoundingClientRect();
      Object.assign(box.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      box.classList.toggle("is-low", r.top < 22);
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons) return hide();
      const t = e.target as Element | null;
      const el = t?.closest<HTMLElement>("[data-node-id], [data-section-id]") ?? null;
      if (!el) return hide();
      const id = el.dataset.nodeId ?? el.dataset.sectionId!;
      if (getState().selection.includes(id)) return hide();
      if (el !== target) {
        const name = hoverName(id, el.dataset.nodeId ? "node" : "section");
        if (!name) return hide();
        tag.textContent = name;
        target = el;
      }
      if (!raf) raf = requestAnimationFrame(place);
    };
    const onScroll = () => target && !raf && (raf = requestAnimationFrame(place));
    doc.addEventListener("pointermove", onMove, true);
    doc.addEventListener("pointerdown", hide, true);
    doc.addEventListener("pointerleave", hide);
    doc.defaultView?.addEventListener("scroll", onScroll, true);
    return () => {
      doc.removeEventListener("pointermove", onMove, true);
      doc.removeEventListener("pointerdown", hide, true);
      doc.removeEventListener("pointerleave", hide);
      doc.defaultView?.removeEventListener("scroll", onScroll, true);
      if (raf) cancelAnimationFrame(raf);
      box.remove();
    };
  }, []);
  return <span ref={marker} hidden />;
}
