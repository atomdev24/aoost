import { describe, expect, it } from "vitest";
import "../../components/registry";
import { createNode, createSection } from "../../model/page-ops";
import { setOnly } from "../../responsive/resolve";
import { DEFAULT_FRAME_FIT, type Page } from "../../schema";
import { blockOverrides, countMobileOverrides, resetBlockOverrides } from "../board/overrides";
import { itemPathOfField, nodeSlots, slotOf, withSlotFrame } from "./slots";

const hero = createNode("AoostHero", { id: "h1", content: { reel: [{ src: "a.jpg", alt: "" }, { src: "b.jpg", alt: "" }] } });
const page = (n = hero): Page => ({ id: "p1", slug: "", title: "Home", status: "published", seo: {}, sections: [createSection("flow", { id: "s1", children: [n] })], overlays: [] }) as unknown as Page;

describe("frame slots in the editor", () => {
  it("finds a field's item from Puck's field name", () => {
    expect(itemPathOfField("reel[1].src")).toEqual(["reel", 1]);
    expect(itemPathOfField("note.image")).toEqual(["note"]);
    expect(itemPathOfField("label")).toBeNull();
  });

  it("an edit on Mobile becomes a mobile override; desktop keeps its framing", () => {
    const r = setOnly({ base: DEFAULT_FRAME_FIT }, "mobile", { ...DEFAULT_FRAME_FIT, focalX: 10 });
    const n = withSlotFrame(hero, ["reel", 1], r);
    expect((n.content.reel as unknown[])[0]).toEqual({ src: "a.jpg", alt: "" });
    expect(slotOf(n, ["reel", 1])!.frame).toEqual({ base: { ...DEFAULT_FRAME_FIT, focalX: 10 }, desktop: { focalX: 50 } });
    expect(blockOverrides(page(n), "h1")).toBe(1);
    expect(countMobileOverrides(page(n)) - countMobileOverrides(page())).toBe(1);
    // "Reset all" brings mobile back to desktop's framing.
    const reset = resetBlockOverrides(page(n), "h1").sections[0]!.children[0]!;
    expect(nodeSlots(reset)[1]!.frame).toEqual({ base: DEFAULT_FRAME_FIT });
    expect(blockOverrides(page(reset), "h1")).toBe(0);
  });

  it("writes out a block's default list before framing one of its items", () => {
    const bare = { ...createNode("AoostHero", { id: "h2" }), content: { label: "x" } };
    const n = withSlotFrame(bare, ["reel", 0], { base: DEFAULT_FRAME_FIT });
    expect((n.content.reel as { src: string }[])[0]!.src).toBe("/art/hero.jpg");
    expect(n.content.label).toBe("x");
  });
});
