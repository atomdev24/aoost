import { createElement } from "react";
import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./Model3D.styles";

export const Model3DContent = z.object({
  /** A .glb file. */
  src: z.string(),
  alt: z.string(),
  poster: z.string().optional(),
  autoRotate: z.boolean(),
  /** Let visitors drag to turn the model. */
  controls: z.boolean(),
});
export type Model3DContent = z.infer<typeof Model3DContent>;

/** Uses the <model-viewer> element; its script (assets/model-viewer.js) loads only on pages with a 3D block. */
export const Model3D = defineComponent<Model3DContent>({
  type: "Model3D",
  label: "3D model (.glb)",
  category: "media",
  schema: Model3DContent,
  defaults: { content: { src: "", alt: "", autoRotate: true, controls: true }, style: { aspectRatio: "1/1" } },
  css,
  Render: ({ content, ctx }) => {
    if (!content.src) return ctx.editing ? <div className="frame-empty">Choose a .glb model</div> : null;
    return createElement("model-viewer", {
      class: "m3d",
      src: content.src,
      alt: content.alt || "3D model",
      poster: content.poster,
      loading: "lazy",
      reveal: "auto",
      "shadow-intensity": "0.6",
      "auto-rotate": content.autoRotate ? "" : undefined,
      "camera-controls": content.controls ? "" : undefined,
      "touch-action": "pan-y",
    });
  },
});
