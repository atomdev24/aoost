import { useGetPuck } from "@puckeditor/core";
import { useMemo } from "react";
import { makeCtx } from "../../render/context";
import { NodeView } from "../../render/NodeView";
import type { Overlay } from "../../schema";
import { currentPage, setOverlay, useEditor } from "../store";

/** An overlay on the editor canvas. Click it to edit its settings in the right panel. */
export function EditorOverlay({ overlay }: { overlay: Overlay }) {
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const selected = useEditor((s) => s.overlayId === overlay.id);
  const getPuck = useGetPuck();
  const ctx = useMemo(() => makeCtx(site, page, { editing: true }), [site, page]);
  return (
    <div
      className={`ov ov-${overlay.id}${selected ? " ed-selected" : ""}`}
      data-anchor={overlay.anchor === "viewport" ? "viewport" : overlay.anchor.edge}
      onClick={(e) => {
        e.stopPropagation();
        getPuck().dispatch({ type: "setUi", ui: { itemSelector: null } });
        setOverlay(overlay.id);
      }}
    >
      <NodeView node={overlay.node} ctx={ctx} />
    </div>
  );
}
