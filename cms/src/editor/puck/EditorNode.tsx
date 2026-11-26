import type { PuckContext } from "@puckeditor/core";
import { useMemo } from "react";
import { makeCtx } from "../../render/context";
import { nodeAttrs, NodeContent } from "../../render/NodeView";
import { HANDLES } from "../canvas/CanvasController";
import { keepsRatio, toggleKeepRatio } from "../canvas/ratio";
import { getComponent } from "../../components/registry";
import { currentPage, useEditor } from "../store";
import { itemToNode } from "./adapter";
import type { Node, Page } from "../../schema";
import { usePuck } from "./usePuck";

/**
 * A node on the editor canvas. It draws exactly what the public site draws
 * (same wrapper, same component, same CSS) and hands Puck the wrapper as the
 * draggable element.
 */
/**
 * Puck fills a block's missing settings with the component's defaults before drawing it; the live
 * page draws only what is saved. Keep just the saved keys so the editor shows what visitors see.
 */
function savedKeysOnly(node: Node, page: Page): Node {
  let saved: Node | undefined;
  for (const s of page.sections) {
    saved = s.children.find((n) => n.id === node.id);
    if (saved) break;
  }
  if (!saved) return node;
  if (saved.fit) node = { ...node, fit: saved.fit };
  const content = Object.fromEntries(Object.entries(node.content).filter(([k]) => k in saved!.content));
  return Object.keys(content).length === Object.keys(node.content).length ? node : { ...node, content };
}

export function EditorNode({ type, puck, ...props }: { type: string; puck: PuckContext; id: string } & Record<string, unknown>) {
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const bp = useEditor((s) => s.bp);
  const flash = useEditor((s) => s.highlight.includes(props.id));
  const selected = useEditor((s) => s.selection.includes(props.id));
  const inCanvas = usePuck((s) => s.getParentById(props.id)?.type === "CanvasSection");
  const node = savedKeysOnly(itemToNode({ type, props }), page);
  const ctx = useMemo(() => ({ ...makeCtx(site, page, { editing: true }), bp }), [site, page, bp]);
  const attrs = nodeAttrs(node);
  return (
    <div
      ref={puck.dragRef}
      {...attrs}
      className={`${attrs.className}${flash ? " ed-flash" : ""}${node.locked ? " ed-locked" : ""}${selected && inCanvas ? " ed-selected" : ""}`}
      data-enter={undefined}
      data-parallax={undefined}
      data-node-id={node.id}
      style={node.fit ? ({ "--fit": String(node.fit) } as React.CSSProperties) : undefined}
    >
      <NodeContent node={node} ctx={ctx} />
      {selected && inCanvas && !node.locked ? HANDLES.map((h) => <span key={h} className="ed-h" data-ed-handle={h} />) : null}
      {selected && !node.locked && (inCanvas || getComponent(type)?.framed) ? (
        <button
          type="button"
          className="ed-ratio"
          data-ed-ratio=""
          aria-pressed={keepsRatio(node)}
          title={keepsRatio(node) ? "Keeps its proportions when resized (click to resize freely; Shift flips it while dragging)" : "Resizes freely (click to keep its proportions; Shift flips it while dragging)"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toggleKeepRatio(node);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            {keepsRatio(node) ? <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5M2.5 5.5h7v5h-7z" /> : <path d="M3.5 5.5V4a2.5 2.5 0 0 1 4.8-1M2.5 5.5h7v5h-7z" />}
          </svg>
          {keepsRatio(node) ? "Proportions" : "Free"}
        </button>
      ) : null}
      {selected && !inCanvas && !node.locked && getComponent(type)?.framed ? <span className="ed-fh" data-ed-flow-handle="" title="Drag to resize (keeps proportions; Shift to change them)" /> : null}
    </div>
  );
}
