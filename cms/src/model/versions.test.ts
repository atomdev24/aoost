import { describe, expect, it } from "vitest";
import "../components/registry";
import { Site, validateSite } from "../schema";
import { fixtureSite as seedSite } from "../seed/fixture";
import { deletePage } from "./pages";
import { createVariant } from "./variants";
import { restoreVersion } from "./versions";

const old = Site.parse(seedSite);
const home = old.pages.find((p) => p.isHome)!;
const other = old.pages.find((p) => !p.isHome && !p.parentId)!;

describe("restoring a version", () => {
  it("takes the old content and keeps today's variants", () => {
    const now = createVariant({ ...old, pages: old.pages.map((p) => (p.id === home.id ? { ...p, title: "Changed since" } : p)) }, home.id)!;
    const { site, droppedVariants } = restoreVersion(now.site, old);
    expect(site.pages.find((p) => p.id === home.id)!.title).toBe(home.title);
    expect(site.pages.some((p) => p.id === now.pageId)).toBe(true);
    expect(droppedVariants).toEqual([]);
    expect(validateSite(site).ok).toBe(true);
  });

  it("leaves out a variant whose page the old version doesn't have", () => {
    const made = createVariant(old, other.id)!;
    const olderWithout = deletePage(old, other.id);
    const { site, droppedVariants } = restoreVersion(made.site, olderWithout);
    expect(site.pages.some((p) => p.variantOf)).toBe(false);
    expect(droppedVariants).toEqual(["Variant 1"]);
  });
});
