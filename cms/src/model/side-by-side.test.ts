import { describe, expect, it } from "vitest";
import type { Page } from "../schema";
import { createNode, createSection } from "./page-ops";
import { placeBeside } from "./side-by-side";

const pageWith = (...ids: string[]): Page => ({
  id: "p",
  title: "P",
  slug: "/p",
  sections: [createSection("flow", { id: "s1", children: ids.map((id) => createNode(id === "img" ? "Image" : "Text", { id })) })],
  overlays: [],
} as unknown as Page);

describe("placeBeside", () => {
  it("splits a stacked section around the target into a two-column row", () => {
    const p = placeBeside(pageWith("a", "img", "b", "t"), "img", "t", "right");
    expect(p.sections.map((s) => [s.kind, s.children.map((n) => n.id)])).toEqual([
      ["flow", ["a"]],
      ["grid", ["img", "t"]],
      ["flow", ["b"]],
    ]);
    expect(p.sections[1]!.layout.desktop?.columns).toBe(2);
    expect(p.sections[1]!.layout.base.columns).toBe(1);
  });
  it("puts a new block on the left, keeping the section id when nothing is before it", () => {
    const p = placeBeside(pageWith("img"), "img", createNode("Text", { id: "new" }), "left");
    expect(p.sections).toHaveLength(1);
    expect(p.sections[0]!.id).toBe("s1");
    expect(p.sections[0]!.children.map((n) => n.id)).toEqual(["new", "img"]);
  });
  it("just inserts beside the target in a grid that already has columns", () => {
    const page = pageWith("img", "t");
    page.sections[0] = { ...page.sections[0]!, kind: "grid", layout: { base: { columns: 1, gap: 10, padding: "0px" }, desktop: { columns: 3 } } };
    const p = placeBeside(page, "img", createNode("Text", { id: "n" }), "left");
    expect(p.sections[0]!.children.map((n) => n.id)).toEqual(["n", "img", "t"]);
  });
  it("does nothing when a block is dropped beside itself", () => {
    const page = pageWith("img");
    expect(placeBeside(page, "img", "img", "left")).toBe(page);
  });
});
