import { describe, expect, it } from "vitest";
import "../components/registry";
import { Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { applyOps, diffSite, touchedPages } from "./ops";

const site = Site.parse(seedSite);
const withTitle = (id: string, title: string) => ({ ...site, pages: site.pages.map((p) => (p.id === id ? { ...p, title } : p)) });

describe("draft ops (save)", () => {
  it("produces nothing for an unchanged site", () => {
    expect(diffSite(site, site)).toEqual([]);
    expect(diffSite(site, Site.parse(JSON.parse(JSON.stringify(seedSite))))).toEqual([]);
  });
  it("sends only the page that changed", () => {
    const ops = diffSite(site, withTitle("about", "About me"));
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ op: "putPage", page: { id: "about", title: "About me" } });
    expect(touchedPages(ops)).toEqual(["about"]);
  });
  it("round-trips: applying the diff reproduces the target", () => {
    const target = { ...withTitle("work", "Things"), pages: withTitle("work", "Things").pages.filter((p) => p.id !== "links").reverse(), theme: { ...site.theme, colors: { ...site.theme.colors, rust: "#000000" } } };
    const ops = diffSite(site, target);
    expect(ops.map((o) => o.op).sort()).toEqual(["deletePage", "putPage", "set", "setPageOrder"]);
    expect(applyOps(site, ops)).toEqual(target);
  });
  it("adds new pages", () => {
    const page = { ...site.pages.find((p) => p.id === "about")!, id: "new", slug: "/new", title: "New" };
    const next = applyOps(site, [{ op: "putPage", page }]);
    expect(next.pages.at(-1)!.id).toBe("new");
    expect(validateSite(next).ok).toBe(true);
  });
  it("a bad op is caught by validation before it is saved", () => {
    const page = { ...site.pages.find((p) => p.id === "about")!, slug: "/work" };
    expect(validateSite(applyOps(site, [{ op: "putPage", page }])).ok).toBe(false);
  });
  it("does not mutate the input site", () => {
    const before = JSON.stringify(site);
    applyOps(site, [{ op: "deletePage", pageId: "about" }, { op: "set", key: "redirects", value: [{ from: "/x", to: "/" }] }]);
    expect(JSON.stringify(site)).toBe(before);
  });
});
