import type { Fields } from "@puckeditor/core";
import type { PostBodyContent } from "./PostBody";

export const fields: Fields<PostBodyContent> = {
  body: { type: "textarea", label: "Body (tip: open the blog writer for a roomier view)" },
};
