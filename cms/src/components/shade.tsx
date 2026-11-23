import type { Node, Style } from "../schema";

/** True when any screen size darkens or blurs this node's picture or video. */
export const hasShade = (node: Pick<Node, "style">): boolean =>
  Object.values(node.style ?? {}).some((s) => !!s && (!!(s as Style).shade || !!(s as Style).blur));

/**
 * The darken-and-blur layer: it sits over the picture and under anything drawn on it (fruit
 * readings, play buttons). Its colour and blur come from the node's style (responsive/css.ts).
 */
export function Shade({ node }: { node: Pick<Node, "style"> }) {
  return hasShade(node) ? <i className="shade" aria-hidden="true" /> : null;
}
