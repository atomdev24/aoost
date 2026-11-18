import { describe, expect, it } from "vitest";
import { BUILTIN_STARTERS, isEmptyPage } from "./page-templates";

describe("empty page starters", () => {
  it("treats a page with no blocks, or only its title, as empty", () => {
    const title = { id: "n1", type: "Text", content: { text: "T", styleId: "h1", tag: "h1" }, style: { base: {} } };
    const body = { ...title, id: "n2", content: { text: "x", styleId: "body", tag: "p" } };
    const page = (children: unknown[]) => ({ overlays: [], sections: [{ children }] }) as never;
    expect(isEmptyPage(page([]))).toBe(true);
    expect(isEmptyPage(page([title]))).toBe(true);
    expect(isEmptyPage(page([title, body]))).toBe(false);
  });
  it("builds the two built-in starters from existing blocks, titled after the page", () => {
    const [journal, gallery] = BUILTIN_STARTERS.map((s) => s.sections("Cape Town"));
    expect(journal![0]!.children.map((n) => n.type)).toEqual(["Text", "Text", "Image", "Text"]);
    expect(journal![0]!.children[0]!.content.text).toBe("Cape Town");
    expect(gallery!.flatMap((s) => s.children.map((n) => n.type))).toContain("GalleryGrid");
  });
});
