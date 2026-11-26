import { useEffect, useRef } from "react";
import { currentPage, useEditor } from "../store";
import { bandPositions } from "./mat-bands";
import { bandsOf } from "../../render/document";

/**
 * The live page wraps neighbouring blocks on the same cutting mat in one band (one padding at the
 * top and bottom, a gap between them). The editing frame draws every section on its own, so it
 * marks each block with its place in the band and the frame CSS spaces it like the live page.
 */
export function MatBands() {
  const marker = useRef<HTMLSpanElement>(null);
  const page = useEditor(currentPage);
  useEffect(() => {
    const doc = marker.current?.ownerDocument;
    if (!doc) return;
    const run = () => {
      const sections = [...doc.querySelectorAll<HTMLElement>("section.s[data-section-id]")].filter((s) => !s.parentElement?.closest("section.s"));
      const blocks = sections.map((s) => s.querySelector<HTMLElement>(":scope > .si > .n > .ao-b[data-mat]"));
      // Which band each section is in, by the live page's own rule.
      const band = new Map<string, string>();
      for (const g of bandsOf(page)) if (g.band) for (const sec of g.sections) band.set(sec.id, g.band);
      const mats = sections.map((s, i) => {
        const key = band.get(s.dataset.sectionId!);
        if (!key) return null;
        // Switched off, or hidden at this size: the live page takes it out of the band.
        return blocks[i]?.hasAttribute("data-off") || getComputedStyle(s).display === "none" ? "off" : key;
      });
      const firstShown = sections.findIndex((s) => getComputedStyle(s).display !== "none");
      bandPositions(mats).forEach((pos, i) => {
        const b = blocks[i];
        if (!b) return;
        if (pos) b.dataset.band = pos;
        else b.removeAttribute("data-band");
        // A band that opens the page is pulled up under the nav, as on the live page.
        if (pos && i === firstShown && (pos === "first" || pos === "only")) b.dataset.bandTop = "";
        else b.removeAttribute("data-band-top");
      });
    };
    run();
    const t = setTimeout(run, 300);
    const mo = new MutationObserver(() => requestAnimationFrame(run));
    mo.observe(doc.body, { childList: true, subtree: true, attributeFilter: ["data-mat", "data-off"] });
    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [page]);
  return <span ref={marker} hidden />;
}
