import { describe, expect, it } from "vitest";
import "../components/registry";
import { builtPages } from "../render/build";
import { Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { deletePage, setStatus } from "./pages";
import { createVariant, electVariant, renameVariant, variantsOf } from "./variants";

const site = Site.parse(seedSite);
const home = site.pages.find((p) => p.isHome)!;
const other = site.pages.find((p) => !p.isHome && !p.parentId)!;
const valid = (s: typeof site) => {
  const r = validateSite(s);
  return r.ok ? true : r.issues;
};

describe("variants", () => {
  it("copies a page into a draft variant that is never built", () => {
    const r = createVariant(site, home.id)!;
    const v = r.site.pages.find((p) => p.id === r.pageId)!;
    expect(v).toMatchObject({ variantOf: home.id, variantName: "Variant 1", status: "draft", isHome: false, showInNav: false, title: home.title });
    expect(v.slug).toBe("/home-variant-1");
    expect(v.sections.map((s) => s.id)).not.toEqual(home.sections.map((s) => s.id));
    expect(valid(r.site)).toBe(true);
    expect(builtPages(r.site).some((p) => p.id === v.id)).toBe(false);
    // Sits right after its page.
    const ids = r.site.pages.map((p) => p.id);
    expect(ids.indexOf(v.id)).toBeGreaterThan(ids.indexOf(home.id));
  });

  it("numbers variants and makes a variant of a variant's page", () => {
    const a = createVariant(site, other.id)!;
    const b = createVariant(a.site, a.pageId)!;
    const names = variantsOf(b.site, other.id).map((v) => v.variantName);
    expect(names).toEqual(["Variant 1", "Variant 2"]);
    expect(valid(b.site)).toBe(true);
    const renamed = renameVariant(b.site, b.pageId, "Spring hero");
    expect(renamed.pages.find((p) => p.id === b.pageId)!.variantName).toBe("Spring hero");
  });

  it("electing puts the variant's content on the page and removes the variant", () => {
    const r = createVariant(site, home.id)!;
    const edited = { ...r.site, pages: r.site.pages.map((p) => (p.id === r.pageId ? { ...p, sections: p.sections.slice(0, 1) } : p)) };
    const out = electVariant(edited, r.pageId)!;
    const page = out.pages.find((p) => p.id === home.id)!;
    expect(page.sections.length).toBe(1);
    expect(page).toMatchObject({ id: home.id, slug: "/", isHome: true, title: home.title, status: home.status });
    expect(out.pages.some((p) => p.id === r.pageId)).toBe(false);
    expect(valid(out)).toBe(true);
    // The kept section has its original id again.
    expect(page.sections[0]!.id).toBe(home.sections[0]!.id);
  });

  it("electing an unchanged variant leaves the page exactly as it was", () => {
    const r = createVariant(site, other.id)!;
    const out = electVariant(r.site, r.pageId)!;
    expect(out.pages.find((p) => p.id === other.id)).toEqual(site.pages.find((p) => p.id === other.id));
    // Also through a variant of a variant.
    const a = createVariant(site, home.id)!;
    const b = createVariant(a.site, a.pageId)!;
    const twice = electVariant(b.site, b.pageId)!;
    expect(twice.pages.find((p) => p.id === home.id)).toEqual(site.pages.find((p) => p.id === home.id));
  });

  it("refuses a variant that is published, and goes when its page is deleted", () => {
    const r = createVariant(site, other.id)!;
    expect(valid(setStatus(r.site, r.pageId, "published"))).not.toBe(true);
    const gone = deletePage(r.site, other.id);
    expect(gone.pages.some((p) => p.id === r.pageId)).toBe(false);
    expect(gone.redirects.some((x) => x.from === r.site.pages.find((p) => p.id === r.pageId)!.slug)).toBe(false);
    expect(valid(gone)).toBe(true);
  });
});
