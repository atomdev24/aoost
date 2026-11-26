import { useEffect, useRef } from "react";
import { overriddenIds } from "../board/overrides";
import { untranslatedIds } from "../../model/i18n";
import { currentPage, useEditor } from "../store";

/**
 * In the frame being edited: blocks and sections with their own values at this screen size get an
 * orange outline (UI spec, Nov 2026), so phone-only changes are easy to spot. Nothing on desktop.
 */
export function OverrideMarks() {
  const marker = useRef<HTMLSpanElement>(null);
  const page = useEditor(currentPage);
  const bp = useEditor((s) => s.bp);
  const selection = useEditor((s) => s.selection);
  const lang = useEditor((s) => s.lang);
  const base = useEditor((s) => s.site.pages.find((p) => p.id === s.pageId));
  useEffect(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc) return;
    const run = () => {
      // In another language: its layout nudges are orange too, and blocks still to translate are dashed.
      const t = lang ? base?.translations?.[lang] : undefined;
      const ids = new Set([...overriddenIds(page, bp), ...Object.keys(t?.style ?? {})].filter((id) => !selection.includes(id)));
      const todo = new Set(t && base ? untranslatedIds(base, lang!) : []);
      doc.querySelectorAll<HTMLElement>("[data-ed-untr]").forEach((el) => !todo.has(el.dataset.nodeId ?? "") && el.removeAttribute("data-ed-untr"));
      todo.forEach((id) => doc.querySelectorAll(`[data-node-id="${CSS.escape(id)}"]`).forEach((el) => el.setAttribute("data-ed-untr", "")));
      doc.querySelectorAll<HTMLElement>("[data-ed-over]").forEach((el) => !ids.has(el.dataset.nodeId ?? el.dataset.sectionId ?? "") && el.removeAttribute("data-ed-over"));
      ids.forEach((id) => doc.querySelectorAll(`[data-node-id="${CSS.escape(id)}"], [data-section-id="${CSS.escape(id)}"]`).forEach((el) => el.setAttribute("data-ed-over", "")));
    };
    run();
    const t = setTimeout(run, 300); // after Puck has drawn a change
    return () => clearTimeout(t);
  }, [page, bp, selection, lang, base]);
  return <span ref={marker} hidden />;
}
