/**
 * The site's published content, read straight from content/, so browser tests
 * take their expected values from it and don't break when Alex edits the site.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const content = resolve(dirname(fileURLToPath(import.meta.url)), "../../content");
const read = (path: string) => JSON.parse(readFileSync(resolve(content, path), "utf8"));

type Node = { type: string; content: Record<string, any> };
export type ContentPage = { id: string; title: string; slug: string; parentId: string | null; status: string; showInNav: boolean; sections: { id: string; layout?: { base?: { hidden?: boolean } }; children: Node[] }[] };

export const site = () => read("site.json");
export const pages = (): ContentPage[] => readdirSync(resolve(content, "pages")).filter((f) => f.endsWith(".json")).map((f) => read(`pages/${f}`));
export const page = (id: string) => pages().find((p) => p.id === id)!;

/** The first block of this type on the homepage. */
export function homeBlock(type: string): Record<string, any> {
  const node = page("home").sections.map((s) => s.children[0]).find((n) => n?.type === type);
  if (!node) throw new Error(`no ${type} on the homepage`);
  return node.content;
}

/** The project pieces that show on the table (hidden ones aren't rendered). */
export const visibleProjects = (): { image: string; title?: string }[] => homeBlock("AoostProjects").projects.filter((p: { hidden?: boolean }) => !p.hidden);

/** Titles of a page's sub-pages that show in the nav, in the site's page order. */
export function navSubPages(parentId: string): string[] {
  const order: string[] = site().pageOrder ?? [];
  return pages()
    .filter((p) => p.parentId === parentId && p.showInNav)
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((p) => p.title);
}

export const fileName = (src: string) => src.split("/").pop()!;
