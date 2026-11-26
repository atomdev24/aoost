import type { Fields } from "@puckeditor/core";
import type { AeroOfficesContent } from "./AeroOffices";

export const fields: Fields<AeroOfficesContent> = {
  kicker: { type: "text", label: "Small blue line" },
  title: { type: "textarea", label: "Title" },
  offices: {
    type: "array",
    label: "Offices",
    arrayFields: { name: { type: "text", label: "Office" }, address: { type: "textarea", label: "Address and phone, one line each" } },
    defaultItemProps: { name: "New office", address: "" },
    getItemSummary: (item, i) => item.name || `Office ${(i ?? 0) + 1}`,
  },
};
