// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";
import { aeroboticsComponents } from "./index";
import { aeroboticsFields } from "./fields";
import { productSplit } from "./AeroSplit/AeroSplit";
import { PRODUCT_CARDS } from "./AeroProductCard/AeroProductCard";
import { parseSeries } from "./charts";
import { NODE_META } from "../../editor/puck/adapter";
import { components } from "../registry";

describe("the Aerobotics pack", () => {
  it("has fields for every block, valid defaults and one shared kit", () => {
    for (const c of aeroboticsComponents) {
      expect(c.category).toBe("aerobotics");
      expect(c.kit?.id).toBe("aerobotics");
      expect(c.schema.safeParse(c.defaults.content).success, c.type).toBe(true);
      expect(aeroboticsFields, c.type).toHaveProperty(c.type);
      for (const key of Object.keys(c.defaults.content as object)) expect(aeroboticsFields[c.type as keyof typeof aeroboticsFields], `${c.type}.${key}`).toHaveProperty(key);
    }
  });
  it("never lets a script link through, and never navigates in the editor", () => {
    for (const c of aeroboticsComponents) {
      const content = JSON.parse(JSON.stringify(c.defaults.content).replace(/https:\/\/[^"]+/g, "javascript:alert(1)"));
      expect(renderNode(c.type, content), c.type).not.toContain("javascript:");
      expect(renderNode(c.type, c.defaults.content as Record<string, unknown>, { editing: true }), c.type).not.toMatch(/<a [^>]*href="https:/);
    }
  });
  it("tints the hero with a chosen overlay colour, and refuses anything that isn't a colour", () => {
    const hero = aeroboticsComponents.find((c) => c.type === "AeroHero")!;
    expect(renderNode("AeroHero", { ...hero.defaults.content, shadeColour: "token:sky", shade: 30 })).toContain("color-mix(in srgb, var(--c-sky) 50%, transparent)");
    expect(renderNode("AeroHero", { ...hero.defaults.content, align: "center", shadeColour: "#112233", shade: 30 })).toContain("background:color-mix(in srgb, #112233 30%, transparent)");
    expect(hero.schema.safeParse({ ...hero.defaults.content, shadeColour: "red;background:url(x)" }).success).toBe(false);
  });
  it("escapes text", () => {
    expect(renderNode("AeroCta", { ...aeroboticsComponents.find((c) => c.type === "AeroCta")!.defaults.content, title: "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
  it("ships the product-page split and the home page's three product cards as valid content", () => {
    const split = aeroboticsComponents.find((c) => c.type === "AeroSplit")!;
    expect(split.schema.safeParse(productSplit()).success).toBe(true);
    const card = aeroboticsComponents.find((c) => c.type === "AeroProductCard")!;
    for (const p of PRODUCT_CARDS) expect(card.schema.safeParse(p).success).toBe(true);
  });
  it("reads line series with a dashed forecast from the ~", () => {
    expect(parseSeries("A | #000 | 1, 2, ~3, 4")).toEqual([{ name: "A", color: "#000", values: [1, 2, 3, 4], forecastFrom: 2 }]);
  });
  it("no block has a setting named like the editor's own block properties (id, name, style…), which the canvas would drop", () => {
    for (const c of components) for (const key of Object.keys(c.defaults.content as object)) expect(NODE_META as readonly string[], `${c.type}.${key}`).not.toContain(key);
  });
});
