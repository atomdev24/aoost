import { describe, expect, it } from "vitest";
import type { Node, Responsive, Section, Style } from "../schema";
import { seedTheme } from "../seed/theme";
import {
  addNodeCss,
  addSectionCss,
  boxDecls,
  canvasSize,
  colorValue,
  derivedScale,
  diff,
  frameDecls,
  isDerived,
  isOverridden,
  layerBox,
  overriddenKeys,
  resetToMobile,
  resolve,
  safe,
  setAt,
  Sheet,
  styleDecls,
  themeCss,
} from "./index";

const r = (base: Style, desktop?: Style): Responsive<Style> => ({ base, desktop });

describe("resolve", () => {
  it("returns the base on mobile", () => {
    expect(resolve(r({ width: "100%" }, { width: "50%" }), "mobile")).toEqual({ width: "100%" });
  });
  it("lays desktop overrides over the mobile base", () => {
    expect(resolve(r({ width: "100%", opacity: 0.5 }, { width: "50%" }), "desktop")).toEqual({ width: "50%", opacity: 0.5 });
  });
  it("inherits everything when desktop is absent", () => {
    expect(resolve(r({ width: "100%" }), "desktop")).toEqual({ width: "100%" });
  });
});

describe("setAt", () => {
  it("writes the base on mobile and leaves overrides alone", () => {
    expect(setAt(r({ width: "100%" }, { width: "50%" }), "mobile", { opacity: 0.4 })).toEqual(r({ width: "100%", opacity: 0.4 }, { width: "50%" }));
  });
  it("writes only overrides on desktop", () => {
    expect(setAt(r({ width: "100%" }), "desktop", { width: "40%" })).toEqual(r({ width: "100%" }, { width: "40%" }));
  });
  it("drops a desktop override that equals mobile", () => {
    expect(setAt(r({ width: "100%" }, { width: "40%" }), "desktop", { width: "100%" })).toEqual({ base: { width: "100%" } });
  });
  it("drops overrides that a mobile edit makes redundant", () => {
    expect(setAt(r({ width: "100%" }, { width: "40%" }), "mobile", { width: "40%" })).toEqual({ base: { width: "40%" } });
  });
  it("compares structured values deeply", () => {
    const out = setAt(r({ radius: [1, 2, 3, 4] }), "desktop", { radius: [1, 2, 3, 4] });
    expect(out.desktop).toBeUndefined();
  });
  it("clears a value with undefined", () => {
    expect(setAt(r({ width: "100%", opacity: 1 }), "mobile", { opacity: undefined })).toEqual({ base: { width: "100%" } });
  });
  it("does not mutate its input", () => {
    const input = r({ width: "100%" });
    setAt(input, "desktop", { width: "1px" });
    expect(input).toEqual({ base: { width: "100%" }, desktop: undefined });
  });
});

describe("override dots and reset", () => {
  const v = r({ width: "100%", opacity: 1 }, { width: "50%", opacity: 1 });
  it("lists keys that differ from mobile", () => {
    expect(overriddenKeys(v)).toEqual(["width"]);
    expect(isOverridden(v, "width")).toBe(true);
    expect(isOverridden(v, "opacity")).toBe(false);
  });
  it("resets one key to mobile", () => {
    expect(resetToMobile(v, "width")).toEqual({ base: v.base });
  });
  it("resets everything to mobile", () => {
    expect(resetToMobile(v)).toEqual({ base: v.base });
  });
});

const canvas = (children: Node[], extra: Partial<Section> = {}): Section => ({
  id: "c1",
  kind: "canvas",
  layout: { base: { columns: 1, gap: 0, padding: "0px", height: 390 } },
  children,
  ...extra,
});
const layer = (base: Style, desktop?: Style): Node => ({ id: "l1", type: "Image", content: {}, style: { base, desktop } });

describe("canvas layers", () => {
  it("uses the stored mobile box", () => {
    const n = layer({ x: 10, y: 20, w: 100, h: 50 });
    expect(layerBox(canvas([n]), n, "mobile")).toEqual({ x: 10, y: 20, w: 100, h: 50, rotation: 0, z: 0 });
  });
  it("derives desktop by scaling mobile, centred", () => {
    const n = layer({ x: 0, y: 0, w: 390, h: 390 });
    const s = canvas([n]);
    const scale = derivedScale(390);
    expect(scale).toBeCloseTo(720 / 390);
    const box = layerBox(s, n, "desktop");
    expect(box.w).toBeCloseTo(720);
    expect(box.x).toBeCloseTo((1440 - 720) / 2);
    expect(isDerived(s, n)).toBe(true);
    expect(canvasSize(s, "desktop")).toEqual({ width: 1440, height: 720 });
  });
  it("stops deriving once desktop has its own position", () => {
    const n = layer({ x: 0, y: 0, w: 100, h: 100 }, { x: 700 });
    const s = canvas([n]);
    expect(layerBox(s, n, "desktop")).toMatchObject({ x: 700, y: 0, w: 100, h: 100 });
    expect(isDerived(s, n)).toBe(false);
  });
  it("stops deriving for a fully custom desktop layout", () => {
    const n = layer({ x: 5, y: 5, w: 100, h: 100 });
    expect(layerBox(canvas([n], { customDesktop: true }), n, "desktop")).toMatchObject({ x: 5, y: 5, w: 100 });
  });
  it("emits percentages of the artboard", () => {
    expect(boxDecls({ x: 39, y: 0, w: 195, h: 100, rotation: 0, z: 2 }, { width: 390, height: 400 })).toEqual({
      left: "10%",
      top: "0%",
      width: "50%",
      height: "25%",
      "z-index": "2",
      transform: "none",
    });
  });
});

describe("css generation", () => {
  it("maps tokens to variables and sanitises raw values", () => {
    expect(colorValue("token:rust")).toBe("var(--c-rust)");
    expect(colorValue("#fff")).toBe("#fff");
    expect(safe("red;} body{display:none} </style>")).not.toMatch(/[;{}<>]/);
  });
  it("turns style into declarations", () => {
    expect(styleDecls({ width: "50%", radius: [18, 18, 0, 0], colSpan: 2, border: { width: 1.5, style: "solid", color: "token:ink" }, shadow: "hard", hidden: true })).toEqual({
      display: "none",
      width: "50%",
      "grid-column": "span 2",
      "border-radius": "18px 18px 0px 0px",
      border: "1.5px solid var(--c-ink)",
      "box-shadow": "5px 5px 0 var(--c-ink)",
    });
  });
  it("fits frame content", () => {
    expect(frameDecls({ fit: "fill", focalX: 58, focalY: 40, zoom: 1, panX: 0, panY: 0 })).toMatchObject({ "object-fit": "cover", "object-position": "58% 40%" });
    expect(frameDecls({ fit: "fit", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 })["object-fit"]).toBe("contain");
    expect(frameDecls({ fit: "free", focalX: 50, focalY: 50, zoom: 1.5, panX: 10, panY: -5 }).transform).toBe("translate(10%, -5%) scale(1.5)");
  });
  it("only emits desktop declarations that differ", () => {
    expect(diff({ width: "100%", color: "red" }, { width: "50%", color: "red" })).toEqual({ width: "50%" });
    expect(diff({ display: "none" }, {})).toEqual({ display: "block" });
  });
  it("writes mobile rules first and desktop inside one media query", () => {
    const sheet = new Sheet();
    addNodeCss(sheet, { id: "a", type: "Text", content: {}, style: { base: { width: "100%" }, desktop: { width: "50%" } } });
    addNodeCss(sheet, { id: "b", type: "Text", content: {}, style: { base: { opacity: 0.5 } } });
    const css = sheet.toString();
    expect(css).toBe(".n-a{width:100%}\n.n-b{opacity:0.5}\n@media (min-width:900px){\n.n-a{width:50%}\n}");
    expect(css.match(/@media/g)).toHaveLength(1);
  });
  it("emits no media query when nothing is overridden", () => {
    const sheet = new Sheet();
    addNodeCss(sheet, { id: "a", type: "Text", content: {}, style: { base: { width: "100%" } } });
    expect(sheet.toString()).not.toContain("@media");
  });
  it("renders grid sections with per-breakpoint columns", () => {
    const sheet = new Sheet();
    addSectionCss(sheet, {
      id: "g",
      kind: "grid",
      layout: { base: { columns: 1, gap: 14, padding: "56px 20px" }, desktop: { columns: 3 } },
      children: [],
    });
    const css = sheet.toString();
    expect(css).toContain(".s-g>.si{max-width:none;padding:56px 20px;grid-template-columns:repeat(1, minmax(0, 1fr));gap:14px}");
    expect(css).toContain("@media (min-width:900px){\n.s-g>.si{grid-template-columns:repeat(3, minmax(0, 1fr))}");
  });
  it("renders canvas sections as aspect-locked artboards with derived desktop layers", () => {
    const n = layer({ x: 0, y: 0, w: 195, h: 195 });
    const sheet = new Sheet();
    addSectionCss(sheet, canvas([n]));
    const css = sheet.toString();
    expect(css).toContain("aspect-ratio:390/390");
    expect(css).toContain(".n-l1{left:0%;top:0%;width:50%;height:50%");
    expect(css).toMatch(/@media[^]*aspect-ratio:1440\/720[^]*\.n-l1\{left:25%;width:25%/);
  });
  it("emits theme variables and text style classes", () => {
    const css = themeCss(seedTheme);
    expect(css).toContain("--c-bone:#F3EFE6");
    expect(css).toContain(".t-h1{font-family:var(--font-display);font-size:calc(var(--cs, 1px) * 36)");
    expect(css).toMatch(/@media \(min-width:900px\)\{[^]*\.t-h1\{font-size:calc\(var\(--cs, 1px\) \* 64\)\}/);
  });
});
