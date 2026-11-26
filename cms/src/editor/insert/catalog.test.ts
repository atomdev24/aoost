// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createNode, createSection } from "../../model/page-ops";
import type { Page } from "../../schema";
import { CATALOG, placeBlock } from "./catalog";

const page = (): Page =>
  ({ id: "p", title: "P", slug: "/", parentId: null, status: "published", template: "blank", seo: {}, isHome: true, showInNav: false, overlays: [], sections: [createSection("flow", { id: "s1", children: [createNode("Text", { id: "t1" })] })] }) as unknown as Page;

describe("adding blocks", () => {
  it("gives an Aerobotics band its own edge-to-edge section, even with a block selected", () => {
    const { page: next, id } = placeBlock(page(), "t1", "AeroCta");
    expect(next.sections).toHaveLength(2);
    const s = next.sections[1]!;
    expect(s.children[0]!.id).toBe(id);
    expect(s.layout.base.padding).toBe("0px");
    expect(s.layout.base.maxWidth).toBeUndefined();
  });
  it("keeps adding everyday blocks next to the selection", () => {
    const { page: next } = placeBlock(page(), "t1", "Button");
    expect(next.sections).toHaveLength(1);
    expect(next.sections[0]!.children).toHaveLength(2);
  });
  it("lists the aoost blocks under Brand in the real editor and keeps the Aerobotics pack for the demo", () => {
    const brand = CATALOG.filter((e) => e.chip === "brand").map((e) => e.type);
    expect(brand).toContain("AoostHero");
    expect(brand).not.toContain("AeroHero");
  });
});
