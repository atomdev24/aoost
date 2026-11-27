import { newId, type Node, type Page, type Section, type Style } from "../schema";
import { addNode, addSection, locate } from "./page-ops";

/*
 * Copy, cut and paste of blocks and sections, and Copy style / Paste style (Figma's "copy
 * properties"): pure functions on a page, so the editor, the right-click menu and the shortcuts
 * share them. Pasting always makes fresh ids.
 */

export type Clip = { kind: "node"; node: Node } | { kind: "section"; section: Section };

/** What a block or section looks like, without where it sits or how big it is. */
const LOOK: (keyof Style)[] = ["padding", "radius", "border", "shadow", "opacity", "blend", "background", "color", "textAlign", "fontSize", "fontFamily", "fontWeight", "lineHeight", "letterSpacing", "textCase", "filter", "shade", "blur"];

export type StyleClip = { type: string; style: Node["style"]; textStyle?: string };

export function copyOf(page: Page, id: string): Clip | null {
  const at = locate(page, id);
  if (!at) return null;
  if (at.kind === "section") return { kind: "section", section: structuredClone(at.section) };
  return { kind: "node", node: structuredClone(at.node) };
}

const freshNode = (n: Node): Node => ({ ...structuredClone(n), id: newId("n") });
const freshSection = (s: Section): Section => ({ ...structuredClone(s), id: newId("s"), children: s.children.map(freshNode) });

/**
 * Paste after `targetId` (a block: after it in its section; a section: a block goes in at its
 * end, a section after it). With nothing selected, at the end of the page. Returns the new id.
 */
export function pasteClip(page: Page, clip: Clip, targetId: string | null): { page: Page; id: string } {
  const at = targetId ? locate(page, targetId) : null;
  if (clip.kind === "section") {
    const s = freshSection(clip.section);
    const index = at?.kind === "section" ? at.index + 1 : at?.kind === "node" ? page.sections.findIndex((x) => x.id === at.section.id) + 1 : page.sections.length;
    return { page: addSection(page, s, index), id: s.id };
  }
  let n = freshNode(clip.node);
  if (at?.kind === "node") {
    // In a free-layout section the copy sits a little down and right of the original.
    if (at.section.kind === "canvas") n = nudged(n, 16);
    // In a row of column stacks it stays in the same column.
    if (at.section.stacks) n = { ...n, col: at.node.col };
    else if (n.col !== undefined) n = { ...n, col: undefined };
    return { page: addNode(page, at.section.id, n, at.index + 1), id: n.id };
  }
  if (at?.kind === "section") {
    if (n.col !== undefined && !at.section.stacks) n = { ...n, col: undefined };
    return { page: addNode(page, at.section.id, n), id: n.id };
  }
  const s: Section = { id: newId("s"), kind: "flow", layout: { base: { columns: 1, gap: 18, padding: "56px 20px", maxWidth: 1160 }, desktop: { padding: "96px 56px" } }, children: [{ ...n, col: undefined }] };
  return { page: addSection(page, s), id: n.id };
}

function nudged(n: Node, by: number): Node {
  const style = Object.fromEntries(Object.entries(n.style).map(([bp, s]) => [bp, s && (s.x !== undefined || s.y !== undefined) ? { ...s, x: (s.x ?? 0) + by, y: (s.y ?? 0) + by } : s])) as Node["style"];
  return { ...n, style };
}

/** A block's look on every screen size (and a text block's text style). */
export function copyStyle(node: Node): StyleClip {
  const style = Object.fromEntries(Object.entries(node.style).map(([bp, s]) => [bp, pick(s)])) as Node["style"];
  const textStyle = node.type === "Text" && typeof node.content.styleId === "string" ? node.content.styleId : undefined;
  return { type: node.type, style, ...(textStyle ? { textStyle } : {}) };
}

const pick = (s: Style | undefined): Style => Object.fromEntries(LOOK.filter((k) => s?.[k] !== undefined).map((k) => [k, s![k]])) as Style;
const drop = (s: Style | undefined): Style => Object.fromEntries(Object.entries(s ?? {}).filter(([k]) => !LOOK.includes(k as keyof Style))) as Style;

/** The copied look on a block: its own size and place stay; text style carries between text blocks. */
export function pasteStyle(node: Node, clip: StyleClip): Node {
  const bps = new Set([...Object.keys(node.style), ...Object.keys(clip.style)]);
  const style = Object.fromEntries([...bps].map((bp) => [bp, { ...drop(node.style[bp as keyof Node["style"]]), ...(clip.style[bp as keyof Node["style"]] ?? {}) }])) as Node["style"];
  if (!style.base) (style as { base: Style }).base = {};
  const content = clip.textStyle && node.type === "Text" ? { ...node.content, styleId: clip.textStyle } : node.content;
  return { ...node, style, content };
}
