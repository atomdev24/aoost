import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { backgroundField } from "../shared";
import type { AeroLogosContent } from "./AeroLogos";

export const fields: Fields<AeroLogosContent> = {
  title: { type: "text", label: "Line above the logos" },
  logos: {
    type: "array",
    label: "Logos (white artwork)",
    arrayFields: { src: mediaField("Logo", "image"), alt: { type: "text", label: "Company name" } },
    defaultItemProps: { src: "", alt: "" },
    getItemSummary: (item, i) => item.alt || `Logo ${(i ?? 0) + 1}`,
  },
  bg: backgroundField,
};
