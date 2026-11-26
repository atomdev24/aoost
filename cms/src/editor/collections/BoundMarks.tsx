import { useEffect, useRef } from "react";
import { collectionById, fieldName } from "../../model/cms";
import { currentPage, useEditor } from "../store";

/**
 * On a collection's page design: blocks connected to fields wear a purple outline and a tag naming
 * the fields ("Title · Summary"), like Framer's connected layers. Mounted in the frame being edited.
 */
export function BoundMarks() {
  const marker = useRef<HTMLSpanElement>(null);
  const page = useEditor(currentPage);
  const col = useEditor((s) => (page.collectionId ? collectionById(s.site, page.collectionId) : undefined));
  useEffect(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc) return;
    const run = () => {
      const want = new Map<string, string>();
      if (col)
        for (const s of page.sections)
          for (const n of s.children) if (n.bind && Object.keys(n.bind).length) want.set(n.id, [...new Set(Object.values(n.bind))].map((f) => fieldName(col, f)).join(" · "));
      doc.querySelectorAll<HTMLElement>("[data-ed-bound]").forEach((el) => !want.has(el.dataset.nodeId ?? "") && el.removeAttribute("data-ed-bound"));
      want.forEach((label, id) => doc.querySelectorAll(`[data-node-id="${CSS.escape(id)}"]`).forEach((el) => el.getAttribute("data-ed-bound") !== label && el.setAttribute("data-ed-bound", label)));
    };
    run();
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [page, col]);
  return <span ref={marker} hidden />;
}
