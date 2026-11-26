import { describe, expect, it } from "vitest";
import { buildSite, builtPages, searchIndex } from "../render/build";
import { filesToSite, siteToFiles, Site, validateSite } from "../schema";
import { fixtureSite } from "../seed/fixture";
import { pageAt } from "./i18n";
import {
  addCollection,
  addField,
  addItem,
  cmsPages,
  coerce,
  duplicateItem,
  fieldsFor,
  itemAt,
  removeCollection,
  removeField,
  removeItems,
  setBinding,
  setCollectionBase,
  setItemsStatus,
  slugify,
  uniqueSlug,
  updateField,
  updateItem,
} from "./cms";

const base = () => Site.parse(fixtureSite);
const design = (id = "story-design") =>
  ({
    id,
    title: "Story page",
    slug: "/x",
    parentId: null,
    status: "published",
    template: "blank",
    seo: {},
    isHome: false,
    showInNav: false,
    overlays: [],
    sections: [
      {
        id: "s1",
        kind: "flow",
        layout: { base: { columns: 1, gap: 0, padding: "0px" } },
        children: [
          { id: "h", type: "Text", content: { text: "Headline", styleId: "h1", tag: "h1" }, style: { base: {} }, bind: { text: "title" } },
          { id: "q", type: "Text", content: { text: "Quote", styleId: "body", tag: "p" }, style: { base: {} }, bind: { text: "quote" } },
          { id: "b", type: "Button", content: { label: "Watch", target: { kind: "url", url: "#" }, variant: "filled" }, style: { base: {} }, bind: { target: "video" } },
        ],
      },
    ],
  }) as never;

/** A site with a Stories collection: two items (one live), fields quote and video, the design above. */
function withStories() {
  let { site, id } = addCollection(base(), { name: "Success stories", itemName: "Story", design: design() });
  site = addField(site, id, { name: "Quote", type: "longtext" }).site;
  site = addField(site, id, { name: "Video", type: "link" }).site;
  const a = addItem(site, id, { title: "AC Foods optimizes production", status: "live", values: { quote: "We see more", video: "https://youtu.be/x" } });
  const b = addItem(a.site, id, { title: "Draft story" });
  return { site: b.site, col: id, live: a.id, draft: b.id };
}

describe("collections: slugs and values", () => {
  it("makes clean, unique slugs and keeps the design's own", () => {
    expect(slugify("Fundo El Paraíso & Co!")).toBe("fundo-el-paraiso-and-co");
    const { site, col } = withStories();
    const c = site.cms.find((x) => x.id === col)!;
    expect(uniqueSlug(c, "AC Foods optimizes production")).toBe("ac-foods-optimizes-production-2");
    expect(uniqueSlug(c, "item design")).toBe("item-design-2");
  });
  it("converts values to the field's type", () => {
    expect(coerce({ type: "number" }, "3,5")).toBe(3.5);
    expect(coerce({ type: "toggle" }, "yes")).toBe(true);
    expect(coerce({ type: "date" }, "26 Nov")).toBe("");
    expect(coerce({ type: "choice", options: ["Citrus", "Apples"] }, "Pears")).toBe("Citrus");
  });
});

describe("collections: item pages", () => {
  it("builds one page per live item from the design, with connected settings filled in", () => {
    const { site } = withStories();
    const pages = cmsPages(site, true);
    expect(pages.map((p) => p.slug)).toEqual(["/success-stories/ac-foods-optimizes-production"]);
    const kids = pages[0]!.sections[0]!.children;
    expect(kids[0]!.content.text).toBe("AC Foods optimizes production");
    expect(kids[1]!.content.text).toBe("We see more");
    expect(kids[2]!.content.target).toEqual({ kind: "url", url: "https://youtu.be/x" });
    expect(pages[0]!.status).toBe("published");
  });
  it("never builds the design itself, and drafts only show in the signed-in preview", () => {
    const { site } = withStories();
    const built = builtPages(site).map((p) => p.slug);
    expect(built).not.toContain("/success-stories/item-design");
    expect(built).not.toContain("/success-stories/draft-story");
    expect(pageAt(site, "/success-stories/draft-story", true)).toBeUndefined();
    expect(pageAt(site, "/success-stories/draft-story", false)?.title).toBe("Draft story");
    expect(pageAt(site, "/success-stories/item-design", true)).toBeUndefined();
    expect(pageAt(site, "/success-stories/item-design", false)?.collectionId).toBeTruthy();
  });
  it("writes item pages, the sitemap and search", () => {
    const { site } = withStories();
    const files = buildSite(site, { siteUrl: "https://example.com" });
    expect(files["success-stories/ac-foods-optimizes-production.html"]).toContain("We see more");
    expect(files["success-stories/item-design.html"]).toBeUndefined();
    expect(files["sitemap.xml"]).toContain("https://example.com/success-stories/ac-foods-optimizes-production");
    expect(searchIndex(site).map((e) => e.url)).toContain("/success-stories/ac-foods-optimizes-production");
  });
  it("finds the item behind an address", () => {
    const { site, live } = withStories();
    expect(itemAt(site, "/success-stories/ac-foods-optimizes-production")?.item.id).toBe(live);
  });
});

describe("collections: editing", () => {
  it("adds, updates, duplicates, sets status and removes items", () => {
    let { site, col, live, draft } = withStories();
    site = updateItem(site, col, live, { title: "AC Foods", slug: "AC Foods!", values: { quote: 42 } });
    let c = site.cms.find((x) => x.id === col)!;
    expect(c.items[0]).toMatchObject({ title: "AC Foods", slug: "ac-foods", values: { quote: "42" } });
    const d = duplicateItem(site, col, live);
    c = d.site.cms.find((x) => x.id === col)!;
    expect(c.items[1]).toMatchObject({ title: "AC Foods copy", slug: "ac-foods-copy", status: "draft" });
    site = setItemsStatus(d.site, col, [draft], "live");
    expect(cmsPages(site, true)).toHaveLength(2);
    site = removeItems(site, col, [draft, d.id]);
    expect(site.cms.find((x) => x.id === col)!.items).toHaveLength(1);
  });
  it("removing a field drops its values and the design's connections to it", () => {
    const { site, col } = withStories();
    const next = removeField(site, col, "quote");
    const c = next.cms.find((x) => x.id === col)!;
    expect(c.fields.map((f) => f.id)).toEqual(["video"]);
    expect(c.items.every((i) => !("quote" in i.values))).toBe(true);
    const page = next.pages.find((p) => p.collectionId === col)!;
    expect(page.sections[0]!.children[1]!.bind).toBeUndefined();
  });
  it("changing a field's type converts its values", () => {
    const { site, col } = withStories();
    const next = updateField(site, col, "quote", { type: "toggle" });
    expect(next.cms.find((x) => x.id === col)!.items[0]!.values.quote).toBe(false);
  });
  it("connects and disconnects block settings, and offers fields that fit", () => {
    const { site, col } = withStories();
    const page = site.pages.find((p) => p.collectionId === col)!;
    let next = setBinding(site, page.id, "h", "text", "quote");
    expect(next.pages.find((p) => p.id === page.id)!.sections[0]!.children[0]!.bind).toEqual({ text: "quote" });
    next = setBinding(next, page.id, "h", "text", null);
    expect(next.pages.find((p) => p.id === page.id)!.sections[0]!.children[0]!.bind).toBeUndefined();
    const c = site.cms.find((x) => x.id === col)!;
    expect(fieldsFor(c, "image", "").map((f) => f.id)).toEqual([]);
    expect(fieldsFor(c, "primaryUrl", "").map((f) => f.id)).toContain("video");
    expect(fieldsFor(c, "title", "").map((f) => f.id)).toEqual(["title", "quote", "video"]);
  });
  it("moves a collection's address with its design, and removes it with its design", () => {
    const { site, col } = withStories();
    const moved = setCollectionBase(site, col, "Stories");
    expect(moved.cms.find((x) => x.id === col)!.base).toBe("/stories");
    expect(moved.pages.find((p) => p.collectionId === col)!.slug).toBe("/stories/item-design");
    const gone = removeCollection(moved, col);
    expect(gone.cms).toHaveLength(0);
    expect(gone.pages.some((p) => p.collectionId)).toBe(false);
  });
});

describe("collections: storage", () => {
  it("round-trips through content/cms.json, and a site without the file has none", () => {
    const { site } = withStories();
    const files = siteToFiles(site);
    expect(files["content/cms.json"]).toBeTruthy();
    const back = validateSite(filesToSite(files));
    expect(back.ok && back.site.cms[0]!.items).toHaveLength(2);
    const plain = siteToFiles(base());
    expect(plain["content/cms.json"]).toBeUndefined();
    const old = validateSite(filesToSite(plain));
    expect(old.ok && old.site.cms).toEqual([]);
  });
});
