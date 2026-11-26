import { describe, expect, it } from "vitest";
import "../components/registry";
import { builtPages } from "../render/build";
import { Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { pageAt } from "./i18n";
import { deletePage, setStatus } from "./pages";
import { changedIds, createVariant, earlierVersionsOf, electVariant, pickVersion, proposeVariant, proposedVariants, renameVariant, restoreVariant, statusOf, toggleVote, variantsOf, versionsOf } from "./variants";

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

  it("shows in the draft preview (Compare, All designs) but never on the live site", () => {
    const r = createVariant(site, home.id)!;
    const v = r.site.pages.find((p) => p.id === r.pageId)!;
    expect(pageAt(r.site, v.slug, false)?.id).toBe(v.id);
    expect(pageAt(r.site, v.slug, true)).toBeUndefined();
    // The page itself still answers at its own address.
    expect(pageAt(r.site, home.slug, false)?.id).toBe(home.id);
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

  it("is proposed for review, voted on once per person, and taken back", () => {
    const r = createVariant(site, home.id)!;
    let s2 = proposeVariant(r.site, r.pageId, true);
    expect(statusOf(s2.pages.find((p) => p.id === r.pageId)!)).toBe("proposed");
    expect(proposedVariants(s2).map((p) => p.id)).toEqual([r.pageId]);
    s2 = toggleVote(s2, r.pageId, { id: "jess@x.com", name: "Jess" });
    s2 = toggleVote(s2, r.pageId, { id: "vic@x.com", name: "Vic" });
    s2 = toggleVote(s2, r.pageId, { id: "jess@x.com", name: "Jess" });
    expect(s2.pages.find((p) => p.id === r.pageId)!.variantVotes).toEqual([{ id: "vic@x.com", name: "Vic" }]);
    expect(valid(s2)).toBe(true);
    s2 = proposeVariant(s2, r.pageId, false);
    expect(statusOf(s2.pages.find((p) => p.id === r.pageId)!)).toBe("draft");
  });

  it("picks a version without throwing the others away", () => {
    const a = createVariant(site, home.id, "Spring hero")!;
    const b = createVariant(a.site, home.id, "Bigger pictures")!;
    const voted = toggleVote(proposeVariant(b.site, b.pageId, true), b.pageId, { id: "vic", name: "Vic" });
    const before = voted.pages.find((p) => p.id === home.id)!;
    const out = pickVersion(voted, home.id, a.pageId, "2026-11-26T10:00:00.000Z")!;
    expect(valid(out)).toBe(true);
    // The picked one is now the page, and no longer a variant.
    expect(out.pages.some((p) => p.id === a.pageId)).toBe(false);
    expect(versionsOf(out, home.id).map((p) => p.id)).toEqual([home.id]);
    // The page as it was and the other variant are kept, with their votes.
    const earlier = earlierVersionsOf(out, home.id);
    expect(earlier.map((p) => p.variantName).sort()).toEqual(["Bigger pictures", `${home.title} before 26 Nov`].sort());
    expect(earlier.find((p) => p.variantName === "Bigger pictures")!.variantVotes).toHaveLength(1);
    const kept = earlier.find((p) => p.variantName !== "Bigger pictures")!;
    // Bring the old page back and pick it: the page is as it was.
    const back = pickVersion(restoreVariant(out, kept.id), home.id, kept.id)!;
    expect(back.pages.find((p) => p.id === home.id)!.sections).toEqual(before.sections);
  });

  it("keeping the page as it is files the variants away", () => {
    const a = createVariant(site, home.id)!;
    const out = pickVersion(a.site, home.id, home.id)!;
    expect(out.pages.find((p) => p.id === home.id)).toEqual(home);
    expect(statusOf(out.pages.find((p) => p.id === a.pageId)!)).toBe("archived");
    expect(versionsOf(out, home.id)).toHaveLength(1);
  });

  it("finds what a variant changed", () => {
    const r = createVariant(site, home.id)!;
    const v = r.site.pages.find((p) => p.id === r.pageId)!;
    expect(changedIds(r.site, v)).toEqual([]);
    const sec = v.sections[0]!;
    const node = sec.children[0]!;
    const edited = { ...v, sections: [{ ...sec, children: [{ ...node, content: { ...node.content, text: "Changed words" } }, ...sec.children.slice(1)] }, ...v.sections.slice(1)] };
    const s2 = { ...r.site, pages: r.site.pages.map((p) => (p.id === v.id ? edited : p)) };
    expect(changedIds(s2, edited)).toEqual([node.id]);
  });
});
