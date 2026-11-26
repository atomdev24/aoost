import type { Fields } from "@puckeditor/core";
import { backgroundField, buttonStyleField } from "../shared";
import type { AeroCtaContent } from "./AeroCta";

export const fields: Fields<AeroCtaContent> = {
  title: { type: "textarea", label: "Headline" },
  primaryLabel: { type: "text", label: "Button" },
  primaryUrl: { type: "text", label: "Button link" },
  primaryStyle: buttonStyleField,
  secondaryLabel: { type: "text", label: "Second button" },
  secondaryUrl: { type: "text", label: "Second button link" },
  secondaryStyle: buttonStyleField,
  bg: backgroundField,
};
