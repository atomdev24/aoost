import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { readingsField } from "../AeroReadings/AeroReadings.puck";
import type { AeroProductCardContent } from "./AeroProductCard";

export const fields: Fields<AeroProductCardContent> = {
  eyebrow: { type: "text", label: "Product name" },
  title: { type: "textarea", label: "One-liner" },
  primaryLabel: { type: "text", label: "Button" },
  primaryUrl: { type: "text", label: "Button link" },
  secondaryLabel: { type: "text", label: "Second button" },
  secondaryUrl: { type: "text", label: "Second button link" },
  image: mediaField("Photo", "image"),
  alt: { type: "text", label: "Photo description" },
  panel: { type: "text", label: "Panel colour (e.g. #142104)" },
  side: { type: "radio", label: "Panel on the", options: [{ label: "Left", value: "left" }, { label: "Right", value: "right" }] },
  readings: { ...readingsField, label: "Reading tags on the photo (optional)" },
};
