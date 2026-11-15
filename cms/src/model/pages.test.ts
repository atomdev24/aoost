import { describe, expect, it } from "vitest";
import "../components/registry";
import { flattenRedirects } from "../render/redirects";
import { Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { createPage, deletePage, duplicatePage, renamePage, reorderPage, setParent, setSeo, setShowInNav, setSlug, setStatus, slugify, uniqueSlug } from "./pages";

const site = Site.parse(seedSite);
const page = (s: typeof site, id: string) => s.pages.find((p) => p.id === id)!;
const slugs = (s: typeof site) => s.pages.map((p) => p.slug);
const navPages = (s: typeof site) => s.nav.items.filter((i) => i.type === "page").map((i) => (i.target as { pageId: string }).pageId);
const valid = (s: typeof site) => {
  const r = validateSite(s);
  return r.ok ? true : r.issues;
};

describe("slugs", () => {
  it("slugifies names", () => {
    expect(slugify("Sketchbook 01")).toBe("sketchbook-01");
    expect(slugify("  Café & Bar!  ")).toBe("cafe-bar");
    expect(slugify("???")).toBe("untitled");
  });
  it("finds a free URL under the parent", () => {
    expect(uniqueSlug(site, "Sketchbook", null)).toBe("/sketchbook");
    expect(uniqueSlug(site, "Sketchbook", "work")).toBe("/work/sketchbook");
    expect(uniqueSlug(site, "Diary", null)).toBe("/diary-2");
    expect(uniqueSlug(site, "Digital", "work")).toBe("/work/digital-2");
    expect(uniqueSlug(site, "diary", null, "diary")).toBe("/diary");
  });
});

describe("create page", () => {
  it("makes a draft from a template, with its URL and a nav link", () => {
    const { site: next, pageId } = createPage(site, { name: "Sketchbook", templateId: "gallery" });
    const p = page(next, pageId);
    expect(p).toMatchObject({ title: "Sketchbook", slug: "/sketchbook", status: "draft", template: "gallery", showInNav: true, parentId: null });
    expect(p.sections).toHaveLength(2);
    expect(p.sections[0]!.children[0]!.content.text).toBe("Sketchbook");
    expect(navPages(next)).toEqual(["work", "diary", "playlists", "rodeo", "about", pageId]);
    expect(next.nav.items.at(-1)!.type).toBe("social"); // utility items stay last
    expect(valid(next)).toBe(true);
  });
  it("places a sub-page under its parent, in the parent's dropdown rather than the bar", () => {
    const { site: next, pageId } = createPage(site, { name: "Sketchbook", parentId: "work" });
    expect(page(next, pageId)).toMatchObject({ slug: "/work/sketchbook", parentId: "work", showInNav: true });
    expect(slugs(next).slice(1, 5)).toEqual(["/work", "/work/digital", "/work/physical", "/work/sketchbook"]);
    expect(navPages(next)).not.toContain(pageId);
    expect(valid(next)).toBe(true);
  });
  it("can stay out of the navigation, and never nests deeper than one level", () => {
    const hidden = createPage(site, { name: "Secret", showInNav: false });
    expect(page(hidden.site, hidden.pageId).showInNav).toBe(false);
    expect(navPages(hidden.site)).not.toContain(hidden.pageId);
    const deep = createPage(site, { name: "Deep", parentId: "digital" });
    expect(page(deep.site, deep.pageId)).toMatchObject({ parentId: null, slug: "/deep" });
  });
  it("gives each page its own section ids", () => {
    const a = createPage(site, { name: "A" });
    const b = createPage(a.site, { name: "B" });
    expect(page(b.site, a.pageId).sections[0]!.id).not.toBe(page(b.site, b.pageId).sections[0]!.id);
    expect(valid(b.site)).toBe(true);
  });
});

describe("rename and re-URL", () => {
  it("renames without touching the URL; the nav label follows", () => {
    const next = renamePage(site, "work", "Things");
    expect(page(next, "work")).toMatchObject({ title: "Things", slug: "/work" });
    expect(renamePage(site, "work", "  ")).toBe(site);
  });
  it("re-URLs a page, moves its sub-pages and redirects every old URL", () => {
    const next = setSlug(site, "work", "Projects");
    expect(slugs(next).slice(1, 4)).toEqual(["/projects", "/projects/digital", "/projects/physical"]);
    expect(next.redirects).toEqual([
      { from: "/work", to: "/projects" },
      { from: "/work/digital", to: "/projects/digital" },
      { from: "/work/physical", to: "/projects/physical" },
    ]);
    expect(valid(next)).toBe(true);
  });
  it("keeps older redirects pointing at the newest URL", () => {
    const twice = setSlug(setSlug(site, "about", "info"), "about", "bio");
    expect(twice.redirects).toEqual([
      { from: "/about", to: "/bio" },
      { from: "/info", to: "/bio" },
    ]);
    const live = new Set(slugs(twice));
    expect(flattenRedirects(twice.redirects, live)).toEqual(twice.redirects);
  });
  it("drops a redirect when a page takes that URL back", () => {
    const back = setSlug(setSlug(site, "about", "info"), "about", "about");
    expect(page(back, "about").slug).toBe("/about");
    expect(back.redirects).toEqual([{ from: "/info", to: "/about" }]);
    expect(valid(back)).toBe(true);
  });
  it("avoids URL collisions and ignores the home page", () => {
    expect(page(setSlug(site, "about", "diary"), "about").slug).toBe("/diary-2");
    expect(setSlug(site, "home", "start")).toBe(site);
    expect(setSlug(site, "about", "About")).toBe(site);
  });
});

describe("nav toggle, status and SEO", () => {
  it("toggles a top-level page in and out of the bar", () => {
    const off = setShowInNav(site, "rodeo", false);
    expect(page(off, "rodeo").showInNav).toBe(false);
    expect(navPages(off)).toEqual(["work", "diary", "playlists", "about"]);
    const on = setShowInNav(off, "rodeo", true);
    expect(navPages(on)).toEqual(["work", "diary", "playlists", "about", "rodeo"]);
    expect(setShowInNav(on, "rodeo", true).nav.items).toHaveLength(on.nav.items.length);
  });
  it("toggles a sub-page without adding a top-level link", () => {
    const off = setShowInNav(site, "digital", false);
    expect(page(off, "digital").showInNav).toBe(false);
    expect(off.nav.items).toEqual(site.nav.items);
  });
  it("sets status and search fields", () => {
    expect(page(setStatus(site, "links", "unlisted"), "links").status).toBe("unlisted");
    const seo = setSeo(site, "about", { title: "About Alex", description: "" });
    expect(page(seo, "about").seo).toEqual({ title: "About Alex" });
  });
});

describe("nesting", () => {
  it("moves a page under another and back, with redirects and nav links", () => {
    const nested = setParent(site, "about", "work");
    expect(page(nested, "about")).toMatchObject({ parentId: "work", slug: "/work/about" });
    expect(nested.redirects).toEqual([{ from: "/about", to: "/work/about" }]);
    expect(navPages(nested)).not.toContain("about");
    expect(valid(nested)).toBe(true);
    const back = setParent(nested, "about", null);
    expect(page(back, "about")).toMatchObject({ parentId: null, slug: "/about" });
    expect(back.redirects).toEqual([{ from: "/work/about", to: "/about" }]);
    expect(navPages(back)).toContain("about");
  });
  it("refuses to nest deeper than one level", () => {
    expect(setParent(site, "about", "digital")).toBe(site);
    expect(setParent(site, "work", "about")).toBe(site); // work has sub-pages
    expect(setParent(site, "about", "home")).toBe(site);
  });
  it("reorders among siblings and keeps sub-pages with their parent", () => {
    const next = reorderPage(site, "diary", -1);
    expect(next.pages.map((p) => p.id)).toEqual(["home", "diary", "work", "digital", "physical", "playlists", "rodeo", "about", "links", "sample"]);
    expect(reorderPage(site, "physical", -1).pages.map((p) => p.id).slice(1, 4)).toEqual(["work", "physical", "digital"]);
    expect(reorderPage(site, "work", -1)).toBe(site); // nothing goes above home
  });
});

describe("duplicate and delete", () => {
  it("duplicates as a hidden draft with fresh ids", () => {
    const dup = duplicatePage(site, "work")!;
    const copy = page(dup.site, dup.pageId);
    expect(copy).toMatchObject({ title: "Work copy", slug: "/work-copy", status: "draft", showInNav: false, isHome: false });
    expect(dup.site.pages.map((p) => p.id).slice(1, 5)).toEqual(["work", "digital", "physical", dup.pageId]);
    expect(copy.sections[0]!.id).not.toBe(page(site, "work").sections[0]!.id);
    expect(valid(dup.site)).toBe(true);
    const home = duplicatePage(site, "home")!;
    expect(page(home.site, home.pageId)).toMatchObject({ slug: "/home-copy", isHome: false });
    expect(valid(home.site)).toBe(true);
  });
  it("deletes a page with its sub-pages and nav entries, leaving redirects home", () => {
    const next = deletePage(site, "work");
    expect(slugs(next)).toEqual(["/", "/diary", "/playlists", "/rodeo", "/about", "/links", "/sample"]);
    expect(navPages(next)).toEqual(["diary", "playlists", "rodeo", "about"]);
    expect(next.redirects).toEqual([
      { from: "/work", to: "/" },
      { from: "/work/digital", to: "/" },
      { from: "/work/physical", to: "/" },
    ]);
    expect(valid(next)).toBe(true);
  });
  it("repoints older redirects when their target is deleted", () => {
    const next = deletePage(setSlug(site, "about", "info"), "about");
    expect(next.redirects).toEqual([
      { from: "/about", to: "/" },
      { from: "/info", to: "/" },
    ]);
  });
  it("never deletes the home page", () => {
    expect(deletePage(site, "home")).toBe(site);
  });
});
