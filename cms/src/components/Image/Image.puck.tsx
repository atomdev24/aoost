import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { ImageContent } from "./Image";

export const fields: Partial<Fields<ImageContent>> = {
  src: mediaField("Image", "image", { owner: true }),
  alt: { type: "text", label: "Alt text (describe the image)" },
  caption: { type: "text", label: "Caption" },
  lightbox: {
    type: "radio",
    label: "Tap to open full screen",
    options: [
      { label: "On", value: true },
      { label: "Off", value: false },
    ],
  },
  eager: {
    type: "radio",
    label: "Loading",
    options: [
      { label: "Lazy", value: false },
      { label: "Right away", value: true },
    ],
  },
};
