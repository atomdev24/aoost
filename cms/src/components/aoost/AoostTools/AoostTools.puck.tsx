import type { Fields } from "@puckeditor/core";
import { matField } from "../fields";
import type { AoostToolsContent } from "./AoostTools";

export const fields: Fields<AoostToolsContent> = {
  heading: { type: "text", label: "Heading" },
  tools: {
    type: "array",
    label: "Tools",
    arrayFields: {
      abbr: { type: "text", label: "Tile letters (e.g. Ps)" },
      name: { type: "text", label: "Name" },
      level: { type: "text", label: "Level word (e.g. Daily, Fluent, Learning)" },
      value: { type: "number", label: "Bar (0 to 100)", min: 0, max: 100 },
    },
    defaultItemProps: { abbr: "Xx", name: "New tool", level: "Learning", value: 30 },
    getItemSummary: (t) => t.name || "Tool",
  },
  mat: matField,
};
