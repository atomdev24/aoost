import { addNode, addSection, createNode, createSection, locate } from "../../model/page-ops";
import type { Page, Section } from "../../schema";
import { currentPage, getState, updatePage } from "../store";

/**
 * The top bar's tools. Select is the resting mode; the others place something
 * new next to the selection and hand back to Select, so there is never a
 * hidden mode to get stuck in.
 */
export type Tool = "select" | "frame" | "section" | "text" | "image" | "comment" | "claude";

export const TOOLS: { id: Tool; label: string; key?: string; icon: string }[] = [
  { id: "select", label: "Select", key: "V", icon: "M3 2.5l9 4.5-4 1.2L6.5 12z" },
  { id: "frame", label: "Frame: add a free-layout section", key: "F", icon: "M4 1.5v13M12 1.5v13M1.5 4h13M1.5 12h13" },
  { id: "section", label: "Section: add a section", icon: "M2 3h12v10H2zM2 8h12" },
  { id: "text", label: "Text: add text", key: "T", icon: "M3 3.5h10M8 3.5v9" },
  { id: "image", label: "Image: add an image", icon: "M2 3h12v10H2zM2 11l4-4 3 3 2-2 3 3" },
  { id: "comment", label: "Comment: click anything to comment on it", key: "C", icon: "M8 2.5a5.5 5 0 1 1-3.2 9.1L2.5 13l.9-2.6A5 5 0 0 1 8 2.5z" },
  { id: "claude", label: "Ask Claude", icon: "M2.5 3h11v7.5H6l-3.5 3z" },
];

/** The section the selection is in (or the last one): where new blocks go. */
function targetSection(page: Page): Section | undefined {
  const id = getState().selection[0];
  const at = id ? locate(page, id) : null;
  if (at && (at.kind === "section" || at.kind === "node")) return at.section;
  return page.sections[page.sections.length - 1];
}

/** Adds the block and returns its id (the caller selects it). */
export function runTool(tool: Tool): string | null {
  const page = currentPage(getState());
  if (tool === "frame" || tool === "section") {
    const after = targetSection(page);
    const index = after ? page.sections.indexOf(after) + 1 : page.sections.length;
    const section = createSection(tool === "frame" ? "canvas" : "flow");
    updatePage(page.id, (p) => addSection(p, section, index), tool === "frame" ? "Add free-layout section" : "Add section");
    return section.id;
  }
  if (tool === "text" || tool === "image") {
    let section = targetSection(page);
    if (!section) {
      section = createSection("flow");
      const s = section;
      updatePage(page.id, (p) => addSection(p, s), "Add section");
    }
    const inCanvas = section.kind === "canvas";
    const node = createNode(tool === "text" ? "Text" : "Image", inCanvas ? { style: { x: 24, y: 24, w: tool === "text" ? 240 : 200, h: tool === "text" ? 60 : 160 } } : {});
    const sectionId = section.id;
    updatePage(page.id, (p) => addNode(p, sectionId, node), tool === "text" ? "Add Text" : "Add Image");
    return node.id;
  }
  return null;
}
