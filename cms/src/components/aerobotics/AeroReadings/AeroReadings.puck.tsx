import type { Fields } from "@puckeditor/core";
import type { AeroReadingsContent } from "./AeroReadings";

export const readingsField = {
  type: "array" as const,
  label: "Readings",
  arrayFields: {
    label: { type: "text" as const, label: "Label (small)" },
    value: { type: "text" as const, label: "Reading" },
    swatch: { type: "text" as const, label: "Colour square (optional, e.g. #F0A030)" },
  },
  defaultItemProps: { label: "Current size", value: "65mm", swatch: "" },
  getItemSummary: (item: { label: string; value: string }) => `${item.label}: ${item.value}`,
};

export const fields: Fields<AeroReadingsContent> = {
  readings: readingsField,
  layout: { type: "radio", label: "Layout", options: [{ label: "Stacked", value: "stack" }, { label: "In a row", value: "row" }] },
  animate: { type: "radio", label: "Pop in when scrolled into view", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
};
