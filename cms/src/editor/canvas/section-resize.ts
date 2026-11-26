import { swallowNextClick } from "./swallow-click";
import { updateSection } from "../../model/page-ops";
import { canvasSize } from "../../responsive/canvas";
import { setOnly } from "../../responsive/resolve";
import type { SectionLayout } from "../../schema";
import { currentPage, getState, updatePage } from "../store";

/**
 * Drag the handle in the middle of a section's bottom edge to change its height on the size
 * being edited. A free canvas section changes its artboard height; a stacked or grid section
 * gets a minimum height (dragging back up to its content clears it).
 * Loads on the first drag (see section-handle.ts).
 */
export function startSectionResize(doc: Document, e: PointerEvent, handle: HTMLElement, el: HTMLElement, id: string) {
  const section = currentPage(getState()).sections.find((s) => s.id === id);
  if (!section || section.locked) return;
  const { bp } = getState();
  const startY = e.clientY;
  const html = doc.documentElement;
  let patch: Partial<SectionLayout> | null = null;
  let move: (m: PointerEvent) => void;
  let undo: () => void;

  if (section.kind === "canvas") {
    const inner = el.querySelector<HTMLElement>(":scope > .si");
    if (!inner) return;
    const size = canvasSize(section, bp);
    // screen px per design px
    const scale = inner.getBoundingClientRect().width / size.width || 1;
    move = (m) => {
      const h = Math.max(40, Math.round(size.height + (m.clientY - startY) / scale));
      inner.style.aspectRatio = `${size.width}/${h}`;
      handle.dataset.h = `${h} px`;
      patch = h === size.height ? null : { height: h };
    };
    undo = () => inner.style.removeProperty("aspect-ratio");
  } else {
    const was = el.style.minHeight;
    el.style.minHeight = "0px";
    const content = el.getBoundingClientRect().height;
    el.style.minHeight = was;
    const start = el.getBoundingClientRect().height;
    move = (m) => {
      const h = Math.round(Math.max(content, start + (m.clientY - startY)));
      el.style.minHeight = `${h}px`;
      handle.dataset.h = h <= content + 1 ? "Fits content" : `${h} px`;
      patch = { minHeight: h <= content + 1 ? undefined : `${h}px` };
    };
    undo = () => (el.style.minHeight = was);
  }

  const up = () => {
    doc.removeEventListener("pointermove", move, true);
    doc.removeEventListener("pointerup", up, true);
    html.classList.remove("ed-sizing");
    delete handle.dataset.h;
    const p = patch;
    if (p) updatePage(getState().pageId, (page) => updateSection(page, id, (s) => ({ ...s, layout: setOnly(s.layout, bp, p) })), "Resize section");
    // The page re-renders from the store; drop the live styles once it has.
    setTimeout(undo, 80);
    // A drag isn't a click on whatever is under the pointer.
    swallowNextClick(doc);
  };
  html.classList.add("ed-sizing");
  doc.addEventListener("pointermove", move, true);
  doc.addEventListener("pointerup", up, true);
}
