import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { chartFields } from "../AeroChart/AeroChart.puck";
import { cropsField } from "../AeroCrops/AeroCrops.puck";
import { SAMPLE_CHARTS } from "../charts";
import { backgroundField } from "../shared";
import type { AeroSplitContent } from "./AeroSplit";

export const fields: Fields<AeroSplitContent> = {
  title: { type: "textarea", label: "Title" },
  text: { type: "textarea", label: "Text" },
  kicker: { type: "text", label: "Small blue line above (optional)" },
  cropsLabel: { type: "text", label: "Line above the crop icons" },
  crops: cropsField,
  primaryLabel: { type: "text", label: "Button (optional)" },
  primaryUrl: { type: "text", label: "Button link" },
  secondaryLabel: { type: "text", label: "Second button (optional)" },
  secondaryUrl: { type: "text", label: "Second button link" },
  media: {
    type: "radio",
    label: "Beside the words",
    options: [
      { label: "Photo", value: "picture" },
      { label: "Graphs", value: "charts" },
      { label: "Photo + graph cards", value: "picture-cards" },
    ],
  },
  image: mediaField("Photo", "image"),
  alt: { type: "text", label: "Photo description" },
  charts: {
    type: "array",
    label: "Graphs",
    arrayFields: chartFields,
    defaultItemProps: SAMPLE_CHARTS.bars,
    getItemSummary: (item, i) => item.title || `Graph ${(i ?? 0) + 1}`,
  },
  side: { type: "radio", label: "Photo or graphs on the", options: [{ label: "Right", value: "right" }, { label: "Left", value: "left" }] },
  bg: backgroundField,
};
