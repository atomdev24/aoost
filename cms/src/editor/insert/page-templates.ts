import { createNode, createSection } from "../../model/page-ops";
import type { Section } from "../../schema";

/**
 * Built-in starting points for an empty page, made from existing blocks.
 * Plain wording, no theme dressing: Alex fills them in.
 */
export type PageStarter = { id: string; name: string; hint: string; sections: (title: string) => Section[] };

const text = (text: string, styleId: string, tag: "h1" | "h2" | "p") => createNode("Text", { content: { text, styleId, tag } });

export const BUILTIN_STARTERS: PageStarter[] = [
  {
    id: "journal-entry",
    name: "Journal entry",
    hint: "Title, date, a picture and the entry",
    sections: (title) => [
      createSection("flow", {
        name: "Entry",
        children: [text(title, "h1", "h1"), text("Date · place", "label", "p"), createNode("Image"), text("Write the entry here.", "body", "p")],
      }),
    ],
  },
  {
    id: "gallery-page",
    name: "Gallery page",
    hint: "A title, a short line and a grid of pictures",
    sections: (title) => [
      createSection("flow", { name: "Intro", children: [text(title, "h1", "h1"), text("A short line about these pictures.", "body", "p")] }),
      createSection("flow", { name: "Pictures", children: [createNode("GalleryGrid")] }),
    ],
  },
];

/**
 * A page with nothing on it yet: no blocks, or only the title heading that
 * the Blank template gives a new page.
 */
export function isEmptyPage(page: { sections: Section[]; overlays: unknown[] }): boolean {
  if (page.overlays.length) return false;
  const nodes = page.sections.flatMap((s) => s.children);
  return nodes.length === 0 || (nodes.length === 1 && nodes[0]!.type === "Text" && nodes[0]!.content.tag === "h1");
}
