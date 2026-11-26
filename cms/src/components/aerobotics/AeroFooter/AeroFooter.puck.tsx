import type { Fields } from "@puckeditor/core";
import type { AeroFooterContent } from "./AeroFooter";

export const fields: Fields<AeroFooterContent> = {
  columns: {
    type: "array",
    label: "Link columns",
    arrayFields: { title: { type: "text", label: "Heading" }, links: { type: "textarea", label: "Links, one per line: Label | link" } },
    defaultItemProps: { title: "Column", links: "Link | https://aerobotics.com" },
    getItemSummary: (item, i) => item.title || `Column ${(i ?? 0) + 1}`,
  },
  linkedin: { type: "text", label: "LinkedIn" },
  instagram: { type: "text", label: "Instagram" },
  youtube: { type: "text", label: "YouTube" },
  facebook: { type: "text", label: "Facebook" },
  x: { type: "text", label: "X" },
  legalLabel: { type: "text", label: "Legal link" },
  legalUrl: { type: "text", label: "Legal link address" },
  copyright: { type: "text", label: "Copyright line" },
};
