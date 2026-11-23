import type { Fields } from "@puckeditor/core";
import { colorField } from "../../editor/fields/color";
import type { FruitReadingContent } from "./FruitReading";

export const fields: Partial<Fields<FruitReadingContent>> = {
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
  colourText: { type: "text", label: "Colour words (optional, replaces the stage name)" },
  swatch: colorField("Colour block") as never,
  look: {
    type: "select",
    label: "How it appears",
    options: [
      { label: "Scan ring", value: "ring" },
      { label: "Corner brackets", value: "brackets" },
      { label: "Pulse", value: "pulse" },
    ],
  },
  side: { type: "radio", label: "Label", options: [{ label: "Right", value: "right" }, { label: "Left", value: "left" }] },
  labels: { type: "radio", label: "Label size", options: [{ label: "Fixed", value: "fixed" }, { label: "Scales with the ring", value: "scale" }] },
  delay: { type: "number", label: "Start after (seconds)", min: 0, max: 20 },
};
