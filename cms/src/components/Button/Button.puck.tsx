import type { Fields } from "@puckeditor/core";
import { linkField } from "../../editor/fields/custom";
import type { ButtonContent } from "./Button";

export const fields: Fields<ButtonContent> = {
  label: { type: "text", label: "Label" },
  target: linkField("Links to"),
  variant: {
    type: "radio",
    label: "Look",
    options: [
      { label: "Filled", value: "filled" },
      { label: "Outline", value: "outline" },
      { label: "Text", value: "text" },
    ],
  },
  newTab: {
    type: "radio",
    label: "Open in a new tab",
    options: [
      { label: "On", value: true },
      { label: "Off", value: false },
    ],
  },
};
