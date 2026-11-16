import type { ReactElement } from "react";
import { getComponent } from "../components/registry";
import type { RenderCtx } from "../components/types";
import type { Node } from "../schema";

/** Resolve a Global reference to the node it stands for. */
export function resolveGlobal(node: Node, ctx: RenderCtx): Node | null {
  if (node.type !== "Global") return node;
  const g = ctx.site.globals.find((x) => x.id === node.content.globalId);
  return g ? g.node : null;
}

/** The inside of a node: its component, with content validated and defaulted. */
export function NodeContent({ node, ctx }: { node: Node; ctx: RenderCtx }): ReactElement | null {
  const target = resolveGlobal(node, ctx);
  if (!target) return ctx.editing ? <div className="frame-empty">Pick a global component</div> : null;
  const def = getComponent(target.type);
  if (!def) return ctx.editing ? <div className="frame-empty">Unknown component: {target.type}</div> : null;
  const parsed = def.schema.safeParse(target.content);
  const content = parsed.success ? parsed.data : { ...def.defaults.content, ...target.content };
  return <def.Render node={target} content={content} ctx={ctx} />;
}

export function nodeAttrs(node: Node): Record<string, string | undefined> {
  const fx = node.effects;
  return {
    className: `n n-${node.id}${node.style.base.width ? " fw" : ""}${fx?.sticky ? " fx-sticky" : ""}`,
    "data-type": node.type,
    "data-enter": fx?.enter && fx.enter !== "none" ? fx.enter : undefined,
    "data-parallax": fx?.parallax ? String(fx.parallax) : undefined,
  };
}

/** A node on the public site: wrapper (layout, look, scroll effects) plus content. */
export function NodeView({ node, ctx }: { node: Node; ctx: RenderCtx }): ReactElement {
  const attrs = nodeAttrs(node);
  const style = node.effects?.sticky ? ({ "--sticky-top": `${node.effects.stickyTop ?? 16}px` } as React.CSSProperties) : undefined;
  return (
    <div {...attrs} style={style}>
      <NodeContent node={node} ctx={ctx} />
    </div>
  );
}
