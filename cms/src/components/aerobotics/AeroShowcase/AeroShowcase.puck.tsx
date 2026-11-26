import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import type { AeroShowcaseContent } from "./AeroShowcase";

export const fields: Fields<AeroShowcaseContent> = {
  title: { type: "textarea", label: "Title" },
  text: { type: "textarea", label: "Text" },
  screen: mediaField("Platform screenshot", "image"),
  screenAlt: { type: "text", label: "Screenshot description" },
  videoUrl: { type: "text", label: "Video link (shows a play button)" },
  background: mediaField("Background photo", "image"),
};
