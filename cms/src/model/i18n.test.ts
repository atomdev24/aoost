import { describe, expect, it } from "vitest";
import type { Page } from "../schema";
import { applyTranslation, fitFor, mergeTranslatedEdit, translatedSlug, untranslatedIds } from "./i18n";

const node = (id: string, text: string) => ({ id, type: "Text", content: { text, styleId: "h1", tag: "h1" }, style: { base: {} } });
const page = (): Page =>
  ({
    id: "truefruit",
    title: "TrueFruit",
    slug: "/truefruit",
    parentId: null,
    status: "published",
    template: "blank",
    seo: {},
    isHome: false,
    showInNav: true,
    overlays: [],
    sections: [{ id: "s1", kind: "flow", layout: { base: {} }, children: [node("h", "Know your fruit"), node("p", "Sizing in the orchard")] }],
    translations: { es: { status: "published", title: "TrueFruit ES", content: { h: { text: "Conozca su fruta en el huerto, árbol por árbol" } } } },
  }) as unknown as Page;

describe("linked translations", () => {
  it("reads a page in Spanish over the shared structure, at /es/…", () => {
    const es = applyTranslation(page(), "es");
    expect(es.title).toBe("TrueFruit ES");
    expect(es.slug).toBe("/es/truefruit");
    expect(es.sections[0]!.children[0]!.content.text).toContain("Conozca");
    expect(es.sections[0]!.children[1]!.content.text).toBe("Sizing in the orchard");
    expect(translatedSlug({ slug: "/" }, "es")).toBe("/es");
  });
  it("shrinks text that came out much longer, a little", () => {
    expect(fitFor(100, 110)).toBeUndefined();
    expect(fitFor(100, 150)).toBe(0.82);
    expect(applyTranslation(page(), "es").sections[0]!.children[0]!.fit).toBeLessThan(1);
  });
  it("keeps Spanish edits in the translation and shares structure", () => {
    const base = page();
    const view = applyTranslation(base, "es");
    const edited = structuredClone(view);
    edited.sections[0]!.children[1]!.content.text = "Calibre en el huerto";
    edited.sections[0]!.children[1]!.style = { base: { maxWidth: "40ch" } } as never;
    edited.sections[0]!.children.push(node("new", "A new block") as never);
    const merged = mergeTranslatedEdit(base, edited, "es");
    expect(merged.sections[0]!.children[1]!.content.text).toBe("Sizing in the orchard");
    expect(merged.translations!.es!.content.p).toEqual({ text: "Calibre en el huerto" });
    expect(merged.translations!.es!.style!.p).toEqual({ base: { maxWidth: "40ch" } });
    expect(merged.translations!.es!.content.h!.text).toContain("Conozca");
    expect(merged.sections[0]!.children.map((n) => n.id)).toEqual(["h", "p", "new"]);
    expect(merged.sections[0]!.children[0]!.fit).toBeUndefined();
  });
  it("lists blocks still to translate", () => {
    expect(untranslatedIds(page(), "es")).toEqual(["p"]);
  });
});
