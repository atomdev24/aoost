import type { Fields } from "@puckeditor/core";
import type { FooterContent } from "./Footer";

export const fields: Fields<FooterContent> = {
  text: { type: "text", label: "Footer line" },
  showSocials: {
    type: "radio",
    label: "Social links",
    options: [
      { label: "Show", value: true },
      { label: "Hide", value: false },
    ],
  },
};
