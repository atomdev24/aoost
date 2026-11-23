import type { Fields } from "@puckeditor/core";
import { linkField } from "../../editor/fields/custom";
import { mediaField } from "../../editor/fields/media";
import type { ImageContent } from "./Image";

export const fields: Partial<Fields<ImageContent>> = {
  src: mediaField("Image", "image", { owner: true }),
  alt: { type: "text", label: "Alt text (describe the image)" },
  caption: { type: "text", label: "Caption" },
  // An empty address means no link.
  link: linkField("Link (makes the picture a button)") as unknown as Fields<ImageContent>["link"],
  press: {
    type: "radio",
    label: "When pressed",
    options: [
      { label: "Press in", value: "press" },
      { label: "Nothing", value: "none" },
    ],
  },
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
