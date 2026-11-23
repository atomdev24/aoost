import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { CardsContent } from "./Cards";

export const fields: Fields<CardsContent> = {
  cards: {
    type: "array",
    label: "Cards",
    arrayFields: {
      image: mediaField("Picture", "image"),
      alt: { type: "text", label: "Picture description" },
      eyebrow: { type: "text", label: "Small label" },
      title: { type: "text", label: "Title" },
      tags: { type: "text", label: "Tags (comma separated)" },
      text: { type: "textarea", label: "Text" },
      listLabel: { type: "text", label: "Chips heading" },
      list: { type: "text", label: "Chips (comma separated, the first is filled)" },
      primaryLabel: { type: "text", label: "Button" },
      primaryUrl: { type: "text", label: "Button link" },
      secondaryLabel: { type: "text", label: "Second link" },
      secondaryUrl: { type: "text", label: "Second link address" },
    },
    defaultItemProps: { image: "", alt: "", eyebrow: "Group", title: "New card", tags: "", text: "", listLabel: "", list: "", primaryLabel: "View", primaryUrl: "#", secondaryLabel: "", secondaryUrl: "" },
    getItemSummary: (item, i) => item.title || `Card ${(i ?? 0) + 1}`,
  },
  columns: { type: "number", label: "Cards per row (desktop)", min: 1, max: 4 },
  accent: { type: "text", label: "Button colour" },
  ink: { type: "text", label: "Title colour" },
  surface: { type: "text", label: "Card colour" },
};
