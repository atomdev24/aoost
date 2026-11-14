import type { PuckContext } from "@puckeditor/core";
import { useMemo } from "react";
import { makeCtx } from "../../render/context";
import { nodeAttrs, NodeContent } from "../../render/NodeView";
import { currentPage, useEditor } from "../store";
import { itemToNode } from "./adapter";

/**
 * A node on the editor canvas. It draws exactly what the public site draws
 * (same wrapper, same component, same CSS) and hands Puck the wrapper as the
 * draggable element.
 */
export function EditorNode({ type, puck, ...props }: { type: string; puck: PuckContext; id: string } & Record<string, unknown>) {
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const bp = useEditor((s) => s.bp);
  const flash = useEditor((s) => s.highlight.includes(props.id));
  const node = itemToNode({ type, props });
  const ctx = useMemo(() => ({ ...makeCtx(site, page, { editing: true }), bp }), [site, page, bp]);
  const attrs = nodeAttrs(node);
  return (
    <div
      ref={puck.dragRef}
      {...attrs}
      className={`${attrs.className}${flash ? " ed-flash" : ""}${node.locked ? " ed-locked" : ""}`}
      data-enter={undefined}
      data-parallax={undefined}
      data-node-id={node.id}
    >
      <NodeContent node={node} ctx={ctx} />
    </div>
  );
}
