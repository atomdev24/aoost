import { describe, expect, it } from "vitest";
import { demoSite } from "../../demo/site";
import { validateSite } from "../../schema/validate";
import { addCampaignFromBrief, briefText, campaignSections, type CampaignBrief } from "./campaign-brief";

const brief: CampaignBrief = { event: "Interpoma 2026", when: "25–27 Nov 2026", where: "Bolzano, stand B12", product: "binscan", ask: "meeting", languages: ["es"], endDate: "2026-11-28" };

describe("campaign pages from a brief", () => {
  it("builds hero, product, quote, the booking form and the footer, with the brief's words", () => {
    const s = campaignSections(brief);
    expect(s.map((x) => x.children[0]!.type)).toEqual(["AeroHero", "AeroSplit", "AeroTestimonial", "AeroText", "AeroFooter"]);
    const hero = s[0]!.children[0]!.content as Record<string, string>;
    expect(hero.eyebrow).toBe("Meet us at Interpoma 2026 · Bolzano, stand B12, 25–27 Nov 2026");
    expect(hero.title).toBe("See TrueFruit Bin Scan live at Interpoma 2026");
    expect(hero.primaryUrl).toBe(`#${s[3]!.id}`);
    const f = s[3]!.children.find((n) => n.type === "HubSpotForm")!;
    expect(f.content.live).toBe(false);
  });
  it("uses the message as the headline, and skips the form when people should just find out more", () => {
    const s = campaignSections({ ...brief, message: "Every bin, sized at intake", ask: "learn" });
    expect((s[0]!.children[0]!.content as Record<string, string>).title).toBe("Every bin, sized at intake");
    expect(s.some((x) => x.children.some((n) => n.type === "HubSpotForm"))).toBe(false);
  });
  it("adds a valid campaign page with an end date, a description and a Spanish draft", () => {
    const { site, pageId } = addCampaignFromBrief(demoSite(), brief);
    expect(validateSite(site).ok).toBe(true);
    const page = site.pages.find((p) => p.id === pageId)!;
    expect(page.kind).toBe("campaign");
    expect(page.unpublishAt).toBe("2026-11-28");
    expect(page.seo.description).toContain("TrueFruit Bin Scan at Interpoma 2026");
    expect(page.translations?.es?.status).toBe("draft");
  });
  it("writes the brief for Claude", () => {
    expect(briefText(brief)).toMatch(/^@Claude .*translate it into ES/);
  });
});
