import { describe, expect, it } from "vitest";
import { demoSite } from "../demo/site";
import { validateSite, type Node, type Page } from "../schema";
import { copyOf, copyStyle, pasteClip, pasteStyle } from "./clipboard";
import { createNode, locate } from "./page-ops";

const page = (): Page => structuredClone(demoSite.pages.find((p) => p.id === "about-us")!);

describe("copy and paste", () => {
  it("pastes a block right after the one selected, with a new id", () => {
    const p = page();
    const target = p.sections[3]!.children[0]!;
    const clip = copyOf(p, target.id)!;
    const { page: next, id } = pasteClip(p, clip, target.id);
    expect(id).not.toBe(target.id);
    const at = locate(next, id)!;
    expect(at.kind === "node" && at.section.id).toBe(p.sections[3]!.id);
    expect(at.kind === "node" && at.index).toBe(1);
    expect(validateSite({ ...demoSite, pages: demoSite.pages.map((x) => (x.id === next.id ? next : x)) }).ok).toBe(true);
  });
  it("pastes a section after the section, and at the end with nothing selected", () => {
    const p = page();
    const clip = copyOf(p, p.sections[1]!.id)!;
    const after = pasteClip(p, clip, p.sections[1]!.id);
    expect(after.page.sections[2]!.id).toBe(after.id);
    expect(after.page.sections[2]!.children[0]!.id).not.toBe(p.sections[1]!.children[0]!.id);
    const end = pasteClip(p, copyOf(p, p.sections[0]!.children[0]!.id)!, null);
    expect(end.page.sections.at(-1)!.children[0]!.id).toBe(end.id);
  });
});

describe("copy and paste style", () => {
  const text = (styleId: string, style: Node["style"]): Node => ({ ...createNode("Text", { content: { text: "x", styleId, tag: "p" } }), style });
  it("carries the look and the text style, never the size or place", () => {
    const from = text("h2", { base: { color: "#ff0000", fontWeight: 700, width: "50%", margin: "0 0 20px" }, desktop: { fontSize: 40, x: 10 } });
    const to = text("body", { base: { width: "100%", color: "#000000" }, desktop: { x: 300 } });
    const out = pasteStyle(to, copyStyle(from));
    expect(out.content.styleId).toBe("h2");
    expect(out.style.base).toEqual({ width: "100%", color: "#ff0000", fontWeight: 700 });
    expect(out.style.desktop).toEqual({ x: 300, fontSize: 40 });
  });
  it("doesn't change another kind of block's content", () => {
    const img = createNode("Image", { content: { src: "/a.webp", alt: "a" } });
    const out = pasteStyle(img, copyStyle(text("h1", { base: { radius: [8, 8, 8, 8] } })));
    expect(out.content).toEqual(img.content);
    expect(out.style.base.radius).toEqual([8, 8, 8, 8]);
  });
});
