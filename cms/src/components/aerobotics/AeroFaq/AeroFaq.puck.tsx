import type { Fields } from "@puckeditor/core";
import { backgroundField } from "../shared";
import type { AeroFaqContent } from "./AeroFaq";

export const fields: Fields<AeroFaqContent> = {
  title: { type: "text", label: "Title" },
  items: {
    type: "array",
    label: "Questions",
    arrayFields: { question: { type: "text", label: "Question" }, answer: { type: "textarea", label: "Answer" } },
    defaultItemProps: { question: "New question?", answer: "" },
    getItemSummary: (item, i) => item.question || `Question ${(i ?? 0) + 1}`,
  },
  bg: backgroundField,
};
