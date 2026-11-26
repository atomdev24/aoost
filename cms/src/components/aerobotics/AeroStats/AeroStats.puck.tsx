import type { Fields } from "@puckeditor/core";
import { backgroundField } from "../shared";
import type { AeroStatsContent } from "./AeroStats";

export const fields: Fields<AeroStatsContent> = {
  items: {
    type: "array",
    label: "Numbers",
    arrayFields: { value: { type: "text", label: "Number" }, label: { type: "text", label: "What it counts" } },
    defaultItemProps: { value: "100+", label: "Something counted" },
    getItemSummary: (item, i) => item.value || `Number ${(i ?? 0) + 1}`,
  },
  bg: backgroundField,
};
