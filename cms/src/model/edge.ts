import type { Node, Style } from "../schema";

/**
 * Edge to edge: a block in a section stretched to the full width of the
 * screen, past the section's padding and content width (on every size).
 * Breaks out with `width: 100vw` and a negative side margin, so the rest of
 * the section keeps its padding.
 */
export const EDGE_WIDTH = "100vw";
export const EDGE_MARGIN = "0 calc(50% - 50vw)";
const SIZES = ["base", "tablet", "desktop", "widescreen"] as const;

export const isEdgeToEdge = (n: Node) => n.style.base.width === EDGE_WIDTH && n.style.base.margin === EDGE_MARGIN;

export function setEdgeToEdge(n: Node, on: boolean): Node {
  const style = { ...n.style } as Record<(typeof SIZES)[number], Style | undefined>;
  for (const size of SIZES) {
    const s = style[size];
    if (!s) continue;
    const next: Style = { ...s };
    delete next.width;
    delete next.maxWidth;
    delete next.margin;
    if (on) delete next.radius;
    style[size] = next;
  }
  if (on) style.base = { ...style.base!, width: EDGE_WIDTH, margin: EDGE_MARGIN };
  for (const size of SIZES.slice(1)) if (style[size] && !Object.keys(style[size]!).length) delete style[size];
  return { ...n, style: style as Node["style"] };
}
