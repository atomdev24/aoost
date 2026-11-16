import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { GalleryGridContent } from "./GalleryGrid";

export const fields: Fields<GalleryGridContent> = {
  items: {
    type: "array",
    label: "Images",
    arrayFields: {
      src: mediaField("Image", "image"),
      alt: { type: "text", label: "Alt text" },
      title: { type: "text", label: "Title (shown full screen, searchable)" },
    },
    defaultItemProps: { src: "", alt: "", title: "" },
    getItemSummary: (item, i) => item.title || item.alt || `Image ${(i ?? 0) + 1}`,
  },
  columns: { type: "number", label: "Columns on mobile", min: 1, max: 6 },
  columnsDesktop: { type: "number", label: "Columns on desktop", min: 1, max: 8 },
  gap: { type: "number", label: "Gap (px)", min: 0, max: 80 },
  lightbox: {
    type: "radio",
    label: "Tap to open full screen",
    options: [
      { label: "On", value: true },
      { label: "Off", value: false },
    ],
  },
};
