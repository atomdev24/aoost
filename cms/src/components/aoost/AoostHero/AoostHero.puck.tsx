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
    arrayFields: { src: mediaField("Image", "image", { framed: true, altKey: "alt" }), alt: { type: "text", label: "Description (shown full screen, for screen readers)" } },
    defaultItemProps: { src: "", alt: "" },
    getItemSummary: (item, i) => item.alt || item.src?.split("/").pop() || `Artwork ${(i ?? 0) + 1}`,
  },
  reelSeconds: { type: "number", label: "Seconds per artwork", min: 1, max: 60 },
  reelBar: onOff("Progress line under the artwork"),
  reelViewer: onOff("Click artwork to open it full screen"),
  artPan: {
    type: "radio",
    label: "Artwork pan (glides across on its own)",
    options: [
      { label: "Off", value: "off" },
      { label: "Right to left", value: "rtl" },
      { label: "Left to right", value: "ltr" },
    ],
  },
  artPanSeconds: { type: "number", label: "Artwork pan: seconds per pass", min: 3, max: 60, step: 1 },
  artPanDistance: { type: "number", label: "Artwork pan: distance (% of width)", min: 2, max: 20, step: 1 },
  clockLabel: { type: "text", label: "Clock label (before the time)" },
  timeZone: { type: "text", label: "Clock time zone (e.g. Africa/Johannesburg)" },
  showTicker: onOff("Ticker strip"),
  tickerStyle: {
    type: "radio",
    label: "Strip style",
    options: [
      { label: "Scrolling ticker", value: "scroll" },
      { label: "Dot board", value: "dots" },
    ],
  },
  dotSeconds: { type: "number", label: "Dot board: seconds per line", min: 2.4, max: 30, step: 0.5 },
  dotGrid: onOff("Dot board: faint dot grid behind"),
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
