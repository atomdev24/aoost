import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { withThumb } from "../fields";
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
    getItemSummary: (item, i) => withThumb(item.src, item.alt || item.src?.split("/").pop() || `Artwork ${(i ?? 0) + 1}`),
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
  phantoms: onOff("Simulated visitors (the odd cursor drifting through)"),
  phantomRate: {
    type: "radio",
    label: "Simulated visitors: how often",
    options: [
      { label: "Rare", value: "rare" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Often", value: "often" },
    ],
  },
  dotLook: {
    type: "radio",
    label: "Dot board: look",
    options: [
      { label: "Flat", value: "flat" },
      { label: "Glass", value: "glass" },
      { label: "Glass block", value: "glassblock" },
      { label: "Liquid glass", value: "liquid" },
    ],
  },
  dotGlass: {
    type: "object",
    label: "Dot board: glass block / liquid glass settings",
    objectFields: {
      clarity: { type: "number", label: "Clarity (0 bent, 1 crisp)", min: 0, max: 1, step: 0.05 },
      cell: { type: "number", label: "Square size (px)", min: 6, max: 60, step: 1 },
      refract: { type: "number", label: "Refraction", min: 0, max: 0.9, step: 0.05 },
      shimmer: { type: "number", label: "Shimmer", min: 0, max: 2, step: 0.05 },
      wobble: { type: "number", label: "Liquid wobble", min: 0, max: 6, step: 0.1 },
    },
  },
  dotEffect: {
    type: "radio",
    label: "Dot board: how lines appear",
    options: [
      { label: "Breathe", value: "breathe" },
      { label: "Resolve", value: "resolve" },
    ],
  },
  dotTextSize: { type: "number", label: "Dot board: text size (% of strip height)", min: 30, max: 95, step: 5 },
  dotAfter: {
    type: "radio",
    label: "Dot board: after the last line",
    options: [
      { label: "Repeat the lines", value: "loop" },
      { label: "Wave", value: "wave" },
      { label: "Twinkle", value: "twinkle" },
    ],
  },
  dotIdleSpeed: { type: "number", label: "Dot board: idle animation speed (0.1 slow – 3 fast)", min: 0.1, max: 3, step: 0.1 },
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
