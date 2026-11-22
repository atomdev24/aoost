import { describe, expect, it } from "vitest";
import { Site, validateSite } from "../schema";
import { fixtureSite } from "../seed/fixture";
import { addSection } from "../model/page-ops";
import { designSection, DesignInput, nearestStyle } from "./design";

const site = Site.parse(fixtureSite);
const frame = DesignInput.parse({
  frame: { width: 1200, height: 600 },
  layers: [
    { kind: "box", name: "Band", x: 0, y: 0, w: 1200, h: 600, fill: "#141414" },
    { kind: "text", name: "Title", x: 100, y: 120, w: 600, h: 80, text: "Field notes", size: 64, color: "#F3F0E6" },
    { kind: "text", name: "Intro", x: 100, y: 220, w: 500, h: 60, text: "Drawings from the road, 2026.", size: 18, color: "#cccccc" },
    { kind: "image", name: "Photo", x: 760, y: 100, w: 360, h: 400, src: "/art/hero.jpg", radius: 12 },
    { kind: "button", name: "CTA", x: 100, y: 320, w: 160, h: 48, text: "See the work", href: "/work" },
  ],
});

describe("import_design", () => {
  it("keeps the desktop layout, scaled to the 1440 artboard", () => {
    const s = designSection(site, frame, "Field notes");
    expect(s.kind).toBe("canvas");
    expect(s.customDesktop).toBe(true);
    expect(s.layout.desktop?.height).toBe(720);
    const title = s.children.find((n) => n.name === "Title")!;
    expect(title.type).toBe("Text");
    expect(title.style.desktop).toMatchObject({ x: 120, y: 144, w: 720, h: 96 });
    expect(title.content).toMatchObject({ text: "Field notes", tag: "h2", styleId: nearestStyle(site, 64) });
    expect(title.style.base).toMatchObject({ color: "#F3F0E6" });
    const photo = s.children.find((n) => n.name === "Photo")!;
    expect(photo.content).toMatchObject({ src: "/art/hero.jpg", alt: "Photo" });
    expect(photo.style.desktop?.radius).toEqual([14.4, 14.4, 14.4, 14.4]);
    expect(s.children.find((n) => n.name === "CTA")!.content).toMatchObject({ label: "See the work", target: { kind: "url", url: "/work" } });
  });

  it("stacks the layers in reading order on phones when there's no phone frame", () => {
    const s = designSection(site, frame);
    const ys = ["Band", "Photo", "Title", "Intro", "CTA"].map((n) => s.children.find((c) => c.name === n)!.style.base.y!);
    expect(ys).toEqual([...ys].sort((a, b) => a - b)); // top to bottom, then left to right
    for (const n of s.children) {
      expect(n.style.base.x! + n.style.base.w!).toBeLessThanOrEqual(390);
    }
    expect(s.layout.base.height).toBeGreaterThan(ys.at(-1)!);
  });

  it("uses the design's own phone frame when there is one", () => {
    const s = designSection(site, { ...frame, phone: { width: 375, height: 800, layers: [{ kind: "text", name: "Title", x: 20, y: 40, w: 335, h: 60, text: "Field notes", size: 40 }] } });
    expect(s.layout.base.height).toBe(832);
    expect(s.children.find((n) => n.name === "Title")!.style.base).toMatchObject({ x: 20.8, y: 41.6, w: 348.4 });
  });

  it("makes a valid site", () => {
    const page = site.pages[0]!;
    const next = { ...site, pages: site.pages.map((p) => (p.id === page.id ? addSection(p, designSection(site, frame)) : p)) };
    expect(validateSite(next).ok).toBe(true);
  });
});
