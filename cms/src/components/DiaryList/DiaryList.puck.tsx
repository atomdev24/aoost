import type { Fields } from "@puckeditor/core";
import type { DiaryListContent } from "./DiaryList";

export const fields: Fields<DiaryListContent> = {
  limit: { type: "number", label: "Entries to show (0 = all)", min: 0 },
  showImages: {
    type: "radio",
    label: "Images",
    options: [
      { label: "Show", value: true },
      { label: "Hide", value: false },
    ],
  },
};
