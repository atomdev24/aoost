import { DESKTOP_MIN, type Breakpoint, type FrameFit, type Node, type Section, type SectionLayout, type Style, type Theme } from "../schema";
import { canvasSize, layerBox, type Box } from "./canvas";
import { resolve } from "./resolve";

export type Decls = Record<string, string>;

/** Keep authored values from escaping a declaration or the <style> element. */
export function safe(value: string): string {
  return value.replace(/[<>{};\\]/g, "").replace(/\/\*|\*\//g, "").trim();
}

/** "token:rust" → var(--c-rust); anything else is passed through, sanitised. */
export function colorValue(c: string): string {
  const m = /^token:([a-zA-Z][a-zA-Z0-9]*)$/.exec(c);
  return m ? `var(--c-${m[1]})` : safe(c);
}

const SHADOWS: Record<string, string> = {
  none: "none",
  soft: "0 10px 30px rgba(20,20,20,.18)",
  hard: "5px 5px 0 var(--c-ink)",
};
export const shadowValue = (s: string) => SHADOWS[s] ?? safe(s);

const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const pct = (n: number) => `${Math.round(n * 10000) / 10000}%`;
const ALIGN = { start: "start", center: "center", end: "end", stretch: "stretch" } as const;

/** Declarations for a node wrapper in a flow or grid section. */
export function styleDecls(s: Style): Decls {
  const d: Decls = {};
  if (s.hidden) d.display = "none";
  else if (s.hidden === false) d.display = "block";
  if (s.width) d.width = s.width;
  if (s.height) d.height = s.height;
  if (s.minHeight) d["min-height"] = s.minHeight;
  if (s.maxWidth) d["max-width"] = s.maxWidth;
  if (s.aspectRatio) d["aspect-ratio"] = s.aspectRatio.replace(/\s/g, "");
  if (s.margin) d.margin = safe(s.margin);
  if (s.padding) d.padding = safe(s.padding);
  if (s.alignSelf) d["align-self"] = ALIGN[s.alignSelf];
  if (s.justifySelf) d["justify-self"] = ALIGN[s.justifySelf];
  if (s.colSpan) d["grid-column"] = `span ${s.colSpan}`;
  if (s.rowSpan) d["grid-row"] = `span ${s.rowSpan}`;
  if (s.radius) d["border-radius"] = s.radius.map(px).join(" ");
  if (s.border) d.border = s.border.width > 0 ? `${px(s.border.width)} ${s.border.style} ${colorValue(s.border.color)}` : "0";
  if (s.shadow) d["box-shadow"] = shadowValue(s.shadow);
  if (s.opacity !== undefined) d.opacity = String(s.opacity);
  if (s.blend) d["mix-blend-mode"] = s.blend;
  if (s.background) d.background = colorValue(s.background);
  if (s.color) d.color = colorValue(s.color);
  if (s.textAlign) d["text-align"] = s.textAlign;
  if (s.rotation && s.x === undefined) d.transform = `rotate(${s.rotation}deg)`;
  if (s.z !== undefined && s.x === undefined) {
    d.position = "relative";
    d["z-index"] = String(s.z);
  }
  return d;
}

/** A canvas layer box as percentages of its artboard, so it scales with no JS. */
export function boxDecls(box: Box, artboard: { width: number; height: number }): Decls {
  const d: Decls = {
    left: pct((box.x / artboard.width) * 100),
    top: pct((box.y / artboard.height) * 100),
    width: pct((box.w / artboard.width) * 100),
    height: pct((box.h / artboard.height) * 100),
    "z-index": String(box.z),
  };
  d.transform = box.rotation ? `rotate(${box.rotation}deg)` : "none";
  return d;
}

/** Content fitting inside a frame: applies to the media element. */
export function frameDecls(f: FrameFit): Decls {
  const pos = `${f.focalX}% ${f.focalY}%`;
  if (f.fit === "fit") return { "object-fit": "contain", "object-position": pos, transform: "none" };
  if (f.fit === "fill") return { "object-fit": "cover", "object-position": pos, transform: "none" };
  return {
    "object-fit": "cover",
    "object-position": pos,
    "transform-origin": pos,
    transform: `translate(${f.panX}%, ${f.panY}%) scale(${f.zoom})`,
  };
}

export function filterDecls(s: Style): { media: Decls; frame: Decls; after: Decls } | null {
  const f = s.filter;
  if (!f) return null;
  if (f.kind === "none") return { media: { filter: "none", "mix-blend-mode": "normal" }, frame: {}, after: { display: "none" } };
  if (f.kind === "grayscale") return { media: { filter: "grayscale(1)", "mix-blend-mode": "normal" }, frame: {}, after: { display: "none" } };
  return {
    media: { filter: "grayscale(1) contrast(1.1)", "mix-blend-mode": "multiply" },
    frame: { background: colorValue(f.light ?? "token:bone") },
    after: { display: "block", background: colorValue(f.dark ?? "token:ink") },
  };
}

export function sectionDecls(kind: Section["kind"], l: SectionLayout, artboard?: { width: number; height: number }): { outer: Decls; inner: Decls } {
  const outer: Decls = {};
  const inner: Decls = {};
  if (l.hidden) outer.display = "none";
  else if (l.hidden === false) outer.display = "block";
  if (l.background?.color) outer["background-color"] = colorValue(l.background.color);
  if (l.minHeight) outer["min-height"] = l.minHeight;
  inner["max-width"] = l.maxWidth ? px(l.maxWidth) : "none";
  inner.padding = safe(l.padding);
  if (kind === "canvas" && artboard) {
    inner["aspect-ratio"] = `${artboard.width}/${artboard.height}`;
    inner["--cw"] = String(artboard.width);
  } else {
    inner["grid-template-columns"] = `repeat(${kind === "grid" ? l.columns : 1}, minmax(0, 1fr))`;
    if (kind === "grid" && l.rows) inner["grid-auto-rows"] = "minmax(0, auto)";
    inner.gap = px(l.gap);
    if (l.align) inner["align-items"] = ALIGN[l.align];
    if (l.justify) inner["justify-items"] = ALIGN[l.justify];
  }
  return { outer, inner };
}

// ------------------------------------------------------------ rule output

const body = (d: Decls) =>
  Object.entries(d)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

/** Desktop declarations that differ from mobile. */
export function diff(base: Decls, desktop: Decls): Decls {
  const out: Decls = {};
  for (const [k, v] of Object.entries(desktop)) if (base[k] !== v) out[k] = v;
  // A property set on mobile but absent on desktop has to be reset explicitly.
  for (const k of Object.keys(base)) if (!(k in desktop)) out[k] = RESET[k] ?? "initial";
  return out;
}
const RESET: Decls = { display: "block", transform: "none", position: "static", "z-index": "auto", margin: "0", padding: "0" };

export class Sheet {
  private base: string[] = [];
  private desktop: string[] = [];

  /** Add a rule from mobile declarations and the full desktop declarations. */
  add(selector: string, mobile: Decls, desktop: Decls = mobile) {
    if (Object.keys(mobile).length) this.base.push(`${selector}{${body(mobile)}}`);
    const d = diff(mobile, desktop);
    if (Object.keys(d).length) this.desktop.push(`${selector}{${body(d)}}`);
  }

  raw(css: string) {
    this.base.push(css);
  }

  toString(): string {
    const out = this.base.join("\n");
    return this.desktop.length ? `${out}\n@media (min-width:${DESKTOP_MIN}px){\n${this.desktop.join("\n")}\n}` : out;
  }
}

// --------------------------------------------------------- content → CSS

const BPS: Breakpoint[] = ["mobile", "desktop"];

export function addNodeCss(sheet: Sheet, node: Node, section?: Section) {
  const sel = `.n-${node.id}`;
  const [m, d] = BPS.map((bp) => {
    const style = resolve(node.style, bp);
    const decls = styleDecls(style);
    if (section?.kind === "canvas") Object.assign(decls, boxDecls(layerBox(section, node, bp), canvasSize(section, bp)));
    return { style, decls };
  }) as [{ style: Style; decls: Decls }, { style: Style; decls: Decls }];
  sheet.add(sel, m.decls, d.decls);

  if (node.frame) {
    sheet.add(`${sel} .media`, frameDecls(resolve(node.frame, "mobile")), frameDecls(resolve(node.frame, "desktop")));
  }
  const fm = filterDecls(m.style);
  const fd = filterDecls(d.style);
  if (fm || fd) {
    const none = { media: {}, frame: {}, after: {} };
    sheet.add(`${sel} .media`, (fm ?? none).media, (fd ?? fm ?? none).media);
    sheet.add(`${sel} .frame`, (fm ?? none).frame, (fd ?? fm ?? none).frame);
    sheet.add(`${sel} .frame::after`, (fm ?? none).after, (fd ?? fm ?? none).after);
  }
}

export function addSectionCss(sheet: Sheet, section: Section) {
  const [m, d] = BPS.map((bp) =>
    sectionDecls(section.kind, resolve(section.layout, bp), section.kind === "canvas" ? canvasSize(section, bp) : undefined),
  ) as [ReturnType<typeof sectionDecls>, ReturnType<typeof sectionDecls>];
  sheet.add(`.s-${section.id}`, m.outer, d.outer);
  sheet.add(`.s-${section.id}>.si`, m.inner, d.inner);
  const tint = (bp: Breakpoint): Decls => {
    const c = resolve(section.layout, bp).background?.overlay;
    return c ? { background: colorValue(c) } : {};
  };
  sheet.add(`.s-${section.id}>.s-bg>.s-bg-tint`, tint("mobile"), tint("desktop"));
  for (const node of section.children) addNodeCss(sheet, node, section);
}

/** Theme tokens as CSS variables, plus one class per text style. */
export function themeCss(theme: Theme): string {
  const sheet = new Sheet();
  const vars: Decls = {};
  for (const [k, v] of Object.entries(theme.colors)) vars[`--c-${k}`] = safe(v);
  for (const [k, v] of Object.entries(theme.fonts)) vars[`--font-${k}`] = safe(v);
  for (const [k, v] of Object.entries(theme.radii)) vars[`--r-${k}`] = px(v);
  for (const [k, v] of Object.entries(theme.spacing)) vars[`--sp-${k}`] = px(v);
  sheet.add(":root", vars);
  for (const face of theme.fontFaces) {
    sheet.raw(
      `@font-face{font-family:'${safe(face.family).replace(/'/g, "")}';src:url('${safe(face.src).replace(/'/g, "")}');font-weight:${safe(face.weight)};font-style:${face.style};font-display:swap}`,
    );
  }
  for (const [id, t] of Object.entries(theme.typeStyles)) {
    const decls = (size: number): Decls => ({
      "font-family": `var(--font-${t.font})`,
      // --cs is one design px inside a canvas section, so type scales with the artboard.
      "font-size": `calc(var(--cs, 1px) * ${size})`,
      "font-weight": String(t.weight),
      "line-height": String(t.lineHeight),
      "letter-spacing": `${t.tracking}em`,
      "text-transform": t.uppercase ? "uppercase" : "none",
    });
    sheet.add(`.t-${id}`, decls(t.size.base), decls(t.size.desktop ?? t.size.base));
  }
  return sheet.toString();
}
