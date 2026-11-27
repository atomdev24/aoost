import type { Fields } from "@puckeditor/core";
import { colourPickField } from "../../../editor/fields/color";
import { mediaField } from "../../../editor/fields/media";
import { buttonStyleField } from "../shared";
import { tickerFields } from "../ticker";
import type { AeroHeroContent } from "./AeroHero";

export const fields: Fields<AeroHeroContent> = {
  title: { type: "textarea", label: "Headline" },
  text: { type: "textarea", label: "Text" },
  eyebrow: { type: "text", label: "Small line above the headline" },
  primaryLabel: { type: "text", label: "Button" },
  primaryUrl: { type: "text", label: "Button link" },
  primaryStyle: buttonStyleField,
  secondaryLabel: { type: "text", label: "Second button" },
  secondaryUrl: { type: "text", label: "Second button link" },
  secondaryStyle: buttonStyleField,
  image: mediaField("Photo", "image"),
  alt: { type: "text", label: "Photo description" },
  badge: mediaField("Product badge (optional)", "image"),
  shade: { type: "number", label: "Darken the photo (0–80)", min: 0, max: 80 },
  shadeColour: colourPickField("Overlay colour", "Deep green") as never,
  align: { type: "radio", label: "Text", options: [{ label: "Left", value: "left" }, { label: "Centred", value: "center" }] },
  height: { type: "radio", label: "Height", options: [{ label: "Full screen", value: "full" }, { label: "Shorter", value: "medium" }] },
  logos: {
    type: "array",
    label: "Customer logos (white artwork)",
    arrayFields: { src: mediaField("Logo", "image"), alt: { type: "text", label: "Company name" } },
    defaultItemProps: { src: "", alt: "" },
    getItemSummary: (item, i) => item.alt || `Logo ${(i ?? 0) + 1}`,
  },
  ...tickerFields,
};
