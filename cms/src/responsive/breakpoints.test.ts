import { describe, expect, it } from "vitest";
import { addNodeCss, addSectionCss, canvasSize, layerBox, Sheet } from "./index";
import { isOverriddenAt, overridesAt, REFERENCE, resetAt, resolve, setAt, setOnly, useEverywhere } from "./resolve";
import { addSlotCss } from "../components/aoost/frames";
import { filesToSite, ResponsiveFrameFit, ResponsiveStyle, Site, siteToFiles, validateSite, type Node, type Responsive, type Section, type Style } from "../schema";
import { fixtureSite } from "../seed/fixture";

/** Tablet and widescreen (BREAKPOINTS-TABLET-WIDE.md). */

type L = { columns: number; gap: number; padding?: string };
const all: Responsive<L> = {
  base: { columns: 1, gap: 10 },
  desktop: { columns: 3 },
  tablet: { columns: 2 },
  widescreen: { gap: 40 },
};

describe("cascade for all four sizes", () => {
  it("mobile is the base", () => {
    expect(resolve(all, "mobile")).toEqual({ columns: 1, gap: 10 });
  });
  it("tablet lays its values over mobile", () => {
    expect(resolve(all, "tablet")).toEqual({ columns: 2, gap: 10 });
  });
  it("desktop lays its values over mobile, ignoring tablet", () => {
    expect(resolve(all, "desktop")).toEqual({ columns: 3, gap: 10 });
  });
  it("widescreen lays its values over desktop", () => {
    expect(resolve(all, "widescreen")).toEqual({ columns: 3, gap: 40 });
  });
  it("tablet follows mobile and widescreen follows desktop when they have nothing", () => {
    const r: Responsive<L> = { base: { columns: 1, gap: 10 }, desktop: { columns: 4 } };
    expect(resolve(r, "tablet")).toBe(r.base);
    expect(resolve(r, "widescreen")).toEqual({ columns: 4, gap: 10 });
  });
  it("names the size each one is compared with", () => {
    expect(REFERENCE).toEqual({ desktop: null, mobile: "desktop", tablet: "mobile", widescreen: "desktop" });
  });
});

describe("editing tablet and widescreen", () => {
  const plain: Responsive<L> = { base: { columns: 1, gap: 10 }, desktop: { columns: 3 } };
  it("a tablet edit writes only the tablet override", () => {
    const next = setOnly(plain, "tablet", { columns: 2 });
    expect(next).toEqual({ ...plain, tablet: { columns: 2 } });
    expect(resolve(next, "mobile")).toEqual(resolve(plain, "mobile"));
    expect(resolve(next, "desktop")).toEqual(resolve(plain, "desktop"));
  });
  it("drops a tablet value that equals mobile and a widescreen value that equals desktop", () => {
    expect(setAt(plain, "tablet", { columns: 1 })).toEqual(plain);
    expect(setAt(plain, "widescreen", { columns: 3 })).toEqual(plain);
  });
  it("keeps the key order base, desktop, tablet, widescreen", () => {
    const next = setAt(setAt({ base: { columns: 1, gap: 10 } } as Responsive<L>, "widescreen", { gap: 2 }), "tablet", { gap: 5 });
    expect(Object.keys(setAt(next, "desktop", { columns: 2 }))).toEqual(["base", "desktop", "tablet", "widescreen"]);
  });
  it("counts and tints changes per size", () => {
    expect(overridesAt(all, "tablet")).toEqual(["columns"]);
    expect(overridesAt(all, "widescreen")).toEqual(["gap"]);
    expect(overridesAt(all, "mobile")).toEqual(["columns"]);
    expect(overridesAt(all, "desktop")).toEqual([]);
    expect(isOverriddenAt(all, "tablet", "gap")).toBe(false);
  });
  it("resets a size to the one it is compared with", () => {
    expect(resetAt(all, "tablet", "columns")).toEqual({ base: all.base, desktop: all.desktop, widescreen: all.widescreen });
    expect(resetAt(all, "widescreen")).toEqual({ base: all.base, desktop: all.desktop, tablet: all.tablet });
    expect(resetAt(all, "mobile", "columns").base.columns).toBe(3);
    expect(resetAt(all, "desktop")).toBe(all);
  });
  it("'Use on all sizes' makes the shown value everyone's", () => {
    const next = useEverywhere(all, "tablet", "columns");
    expect(next.base.columns).toBe(2);
    for (const bp of ["mobile", "tablet", "desktop", "widescreen"] as const) expect(resolve(next, bp).columns).toBe(2);
    expect(resolve(next, "widescreen").gap).toBe(40);
  });
  it("a mobile edit keeps desktop's value; tablet follows mobile", () => {
    const next = setOnly({ base: { columns: 1, gap: 10 } } as Responsive<L>, "mobile", { gap: 0 });
    expect(resolve(next, "desktop").gap).toBe(10);
    expect(resolve(next, "widescreen").gap).toBe(10);
    expect(resolve(next, "tablet").gap).toBe(0);
  });
  it("keeps canvas lengths on tablet even when the number equals mobile's", () => {
    const r: Responsive<Style> = { base: { x: 100 } };
    expect(setAt(r, "tablet", { x: 100 })).toEqual({ base: { x: 100 }, tablet: { x: 100 } });
  });
});

const canvas = (children: Node[], layout: Partial<Section["layout"]> = {}): Section => ({
  id: "c1",
  kind: "canvas",
  layout: { base: { columns: 1, gap: 0, padding: "0px", height: 390 }, ...layout },
  children,
});
const layer = (style: Responsive<Style>): Node => ({ id: "l1", type: "Image", content: {}, style });

describe("canvas boxes on tablet and widescreen", () => {
  it("scales the mobile box to tablet and the desktop box to widescreen", () => {
    const n = layer({ base: { x: 39, y: 0, w: 195, h: 100 }, desktop: { x: 144, y: 0, w: 720, h: 360 } });
    const s = canvas([n]);
    expect(canvasSize(s, "tablet")).toEqual({ width: 834, height: 834 });
    expect(layerBox(s, n, "tablet")).toMatchObject({ x: 83.4, w: 417 });
    expect(canvasSize(s, "widescreen").width).toBe(1920);
    expect(layerBox(s, n, "widescreen")).toMatchObject({ x: 192, w: 960, h: 480 });
  });
  it("uses the values a layer sets there", () => {
    const n = layer({ base: { x: 0, y: 0, w: 100, h: 100 }, tablet: { x: 400 } });
    expect(layerBox(canvas([n], { tablet: { height: 600 } }), n, "tablet")).toMatchObject({ x: 400, y: 0, w: 213.85 });
    expect(canvasSize(canvas([n], { tablet: { height: 600 } }), "tablet")).toEqual({ width: 834, height: 600 });
  });
});

describe("CSS for tablet and widescreen", () => {
  const TABLET = "@media (min-width:600px) and (max-width:899.98px){";
  const WIDE = "@media (min-width:1600px){";
  const grid = (layout: Section["layout"]): Section => ({ id: "g", kind: "grid", layout, children: [] });

  it("writes nothing for them when no value is set", () => {
    const sheet = new Sheet();
    addSectionCss(sheet, grid({ base: { columns: 1, gap: 14, padding: "0px" }, desktop: { columns: 3 } }));
    addNodeCss(sheet, { id: "n", type: "Image", content: {}, style: { base: { width: "100%" }, desktop: { width: "50%" } }, frame: { base: { fit: "fill", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 } } });
    const css = sheet.toString();
    expect(css).not.toContain("600px");
    expect(css).not.toContain("1600px");
  });
  it("writes the tablet difference from mobile in its own bounded range", () => {
    const sheet = new Sheet();
    addSectionCss(sheet, grid({ base: { columns: 1, gap: 14, padding: "0px" }, desktop: { columns: 3 }, tablet: { columns: 2 } }));
    const css = sheet.toString();
    expect(css).toContain(`${TABLET}\n.s-g>.si{grid-template-columns:repeat(2, minmax(0, 1fr))}\n}`);
    // Tablet comes before desktop; desktop is unchanged.
    expect(css.indexOf(TABLET)).toBeLessThan(css.indexOf("@media (min-width:900px)"));
    expect(css).toContain("@media (min-width:900px){\n.s-g>.si{grid-template-columns:repeat(3, minmax(0, 1fr))}\n}");
  });
  it("writes the widescreen difference from desktop after desktop", () => {
    const sheet = new Sheet();
    addNodeCss(sheet, { id: "n", type: "Image", content: {}, style: { base: { width: "100%" }, desktop: { width: "50%" }, widescreen: { width: "40%", opacity: 0.5 } } });
    const css = sheet.toString();
    expect(css).toContain(`${WIDE}\n.n-n{width:40%;opacity:0.5}\n}`);
    expect(css.indexOf(WIDE)).toBeGreaterThan(css.indexOf("@media (min-width:900px)"));
  });
  it("hides on one size only", () => {
    const sheet = new Sheet();
    addNodeCss(sheet, { id: "n", type: "Text", content: {}, style: { base: {}, tablet: { hidden: true } } });
    expect(sheet.toString().trim()).toBe(`${TABLET}\n.n-n{display:none}\n}`);
  });
  it("frames media per size", () => {
    const sheet = new Sheet();
    const base = { fit: "fill" as const, focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 };
    addNodeCss(sheet, { id: "n", type: "Image", content: {}, style: { base: {} }, frame: { base, widescreen: { focalX: 10 } } });
    expect(sheet.toString()).toContain(`${WIDE}\n.n-n .media{object-position:10% 50%}\n}`);
  });
  it("frames aoost pictures per size", () => {
    const sheet = new Sheet();
    addSlotCss(sheet, "h", [{ path: ["reel", 0], label: "Slide 1", src: "/a.jpg", selector: ".slide:nth-child(1) img", kind: "img", frame: { base: { fit: "fill", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 }, tablet: { focalY: 20 } } }]);
    expect(sheet.toString()).toContain(`${TABLET}\n.n-h .slide:nth-child(1) img{object-position:50% 20%}\n}`);
  });
  it("moves canvas layers when the section has its own tablet height", () => {
    const n = layer({ base: { x: 0, y: 0, w: 195, h: 195 } });
    const sheet = new Sheet();
    addSectionCss(sheet, canvas([n], { tablet: { height: 417 } }));
    const css = sheet.toString();
    expect(css).toContain(`${TABLET}\n.s-c1>.si{aspect-ratio:834/417;--cw:834}`);
    expect(css).toMatch(/\.n-l1\{height:100%\}/);
  });
});

describe("schema round-trip", () => {
  it("accepts tablet and widescreen keys on style, layout and frames", () => {
    expect(ResponsiveStyle.parse({ base: {}, tablet: { opacity: 0.5 }, widescreen: { hidden: true } })).toEqual({ base: {}, tablet: { opacity: 0.5 }, widescreen: { hidden: true } });
    expect(ResponsiveFrameFit.parse({ base: { fit: "fill", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 }, tablet: { focalX: 20 } }).tablet).toEqual({ focalX: 20 });
  });
  it("adds no keys to content without them", () => {
    const parsed = ResponsiveStyle.parse({ base: { width: "100%" }, desktop: { width: "50%" } });
    expect(Object.keys(parsed)).toEqual(["base", "desktop"]);
  });
  it("round-trips a site with tablet and widescreen values through content files", () => {
    const site = Site.parse(fixtureSite) as Site;
    const page = site.pages[0]!;
    const section = page.sections[0]!;
    section.layout = { ...section.layout, tablet: { columns: 2 }, widescreen: { gap: 48 } };
    const node = section.children[0]!;
    node.style = { ...node.style, tablet: { hidden: true }, widescreen: { opacity: 0.9 } };
    const files = siteToFiles(site);
    const back = validateSite(filesToSite(JSON.parse(JSON.stringify(files))));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const s2 = back.site.pages[0]!.sections[0]!;
    expect(s2.layout.tablet).toEqual({ columns: 2 });
    expect(s2.layout.widescreen).toEqual({ gap: 48 });
    expect(s2.children[0]!.style.tablet).toEqual({ hidden: true });
    expect(s2.children[0]!.style.widescreen).toEqual({ opacity: 0.9 });
  });
});
