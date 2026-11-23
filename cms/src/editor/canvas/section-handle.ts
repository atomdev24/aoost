/**
 * Pointer down on a section's height handle: the drag code loads on first use
 * (section-resize.ts, outside the editor's first load).
 */
export function attachSectionResize(doc: Document) {
  const down = (e: PointerEvent) => {
    const handle = (e.target as Element | null)?.closest?.<HTMLElement>("[data-ed-section-handle]");
    const el = handle?.closest<HTMLElement>("[data-section-id]");
    const id = el?.dataset.sectionId;
    if (!handle || !el || !id || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    void import("./section-resize").then((m) => m.startSectionResize(doc, e, handle, el, id));
  };
  doc.addEventListener("pointerdown", down, true);
  return () => doc.removeEventListener("pointerdown", down, true);
}
