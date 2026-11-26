import { DESKTOP_MIN, TABLET_MIN, WIDESCREEN_MIN, type Breakpoint, type FrameFit, type Node, type Section, type SectionLayout, type Style, type Theme } from "../schema";
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

/** The darken-and-blur layer over a picture or video (components/shade.tsx). */
export function shadeDecls(s: Style): Decls | null {
  if (s.shade === undefined && s.blur === undefined) return null;
  const blur = s.blur ? `blur(${Math.round(s.blur * 10) / 10}px)` : "none";
  return { background: `rgba(0,0,0,${Math.round(s.shade ?? 0) / 100})`, "-webkit-backdrop-filter": blur, "backdrop-filter": blur };
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
    const widths = kind === "grid" && l.colWidths?.length === l.columns ? l.colWidths : null;
    inner["grid-template-columns"] = widths ? widths.map((w) => `minmax(0, ${Math.round(w * 100) / 100}fr)`).join(" ") : `repeat(${kind === "grid" ? l.columns : 1}, minmax(0, 1fr))`;
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

/** Full declarations for the sizes that have their own values; a missing size emits nothing. */
export type ExtraDecls = { tablet?: Decls; widescreen?: Decls };

export class Sheet {
  private base: string[] = [];
  private tablet: string[] = [];
  private desktop: string[] = [];
  private widescreen: string[] = [];

  /**
   * Add a rule from mobile declarations and the full desktop declarations.
   * Tablet (its own range below desktop) is written as the difference from
   * mobile; widescreen (on top of desktop) as the difference from desktop.
   */
  add(selector: string, mobile: Decls, desktop: Decls = mobile, extra: ExtraDecls = {}) {
    if (Object.keys(mobile).length) this.base.push(`${selector}{${body(mobile)}}`);
    const d = diff(mobile, desktop);
    if (Object.keys(d).length) this.desktop.push(`${selector}{${body(d)}}`);
    if (extra.tablet) {
      const t = diff(mobile, extra.tablet);
      if (Object.keys(t).length) this.tablet.push(`${selector}{${body(t)}}`);
    }
    if (extra.widescreen) {
      const w = diff(desktop, extra.widescreen);
      if (Object.keys(w).length) this.widescreen.push(`${selector}{${body(w)}}`);
    }
  }

  raw(css: string) {
    this.base.push(css);
  }

  toString(): string {
    let out = this.base.join("\n");
    const block = (query: string, rules: string[]) => (rules.length ? `\n@media ${query}{\n${rules.join("\n")}\n}` : "");
    out += block(`(min-width:${TABLET_MIN}px) and (max-width:${DESKTOP_MIN - 0.02}px)`, this.tablet);
    out += block(`(min-width:${DESKTOP_MIN}px)`, this.desktop);
    out += block(`(min-width:${WIDESCREEN_MIN}px)`, this.widescreen);
    return out;
  }
}

// --------------------------------------------------------- content → CSS

const BPS: Breakpoint[] = ["mobile", "desktop"];
const EXTRA = ["tablet", "widescreen"] as const;

/** Declarations for the extra sizes that `has` says carry values; the others are left out. */
function extraDecls(has: (bp: (typeof EXTRA)[number]) => boolean, decls: (bp: Breakpoint) => Decls): ExtraDecls {
  const out: ExtraDecls = {};
  for (const bp of EXTRA) if (has(bp)) out[bp] = decls(bp);
  return out;
}

export function addNodeCss(sheet: Sheet, node: Node, section?: Section) {
  const sel = `.n-${node.id}`;
  const canvas = section?.kind === "canvas" ? section : undefined;
  const at = (bp: Breakpoint) => {
    const style = resolve(node.style, bp);
    const decls = styleDecls(style);
    if (canvas) Object.assign(decls, boxDecls(layerBox(canvas, node, bp), canvasSize(canvas, bp)));
    return { style, decls };
  };
  // A layer's box also moves when its canvas section has its own size there.
  const styleSet = (bp: (typeof EXTRA)[number]) => !!node.style[bp] || !!canvas?.layout[bp];
  const [m, d] = BPS.map(at) as [{ style: Style; decls: Decls }, { style: Style; decls: Decls }];
  const extra = { tablet: styleSet("tablet") ? at("tablet") : undefined, widescreen: styleSet("widescreen") ? at("widescreen") : undefined };
  sheet.add(sel, m.decls, d.decls, extraDecls((bp) => !!extra[bp], (bp) => extra[bp as keyof typeof extra]!.decls));
  if (node.frame) {
    const frame = node.frame;
    sheet.add(`${sel} .media`, frameDecls(resolve(frame, "mobile")), frameDecls(resolve(frame, "desktop")), extraDecls((bp) => !!frame[bp], (bp) => frameDecls(resolve(frame, bp))));
  }
  const fm = filterDecls(m.style);
  const fd = filterDecls(d.style);
  const ft = extra.tablet ? filterDecls(extra.tablet.style) : null;
  const fw = extra.widescreen ? filterDecls(extra.widescreen.style) : null;
  if (fm || fd || ft || fw) {
    const none = { media: {}, frame: {}, after: {} };
    const fx = { tablet: ft ?? fm ?? none, widescreen: fw ?? fd ?? fm ?? none };
    for (const part of ["media", "frame", "after"] as const) {
      const sub = part === "media" ? ".media" : part === "frame" ? ".frame" : ".frame::after";
      sheet.add(`${sel} ${sub}`, (fm ?? none)[part], (fd ?? fm ?? none)[part], extraDecls((bp) => !!extra[bp], (bp) => fx[bp as keyof typeof fx][part]));
    }
  }
  const sm = shadeDecls(m.style);
  const sd = shadeDecls(d.style);
  const st = extra.tablet ? shadeDecls(extra.tablet.style) : null;
  const sw = extra.widescreen ? shadeDecls(extra.widescreen.style) : null;
  if (sm || sd || st || sw) {
    const sx = { tablet: st ?? sm ?? {}, widescreen: sw ?? sd ?? sm ?? {} };
    sheet.add(`${sel} .shade`, sm ?? {}, sd ?? sm ?? {}, extraDecls((bp) => !!extra[bp], (bp) => sx[bp as keyof typeof sx]));
  }
}

export function addSectionCss(sheet: Sheet, section: Section) {
  const at = (bp: Breakpoint) => sectionDecls(section.kind, resolve(section.layout, bp), section.kind === "canvas" ? canvasSize(section, bp) : undefined);
  const [m, d] = BPS.map(at) as [ReturnType<typeof sectionDecls>, ReturnType<typeof sectionDecls>];
  const has = (bp: (typeof EXTRA)[number]) => !!section.layout[bp];
  const x = { tablet: has("tablet") ? at("tablet") : undefined, widescreen: has("widescreen") ? at("widescreen") : undefined };
  const pick = (part: "outer" | "inner") => extraDecls(has, (bp) => x[bp as keyof typeof x]![part]);
  sheet.add(`.s-${section.id}`, m.outer, d.outer, pick("outer"));
  sheet.add(`.s-${section.id}>.si`, m.inner, d.inner, pick("inner"));
  const tint = (bp: Breakpoint): Decls => {
    const c = resolve(section.layout, bp).background?.overlay;
    return c ? { background: colorValue(c) } : {};
  };
  sheet.add(`.s-${section.id}>.s-bg>.s-bg-tint`, tint("mobile"), tint("desktop"), extraDecls(has, tint));
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
      // --fit shrinks a translated text a little when it came out longer than the original.
      "font-size": `calc(var(--cs, 1px) * var(--fit, 1) * ${size})`,
      "font-weight": String(t.weight),
      "line-height": String(t.lineHeight),
      "letter-spacing": `${t.tracking}em`,
      "text-transform": t.uppercase ? "uppercase" : "none",
    });
    sheet.add(`.t-${id}`, decls(t.size.base), decls(t.size.desktop ?? t.size.base));
  }
  return sheet.toString();
}
