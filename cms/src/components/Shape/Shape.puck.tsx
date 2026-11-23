import type { Fields } from "@puckeditor/core";
import type { ShapeContent } from "./Shape";

export const fields: Fields<ShapeContent> = {
  kind: {
    type: "radio",
    label: "Shape",
    options: [
      { label: "Rectangle", value: "rectangle" },
      { label: "Ellipse", value: "ellipse" },
      { label: "Line", value: "line" },
    ],
  },
  fill: { type: "text", label: "Fill colour (blank for none)" },
  stroke: { type: "text", label: "Outline colour (blank for none)" },
  strokeWidth: { type: "number", label: "Outline / line thickness (px)", min: 0, max: 40 },
  corners: { type: "number", label: "Rounded corners (px)", min: 0, max: 400 },
};
