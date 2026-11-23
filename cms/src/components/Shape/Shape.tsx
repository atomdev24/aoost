import type { CSSProperties } from "react";
import { z } from "zod";
import { colorValue } from "../../responsive/css";
import { defineComponent } from "../types";

/** A plain shape: rectangle, ellipse or line, filled and/or outlined. Best in free-layout sections, as a layer. */
export const ShapeContent = z.object({
  kind: z.enum(["rectangle", "ellipse", "line"]),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().min(0).max(40),
  /** Rectangle corners, px. */
  corners: z.number().min(0).max(400),
});
export type ShapeContent = z.infer<typeof ShapeContent>;

export const Shape = defineComponent<ShapeContent>({
  type: "Shape",
  label: "Shape: rectangle, ellipse or line",
  category: "basic",
  schema: ShapeContent,
  defaults: { content: { kind: "rectangle", fill: "#0075E1", stroke: "", strokeWidth: 0, corners: 0 }, style: { w: 220, h: 140, minHeight: "40px" } },
  css: `
.shape{width:100%;height:100%;box-sizing:border-box}
.shape-line{display:flex;align-items:center}
.shape-line>i{display:block;width:100%}
`,
  Render: ({ content }) => {
    const fill = content.fill.trim() ? colorValue(content.fill.trim()) : "transparent";
    const stroke = content.stroke.trim() ? colorValue(content.stroke.trim()) : "";
    if (content.kind === "line") {
      return (
        <div className="shape shape-line" aria-hidden="true">
          <i style={{ height: Math.max(1, content.strokeWidth || 2), background: stroke || fill, borderRadius: 999 }} />
        </div>
      );
    }
    const style: CSSProperties = {
      background: fill,
      border: stroke && content.strokeWidth ? `${content.strokeWidth}px solid ${stroke}` : undefined,
      borderRadius: content.kind === "ellipse" ? "50%" : content.corners ? `${content.corners}px` : undefined,
    };
    return <div className={`shape shape-${content.kind}`} style={style} aria-hidden="true" />;
  },
});
