import type { Fields } from "@puckeditor/core";
import type { DividerContent } from "./Divider";

export const fields: Fields<DividerContent> = {
  variant: {
    type: "radio",
    label: "Line",
    options: [
      { label: "Straight", value: "line" },
      { label: "Dashed", value: "dashed" },
      { label: "Hand-drawn", value: "drawn" },
    ],
  },
};
