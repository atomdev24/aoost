import type { Fields } from "@puckeditor/core";
import type { PostListContent } from "./PostList";

export const fields: Fields<PostListContent> = {
  parentId: { type: "text", label: "Only posts under this page (its id, e.g. blog); empty for all" },
  limit: { type: "number", label: "How many", min: 1, max: 60 },
  layout: {
    type: "radio",
    label: "Layout",
    options: [
      { label: "Grid", value: "grid" },
      { label: "List", value: "list" },
    ],
  },
};
