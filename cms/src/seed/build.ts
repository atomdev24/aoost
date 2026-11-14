import type { Node, Section, SectionLayout, Style } from "../schema";

/** Small builders so seeds and templates read like the page they describe. */
type StyleInput = Style | { base: Style; desktop?: Style };
const isResponsive = (s: StyleInput): s is { base: Style; desktop?: Style } => "base" in s;

export function node(id: string, type: string, content: Record<string, unknown>, style: StyleInput = {}, extra: Partial<Node> = {}): Node {
  return { id, type, content, style: isResponsive(style) ? style : { base: style }, ...extra };
}

export const text = (id: string, style: string, value: string, s: StyleInput = {}, tag?: string) =>
  node(id, "Text", { text: value, styleId: style, tag: tag ?? defaultTag(style) }, s);

function defaultTag(style: string) {
  return style === "hero" || style === "h1" ? "h1" : style === "h2" ? "h2" : style === "h3" ? "h3" : "p";
}

export const image = (id: string, src: string, alt: string, s: StyleInput = {}, content: Record<string, unknown> = {}) =>
  node(id, "Image", { src, alt, lightbox: true, ...content }, s);

const baseLayout: SectionLayout = { columns: 1, gap: 18, padding: "56px 20px", maxWidth: 1160 };

export function section(
  id: string,
  kind: Section["kind"],
  children: Node[],
  base: Partial<SectionLayout> = {},
  desktop?: Partial<SectionLayout>,
  name?: string,
): Section {
  return { id, kind, name, layout: { base: { ...baseLayout, ...base }, desktop }, children };
}
