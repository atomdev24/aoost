import { describe, expect, it } from "vitest";
import { Page, Site } from "../schema";
import { seedSite } from "../seed/site";
import { addNode, addSection, createNode, createOverlay, createSection, duplicate, isHidden, locate, moveNode, moveSection, nudgeOrder, remove, rename, setHidden, setLocked, updateNode, updateOverlay } from "./page-ops";

const home = Site.parse(seedSite).pages[0]!;
const ids = (p: typeof home) => p.sections.map((s) => s.id);
const kids = (p: typeof home, id: string) => p.sections.find((s) => s.id === id)!.children.map((n) => n.id);
const valid = (p: typeof home) => Page.safeParse(p).success;

describe("page ops", () => {
  it("locates sections, nodes and overlays", () => {
    expect(locate(home, "home-art")).toMatchObject({ kind: "section", index: 1 });
    expect(locate(home, "home-photo")).toMatchObject({ kind: "node", index: 1 });
    expect(locate(home, "nope")).toBeNull();
  });
  it("updates a node without touching anything else", () => {
    const next = updateNode(home, "home-title", (n) => ({ ...n, content: { ...n.content, text: "Hi" } }));
    expect(locate(next, "home-title")).toMatchObject({ node: { content: { text: "Hi" } } });
    expect(next.sections[1]).toBe(home.sections[1]);
    expect(updateNode(home, "nope", (n) => ({ ...n }))).toBe(home);
    expect(home.sections[0]!.children[1]!.content.text).toBe("A visual diary, for people in the know.");
  });
  it("reorders sections and nodes", () => {
    expect(ids(moveSection(home, "home-latest", 0))).toEqual(["home-latest", "home-hero", "home-art", "home-footer"]);
    expect(ids(nudgeOrder(home, "home-hero", 1))).toEqual(["home-art", "home-hero", "home-latest", "home-footer"]);
    expect(nudgeOrder(home, "home-hero", -1)).toBe(home);
    expect(kids(nudgeOrder(home, "home-title", -1), "home-hero").slice(0, 2)).toEqual(["home-title", "home-kicker"]);
  });
  it("moves a node into another section", () => {
    const next = moveNode(home, "home-cta", "home-latest", 1);
    expect(kids(next, "home-hero")).not.toContain("home-cta");
    expect(kids(next, "home-latest")[1]).toBe("home-cta");
    expect(valid(next)).toBe(true);
  });
  it("renames, locks and hides per breakpoint", () => {
    expect(locate(rename(home, "home-art", "  Desert "), "home-art")).toMatchObject({ section: { name: "Desert" } });
    expect(locate(setLocked(home, "home-photo", true), "home-photo")).toMatchObject({ node: { locked: true } });
    const hiddenDesktop = setHidden(home, "home-photo", "desktop", true);
    const node = (locate(hiddenDesktop, "home-photo") as { node: typeof home.sections[0]["children"][0] }).node;
    expect(isHidden(node, "desktop")).toBe(true);
    expect(isHidden(node, "mobile")).toBe(false);
    // hidden on mobile, shown again on desktop
    const both = setHidden(setHidden(home, "home-photo", "mobile", true), "home-photo", "desktop", false);
    const n2 = (locate(both, "home-photo") as { node: typeof node }).node;
    expect([isHidden(n2, "mobile"), isHidden(n2, "desktop")]).toEqual([true, false]);
    const section = setHidden(home, "home-latest", "mobile", true).sections[2]!;
    expect(isHidden(section, "mobile")).toBe(true);
  });
  it("adds sections and nodes with component defaults", () => {
    const section = createSection("grid");
    const node = createNode("Text", { content: { text: "New" } });
    const next = addNode(addSection(home, section, 1), section.id, node);
    expect(ids(next)[1]).toBe(section.id);
    expect(kids(next, section.id)).toEqual([node.id]);
    expect(node.content).toMatchObject({ text: "New", styleId: "body", tag: "p" });
    expect(createNode("Image").frame).toBeDefined();
    expect(() => createNode("Nope")).toThrow();
    expect(valid(next)).toBe(true);
  });
  it("duplicates with fresh ids", () => {
    const next = duplicate(home, "home-latest");
    expect(next.sections).toHaveLength(5);
    const copy = next.sections[3]!;
    expect(copy.id).not.toBe("home-latest");
    expect(copy.children.map((n) => n.type)).toEqual(home.sections[2]!.children.map((n) => n.type));
    expect(new Set([...copy.children, ...home.sections[2]!.children].map((n) => n.id)).size).toBe(8);
  });
  it("manages overlays, and removes those anchored to a deleted section", () => {
    const overlay = createOverlay("Button", { sectionId: "home-art", edge: "top" });
    let page = { ...home, overlays: [overlay, createOverlay("Text", "viewport")] };
    expect(valid(page)).toBe(true);
    page = updateOverlay(page, overlay.id, (o) => ({ ...o, sticky: true }));
    expect(page.overlays[0]!.sticky).toBe(true);
    expect(locate(page, overlay.node.id)).toMatchObject({ kind: "overlay" });
    expect(updateNode(page, overlay.node.id, (n) => ({ ...n, name: "Badge" })).overlays[0]!.node.name).toBe("Badge");
    const gone = remove(page, "home-art");
    expect(gone.overlays).toHaveLength(1);
    expect(gone.overlays[0]!.anchor).toBe("viewport");
    expect(remove(page, overlay.id).overlays).toHaveLength(1);
    expect(kids(remove(home, "home-cta"), "home-hero")).not.toContain("home-cta");
  });
});
