import { DESIGN_WIDTH, type Breakpoint, type Node, type Section, type Style } from "../schema";
import { resolve } from "./resolve";

export type Box = { x: number; y: number; w: number; h: number; rotation: number; z: number };

/** Tallest band a mobile composition is scaled into when desktop is derived. */
export const DERIVED_MAX_HEIGHT = 720;

const boxOf = (s: Style): Box => ({ x: s.x ?? 0, y: s.y ?? 0, w: s.w ?? 120, h: s.h ?? 120, rotation: s.rotation ?? 0, z: s.z ?? 0 });
const round = (n: number) => Math.round(n * 100) / 100;

/** Artboard size (design px) of a canvas section at a breakpoint. */
export function canvasSize(section: Section, bp: Breakpoint): { width: number; height: number } {
  const mobileH = section.layout.base.height ?? 480;
  if (bp === "mobile") return { width: DESIGN_WIDTH.mobile, height: mobileH };
  if (bp === "tablet") return { width: DESIGN_WIDTH.tablet, height: section.layout.tablet?.height ?? round(mobileH * (DESIGN_WIDTH.tablet / DESIGN_WIDTH.mobile)) };
  if (bp === "widescreen") {
    const desktopH = canvasSize(section, "desktop").height;
    return { width: DESIGN_WIDTH.widescreen, height: section.layout.widescreen?.height ?? round(desktopH * (DESIGN_WIDTH.widescreen / DESIGN_WIDTH.desktop)) };
  }
  const explicit = section.layout.desktop?.height;
  return { width: DESIGN_WIDTH.desktop, height: explicit ?? round(mobileH * derivedScale(mobileH)) };
}

/** Uniform scale that fits the mobile artboard into the desktop one. */
export function derivedScale(mobileHeight: number): number {
  return Math.min(DESIGN_WIDTH.desktop / DESIGN_WIDTH.mobile, DERIVED_MAX_HEIGHT / mobileHeight);
}

/**
 * A layer's box at a breakpoint (SPEC §3). If desktop has no position yet it
 * is derived by scaling the mobile box, centred, until Alex moves the layer.
 */
export function layerBox(section: Section, node: Node, bp: Breakpoint): Box {
  if (bp === "mobile") return boxOf(node.style.base);
  if (bp === "tablet" || bp === "widescreen") return scaledBox(section, node, bp);
  const d = node.style.desktop ?? {};
  const hasOwn = d.x !== undefined || d.y !== undefined || d.w !== undefined || d.h !== undefined;
  if (hasOwn || section.customDesktop) return boxOf(resolve(node.style, "desktop"));
  const m = boxOf(node.style.base);
  const s = derivedScale(section.layout.base.height ?? 480);
  const offsetX = (DESIGN_WIDTH.desktop - DESIGN_WIDTH.mobile * s) / 2;
  return {
    x: round(offsetX + m.x * s),
    y: round(m.y * s),
    w: round(m.w * s),
    h: round(m.h * s),
    rotation: d.rotation ?? m.rotation,
    z: d.z ?? m.z,
  };
}

/** True while the desktop box is still derived from mobile. */
export function isDerived(section: Section, node: Node): boolean {
  const d = node.style.desktop ?? {};
  return !section.customDesktop && d.x === undefined && d.y === undefined && d.w === undefined && d.h === undefined;
}

/**
 * Tablet and widescreen boxes: the size they inherit from (mobile, desktop),
 * scaled by the design widths, with any of x, y, w, h the layer sets there on top.
 * With nothing set, the layer covers the same share of the artboard as before.
 */
function scaledBox(section: Section, node: Node, bp: "tablet" | "widescreen"): Box {
  const from = bp === "tablet" ? "mobile" : "desktop";
  const b = layerBox(section, node, from);
  const s = DESIGN_WIDTH[bp] / DESIGN_WIDTH[from];
  const own = node.style[bp] ?? {};
  return {
    x: own.x ?? round(b.x * s),
    y: own.y ?? round(b.y * s),
    w: own.w ?? round(b.w * s),
    h: own.h ?? round(b.h * s),
    rotation: own.rotation ?? b.rotation,
    z: own.z ?? b.z,
  };
}

/** True when a section or one of its layers has values for a breakpoint (so CSS for it is needed). */
export function hasValuesAt(section: Section, bp: "tablet" | "widescreen"): boolean {
  return !!section.layout[bp] || section.children.some((n) => !!n.style[bp] || !!n.frame?.[bp]);
}
