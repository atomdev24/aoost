import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroFeaturesContent } from "./AeroFeatures";

export const fields: Fields<AeroFeaturesContent> = {
  title: { type: "textarea", label: "Title" },
  text: { type: "textarea", label: "Intro (optional)" },
  items: {
    type: "array",
    label: "Points",
    arrayFields: { icon: mediaField("Icon (optional)", "image"), title: { type: "text", label: "Title" }, text: { type: "textarea", label: "Text" } },
    defaultItemProps: { icon: "", title: "New point", text: "" },
    getItemSummary: (item, i) => item.title || `Point ${(i ?? 0) + 1}`,
  },
  columns: { type: "number", label: "Columns (desktop)", min: 2, max: 4 },
  look: { type: "radio", label: "Look", options: [{ label: "Line above each", value: "rule" }, { label: "Plain", value: "plain" }] },
  align: { type: "radio", label: "Title", options: [{ label: "Centred", value: "center" }, { label: "Left", value: "left" }] },
  bg: backgroundField,
};
