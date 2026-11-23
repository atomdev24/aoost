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
  markStyle: {
    type: "select",
    label: "Fruit readings: how they appear",
    options: [
      { label: "Scan ring", value: "ring" },
      { label: "Corner brackets", value: "brackets" },
      { label: "Pulse", value: "pulse" },
    ],
  },
  marks: {
    type: "array",
    label: "Fruit readings (drag a mark on the picture to move it)",
    arrayFields: {
      size: { type: "number", label: "Size (mm)", min: 0, max: 999 },
      colour: {
        type: "select",
        label: "Colour",
        options: [
          { label: "Green", value: "green" },
          { label: "Colour break", value: "break" },
          { label: "Mostly orange", value: "mostly" },
          { label: "Orange", value: "orange" },
        ],
      },
      side: { type: "radio", label: "Label", options: [{ label: "Right", value: "right" }, { label: "Left", value: "left" }] },
      r: { type: "number", label: "Ring size (% of width)", min: 1, max: 40 },
      x: { type: "number", label: "Across (%)", min: 0, max: 100 },
      y: { type: "number", label: "Down (%)", min: 0, max: 100 },
    },
    defaultItemProps: { x: 50, y: 50, r: 8, size: 68, colour: "break", side: "right" },
    getItemSummary: (m, i) => `${(i ?? 0) + 1}: ${m.size} mm`,
  },
};
