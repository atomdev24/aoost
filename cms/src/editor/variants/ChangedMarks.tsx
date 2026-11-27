import { useEffect, useMemo, useRef } from "react";
import { changedIds } from "../../model/variants";
import { currentPage, useEditor } from "../store";
import { useVariantPrefs } from "./actions";

/**
 * In the editable frame of a variant: blocks it changed from its page get a purple dashed outline
 * (data-ed-changed; canvas.styles.ts), as on the board's rows and in Review. Off with "Outline what
 * changed" in the page's versions.
 */
export function ChangedMarks() {
  const marker = useRef<HTMLSpanElement>(null);
  const page = useEditor(currentPage);
  const site = useEditor((s) => s.site);
  const selection = useEditor((s) => s.selection);
  const { outline } = useVariantPrefs();
  const ids = useMemo(() => (outline && page.variantOf ? changedIds(site, page) : []), [outline, site, page]);
  useEffect(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc) return;
    const run = () => {
      const want = new Set(ids.filter((id) => !selection.includes(id)));
      doc.querySelectorAll<HTMLElement>("[data-ed-changed]").forEach((el) => !want.has(el.dataset.nodeId ?? el.dataset.sectionId ?? "") && el.removeAttribute("data-ed-changed"));
      want.forEach((id) => doc.querySelectorAll(`[data-node-id="${CSS.escape(id)}"], [data-section-id="${CSS.escape(id)}"]`).forEach((el) => el.setAttribute("data-ed-changed", "")));
    };
    run();
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [ids, selection]);
  return <span ref={marker} hidden />;
}
