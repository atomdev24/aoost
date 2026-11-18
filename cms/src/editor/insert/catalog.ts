import { components, getComponent } from "../../components/registry";
import { addNode, addSection, createNode, createSection, locate } from "../../model/page-ops";
import type { Page, Section } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";

/** The Insert flyout's chips. "Saved" lists the site's templates. */
export type Chip = "all" | "layout" | "media" | "text" | "saved";
export type Entry = { type: string; label: string; chip: Exclude<Chip, "all" | "saved">; hint: string };

const SECTIONS: Entry[] = [
  { type: "FlowSection", label: "Section", chip: "layout", hint: "Blocks stacked in a column" },
  { type: "GridSection", label: "Grid", chip: "layout", hint: "Blocks in columns" },
  { type: "CanvasSection", label: "Free layout", chip: "layout", hint: "Place layers anywhere" },
];
const TEXT = new Set(["Text", "Button", "Code"]);
const KIND: Record<string, Section["kind"]> = { FlowSection: "flow", GridSection: "grid", CanvasSection: "canvas" };

/** Short card names: "Projects: the table of work" → "Projects". */
const short = (label: string) => label.split(":")[0]!.replace(/\s*\(.*\)$/, "");

/** Every block that can be added, grouped by chip (sections first). */
export const CATALOG: Entry[] = [
  ...SECTIONS,
  ...components.map((c) => ({
    type: c.type,
    label: short(c.label),
    chip: (TEXT.has(c.type) ? "text" : c.category === "media" || c.category === "embed" ? "media" : "layout") as Entry["chip"],
    hint: c.label,
  })),
];

export const entryFor = (type: string) => CATALOG.find((e) => e.type === type);

export function filterCatalog(query: string, chip: Chip): Entry[] {
  const q = query.trim().toLowerCase();
  return CATALOG.filter((e) => (chip === "all" || e.chip === chip) && (!q || `${e.label} ${e.hint} ${e.type}`.toLowerCase().includes(q)));
}

/** The name of what a new block goes below ("Projects"), or null for the end of the page. */
export function insertAnchorName(page: Page, selected: string | undefined): string | null {
  const at = selected ? locate(page, selected) : null;
  if (!at || at.kind === "overlay") return null;
  if (at.kind === "section") return at.section.name ?? short(getComponent(at.section.children[0]?.type ?? "")?.label ?? "the section");
  return at.node.name ?? short(getComponent(at.node.type)?.label ?? at.node.type);
}

/**
 * Where a new block goes: after the selected block in its section (flow and
 * grid), otherwise in a new section right after the selected one, or at the
 * end of the page when nothing is selected.
 */
export function placeBlock(page: Page, selected: string | undefined, type: string): { page: Page; id: string } {
  const at = selected ? locate(page, selected) : null;
  const sectionIndex = at && at.kind !== "overlay" ? page.sections.indexOf(at.section) + 1 : page.sections.length;
  if (KIND[type]) {
    const section = createSection(KIND[type]);
    return { page: addSection(page, section, sectionIndex), id: section.id };
  }
  const node = createNode(type);
  if (at?.kind === "node" && at.section.kind !== "canvas") {
    return { page: addNode(page, at.section.id, node, at.section.children.indexOf(at.node) + 1), id: node.id };
  }
  const section = createSection("flow", { children: [node] });
  return { page: addSection(page, section, sectionIndex), id: node.id };
}

/** Add a block below the selection (one undo step) and select it. */
export function insertBlock(type: string) {
  const state = getState();
  const page = currentPage(state);
  let id = "";
  updatePage(
    page.id,
    (p) => {
      const placed = placeBlock(p, state.selection[0], type);
      id = placed.id;
      return placed.page;
    },
    `Add ${entryFor(type)?.label ?? type}`,
  );
  if (id) selectBlock(id);
  return id;
}
