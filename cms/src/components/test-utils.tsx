import { renderToStaticMarkup } from "react-dom/server";
import { NodeContent } from "../render/NodeView";
import { makeCtx } from "../render/context";
import { Site, type Node } from "../schema";
import { seedSite } from "../seed/site";
import "./registry";

const site = Site.parse(seedSite);

/** Render one component to static HTML, as the public site (or the editor) would. */
export function renderNode(type: string, content: Record<string, unknown>, opts: { editing?: boolean; node?: Partial<Node> } = {}): string {
  const node: Node = { id: "t1", type, content, style: { base: {} }, ...opts.node };
  return renderToStaticMarkup(<NodeContent node={node} ctx={makeCtx(site, site.pages[0]!, { editing: opts.editing })} />);
}
