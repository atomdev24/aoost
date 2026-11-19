import { getComponent } from "../../components/registry";
import type { Page, Section } from "../../schema";

const KIND: Record<Section["kind"], string> = { flow: "Section", grid: "Grid section", canvas: "Free-layout section" };
const short = (label: string) => label.split(":")[0]!.replace(/\s*\(.*\)$/, "").replace(/^aoost · /, "");

/** Every section and block on a page, in page order, with the name the layers list shows. */
export function pageBlocks(page: Page): { id: string; label: string; type: string }[] {
  const out: { id: string; label: string; type: string }[] = [];
  for (const s of page.sections) {
    out.push({ id: s.id, label: s.name ?? KIND[s.kind], type: KIND[s.kind] });
    for (const n of s.children) {
      const def = getComponent(n.type);
      const type = short(def?.label ?? n.type);
      out.push({ id: n.id, label: n.name ?? type, type });
    }
  }
  return out;
}
