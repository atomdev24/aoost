import type { Fields } from "@puckeditor/core";
import { typeStyleField } from "../../editor/fields/custom";
import type { TextContent } from "./Text";

export const fields: Fields<TextContent> = {
  text: { type: "textarea", label: "Words (double-click them on the page to style them)" },
  styleId: typeStyleField(),
  tag: {
    type: "select",
    label: "Meaning (for search engines and screen readers)",
    options: [
      { label: "Paragraph", value: "p" },
      { label: "Heading 1 (page title)", value: "h1" },
      { label: "Heading 2", value: "h2" },
      { label: "Heading 3", value: "h3" },
      { label: "Heading 4", value: "h4" },
      { label: "Inline text", value: "span" },
    ],
  },
};
