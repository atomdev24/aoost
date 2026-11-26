import type { Fields } from "@puckeditor/core";
import { backgroundField } from "../shared";
import type { AeroPageHeaderContent } from "./AeroPageHeader";

export const fields: Fields<AeroPageHeaderContent> = {
  title: { type: "textarea", label: "Title" },
  text: { type: "textarea", label: "Intro" },
  kicker: { type: "text", label: "Small blue line above (optional)" },
  buttonLabel: { type: "text", label: "Button (optional)" },
  buttonUrl: { type: "text", label: "Button link" },
  bg: backgroundField,
};
