import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { filesToSite, Length, Site, siteToFiles, Slug, validateSite } from "./index";
import { loadSite } from "./load-node";
import { seedSite } from "../seed/site";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const issues = (site: unknown) => {
  const r = validateSite(site);
  return r.ok ? [] : r.issues.map((i) => i.message);
};

describe("content schema", () => {
  it("accepts the seed site", () => {
    expect(issues(seedSite)).toEqual([]);
  });

  it("has the seed pages from the plan", () => {
    const slugs = seedSite.pages.map((p) => p.slug);
    expect(slugs).toEqual(["/", "/work", "/work/digital", "/work/physical", "/diary", "/playlists", "/rodeo", "/about", "/links", "/sample"]);
    expect(seedSite.pages.find((p) => p.id === "links")?.showInNav).toBe(false);
  });

  it("round-trips through content files", () => {
    const files = siteToFiles(Site.parse(seedSite));
    expect(Object.keys(files)).toContain("content/pages/home.json");
    expect(Site.parse(filesToSite(files))).toEqual(Site.parse(seedSite));
  });

  it("keeps page order from site.json", () => {
    const files = siteToFiles(Site.parse(seedSite));
    const site = Site.parse(filesToSite(files));
    expect(site.pages.map((p) => p.id)).toEqual(seedSite.pages.map((p) => p.id));
  });

  it("the committed content/ folder is valid", () => {
    const site = loadSite(resolve(__dirname, "../../.."));
    expect(site.pages.length).toBeGreaterThanOrEqual(10);
  });

  it("validates slugs", () => {
    for (const ok of ["/", "/work", "/work/digital", "/my-page"]) expect(Slug.safeParse(ok).success).toBe(true);
    for (const bad of ["", "work", "/Work", "/a/b/c", "/a b", "/a-", "//"]) expect(Slug.safeParse(bad).success).toBe(false);
  });

  it("validates CSS lengths", () => {
    for (const ok of ["auto", "0", "12px", "100%", "1.5rem", "60vh", "-8px"]) expect(Length.safeParse(ok).success).toBe(true);
    for (const bad of ["12", "px", "calc(1px)", "red"]) expect(Length.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate slugs and ids", () => {
    const s = clone(seedSite);
    s.pages[2]!.slug = "/work";
    expect(issues(s).join()).toMatch(/duplicate URL/);
    const t = clone(seedSite);
    t.pages[2]!.id = "work";
    expect(issues(t).join()).toMatch(/duplicate page id/);
  });

  it("requires exactly one home page at /", () => {
    const s = clone(seedSite);
    s.pages[0]!.isHome = false;
    expect(issues(s).join()).toMatch(/exactly one home page/);
  });

  it("enforces one nesting level and parent URLs", () => {
    const s = clone(seedSite);
    const about = s.pages.find((p) => p.id === "about")!;
    about.parentId = "digital";
    about.slug = "/work/about";
    expect(issues(s).join()).toMatch(/one level deep/);
    const t = clone(seedSite);
    t.pages.find((p) => p.id === "digital")!.slug = "/elsewhere/digital";
    expect(issues(t).join()).toMatch(/under its parent/);
  });

  it("rejects nav links to missing pages", () => {
    const s = clone(seedSite);
    s.nav.items[0]!.target = { kind: "page", pageId: "ghost" };
    expect(issues(s).join()).toMatch(/does not exist/);
  });

  it("rejects redirects that shadow a live page", () => {
    const s = clone(seedSite);
    s.redirects.push({ from: "/work", to: "/" });
    expect(issues(s).join()).toMatch(/shadows a live page/);
  });

  it("keeps desktop as a partial override of the mobile base", () => {
    const s = clone(seedSite);
    const sec = s.pages[0]!.sections[0]!;
    sec.layout.desktop = { padding: "1px" };
    expect(issues(s)).toEqual([]);
    // @ts-expect-error base must be complete
    sec.layout.base = { padding: "1px" };
    expect(issues(s).length).toBeGreaterThan(0);
  });
});
