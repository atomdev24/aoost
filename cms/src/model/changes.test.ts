import { describe, expect, it } from "vitest";
import { summarizeChanges } from "./changes";

const node = (id: string, text: string) => ({ id, type: "Text", name: id, content: { text }, style: { base: {} } });
const page = (id: string, title: string, nodes: ReturnType<typeof node>[]) => ({ id, title, slug: "/", parentId: null, status: "published", template: "blank", seo: {}, isHome: false, showInNav: true, overlays: [], sections: [{ id: `${id}-s`, kind: "flow", layout: { base: { columns: 1, gap: 0, padding: "0px" } }, children: nodes }] });
const site = (pages: unknown[], theme = {}) => ({ pages, theme, nav: {}, settings: {}, globals: [], templates: [], collections: {}, redirects: [] }) as never;

describe("publish change summary", () => {
  it("lists changed pages and blocks, and counts them", () => {
    const before = site([page("home", "Home", [node("a", "1"), node("b", "2")]), page("about", "About", [])]);
    const after = site([page("home", "Home", [node("a", "1 changed"), node("b", "2"), node("c", "new")]), page("about", "About", [])], { colors: {} });
    const s = summarizeChanges(before, after);
    expect(s.pages).toEqual([
      { id: "home", title: "Home", items: ["a", "Added c"] },
      { id: "site", title: "Site", items: ["Theme"] },
    ]);
    expect(s.count).toBe(3);
  });
  it("is empty when nothing changed", () => {
    const a = site([page("home", "Home", [node("a", "1")])]);
    expect(summarizeChanges(a, a)).toEqual({ count: 0, pages: [] });
  });
});
