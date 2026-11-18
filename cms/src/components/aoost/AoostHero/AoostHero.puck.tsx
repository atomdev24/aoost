import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import type { AoostHeroContent } from "./AoostHero";

const onOff = (label: string) => ({
  type: "radio" as const,
  label,
  options: [
    { label: "On", value: true },
    { label: "Off", value: false },
  ],
});

export const fields: Fields<AoostHeroContent> = {
  label: { type: "text", label: "Label over the artwork (top left)" },
  reel: {
    type: "array",
    label: "Artwork reel (empty = the projects' images)",
    arrayFields: { src: mediaField("Image", "image"), alt: { type: "text", label: "Description (shown full screen, for screen readers)" } },
    defaultItemProps: { src: "", alt: "" },
    getItemSummary: (item, i) => item.alt || item.src?.split("/").pop() || `Artwork ${(i ?? 0) + 1}`,
  },
  reelSeconds: { type: "number", label: "Seconds per artwork", min: 1, max: 60 },
  clockLabel: { type: "text", label: "Clock label (before the time)" },
  timeZone: { type: "text", label: "Clock time zone (e.g. Africa/Johannesburg)" },
  showTicker: onOff("Ticker strip"),
  ticker: {
    type: "array",
    label: "Ticker lines",
    arrayFields: {
      text: { type: "text", label: "Line" },
      mode: {
        type: "select",
        label: "Shows",
        options: [
          { label: "Always", value: "both" },
          { label: "By day", value: "day" },
          { label: "After midnight", value: "late" },
        ],
      },
    },
    defaultItemProps: { text: "", mode: "both" },
    getItemSummary: (item) => item.text || "New line",
  },
  tickerTopScore: onOff("Ticker: rodeo top score"),
  tickerVisitors: onOff("Ticker: visitor number, last visit, who is here now"),
  lateMode: onOff("Late mode (dark after midnight)"),
};
