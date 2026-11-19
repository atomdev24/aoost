import type { Fields } from "@puckeditor/core";
import { matField, onOff } from "../fields";
import type { AoostAboutContent } from "./AoostAbout";

export const fields: Fields<AoostAboutContent> = {
  label: { type: "text", label: "Small label (mono)" },
  line: { type: "textarea", label: "The line (large, light)" },
  byline: { type: "text", label: "Byline (mono)" },
  rule: onOff("Hairline under the text"),
  showSocials: onOff("Links to your profiles (from Site settings)"),
  mat: matField,
};
