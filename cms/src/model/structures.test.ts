import { describe, expect, it } from "vitest";
import { demoSite } from "../demo/site";
import { AEROBOTICS_TEMPLATES } from "../editor/templates/aerobotics-templates";
import { validateSite } from "../schema";
import { createPage } from "./pages";
import { LEGACY_PAGE_TEMPLATES, STRUCTURES } from "./structures";

describe("starting layouts", () => {
  it("are the eight everyday layouts, none from the old portfolio starters", () => {
    expect(STRUCTURES.map((s) => s.name)).toEqual(["Blank", "Landing page", "Product", "Pricing", "About", "Contact", "Article", "Event"]);
    expect(LEGACY_PAGE_TEMPLATES).toEqual(["blank", "gallery", "diary", "playlist"]);
  });

  it("each makes a valid page with the page's name as its heading and fresh ids", () => {
    for (const s of STRUCTURES) {
      const { site, pageId } = createPage(demoSite, { name: `Test ${s.name}`, sections: s.sections(), structureId: s.id });
      expect(validateSite(site).ok, s.id).toBe(true);
      const page = site.pages.find((p) => p.id === pageId)!;
      expect(page.template).toBe(s.id);
      expect(JSON.stringify(page)).toContain(`Test ${s.name}`);
      expect(s.sections()[0]!.id).not.toBe(s.sections()[0]!.id);
    }
  });

  it("keeps a point's picture, title and words in one column, words before the picture on phones", () => {
    const landing = STRUCTURES.find((s) => s.id === "landing")!.sections();
    const points = landing.find((s) => s.name === "Points")!;
    expect(points.stacks).toBe(3);
    expect(points.children.filter((n) => n.col === 0).map((n) => n.type)).toEqual(["Image", "Text", "Text"]);
    const hero = landing[0]!;
    expect(hero.stacks).toBe(2);
    expect(hero.children.filter((n) => n.col === 0).map((n) => n.type)).toEqual(["Text", "Text", "Text", "Button"]);
    expect(hero.children.find((n) => n.col === 1)!.content).toMatchObject({ src: "" });
  });

  it("points at Aerobotics templates that exist (used in the demo)", () => {
    for (const s of STRUCTURES.filter((x) => x.aero)) expect(AEROBOTICS_TEMPLATES.some((t) => t.id === s.aero), s.id).toBe(true);
  });
});
