import { components, getComponent } from "../../components/registry";
import { addNode, addSection, createNode, createSection, locate } from "../../model/page-ops";
import type { Page, Section } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";

/**
 * The Insert flyout's tabs (UI spec, Nov 2026): Basics are the everyday blocks, Brand the
 * site-specific ones (TrueFruit, the aoost blocks), Motion the animated ones, More the rest.
 * "Saved" lists the site's templates. "all" is for search and quick insert.
 */
export type Chip = "all" | "basics" | "brand" | "motion" | "more" | "saved";
export type Group = "layout" | "content" | "global";
export type Entry = { type: string; label: string; chip: Exclude<Chip, "all" | "saved">; group?: Group; hint: string };

const SECTIONS: Entry[] = [
  { type: "FlowSection", label: "Section", chip: "basics", group: "layout", hint: "Blocks stacked in a column" },
  { type: "GridSection", label: "Grid", chip: "basics", group: "layout", hint: "Blocks in columns" },
  { type: "CanvasSection", label: "Free layout", chip: "basics", group: "layout", hint: "Place layers anywhere" },
];
const BASIC_CONTENT = new Set(["Text", "Image", "Video", "Button", "Shape", "Cards"]);
const BASIC_LAYOUT = new Set(["Spacer", "Divider"]);
const BASIC_GLOBAL = new Set(["Global", "Footer"]);
const MOTION = new Set(["Lottie", "Model3D"]);
const BRAND = new Set(["TrueFruitSeason", "FruitReading"]);
const KIND: Record<string, Section["kind"]> = { FlowSection: "flow", GridSection: "grid", CanvasSection: "canvas" };

/** Short card names: "Projects: the table of work" → "Projects". */
const short = (label: string) => label.split(":")[0]!.replace(/\s*\(.*\)$/, "");

function place(type: string, category: string): Pick<Entry, "chip" | "group"> {
  if (BASIC_CONTENT.has(type)) return { chip: "basics", group: "content" };
  if (BASIC_LAYOUT.has(type)) return { chip: "basics", group: "layout" };
  if (BASIC_GLOBAL.has(type)) return { chip: "basics", group: "global" };
  if (MOTION.has(type)) return { chip: "motion" };
  if (BRAND.has(type) || category === "aoost") return { chip: "brand" };
  return { chip: "more" };
}

/** Every block that can be added (sections first). */
export const CATALOG: Entry[] = [
  ...SECTIONS,
  ...components.filter((c) => c.type !== "FruitReading").map((c) => ({ type: c.type, label: short(c.label), hint: c.label, ...place(c.type, c.category) })),
];

export const entryFor = (type: string) => CATALOG.find((e) => e.type === type);

export function filterCatalog(query: string, chip: Chip): Entry[] {
  const q = query.trim().toLowerCase();
  // Searching looks across every tab.
  return CATALOG.filter((e) => (q || chip === "all" ? true : e.chip === chip) && (!q || `${e.label} ${e.hint} ${e.type}`.toLowerCase().includes(q)));
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
