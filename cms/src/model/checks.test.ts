import { describe, expect, it } from "vitest";
import { demoSite } from "../demo/site";
import type { Site } from "../schema";
import { createNode, createSection } from "./page-ops";
import { publishChecks } from "./checks";

const withPage = (site: Site, children: ReturnType<typeof createNode>[], extra: Record<string, unknown> = {}): Site => ({
  ...site,
  pages: [
    ...site.pages,
    { ...site.pages[0]!, id: "chk", slug: "/chk", title: "Check", status: "published", seo: { description: "Fine" }, sections: [createSection("flow", { children })], overlays: [], translations: undefined, ...extra } as Site["pages"][number],
  ],
});

describe("publish checks", () => {
  const base = demoSite();
  it("flags pictures without a description and empty pictures", () => {
    const site = withPage(base, [createNode("Image", { id: "a", content: { src: "/media/x.jpg", alt: "" } }), createNode("Image", { id: "b", content: { src: "" } })]);
    const c = publishChecks(site, { pageIds: ["chk"] });
    expect(c.map((x) => x.kind)).toEqual(expect.arrayContaining(["alt", "empty"]));
    expect(c.find((x) => x.kind === "alt")!.nodeId).toBe("a");
  });
  it("flags links to addresses that aren't pages, and not ones that are", () => {
    const site = withPage(base, [createNode("Text", { id: "t", content: { text: "Go [here](/nowhere) or [home](/) or [check](/chk)" } })]);
    const links = publishChecks(site, { pageIds: ["chk"] }).filter((x) => x.kind === "link");
    expect(links).toHaveLength(1);
    expect(links[0]!.text).toContain("/nowhere");
  });
  it("asks for a search description and an end date on campaign pages", () => {
    const site = withPage(base, [], { seo: {}, kind: "campaign" });
    const kinds = publishChecks(site, { pageIds: ["chk"] }).map((x) => x.kind);
    expect(kinds).toContain("campaign");
    expect(kinds).not.toContain("seo");
    expect(publishChecks(withPage(base, [], { seo: {} }), { pageIds: ["chk"] }).map((x) => x.kind)).toContain("seo");
  });
  it("puts the ones to fix first, and skips draft pages", () => {
    const site = withPage(base, [createNode("Image", { id: "a", content: { src: "/m.jpg" } })], { seo: {} });
    const c = publishChecks(site, { pageIds: ["chk"] });
    expect(c[0]!.level).toBe("fix");
    expect(publishChecks(withPage(base, [createNode("Image", { id: "a", content: { src: "" } })], { status: "draft" }), { pageIds: ["chk"] })).toEqual([]);
  });
});
