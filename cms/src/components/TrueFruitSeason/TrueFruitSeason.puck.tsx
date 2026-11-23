import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { TrueFruitSeasonContent } from "./TrueFruitSeason";

const onOff = (label: string) => ({ type: "radio" as const, label, options: [{ label: "On", value: true }, { label: "Off", value: false }] });

export const fields: Fields<TrueFruitSeasonContent> = {
  previewStage: {
    type: "radio",
    label: "Show in the editor",
    options: [
      { label: "Size", value: 0 },
      { label: "Grade", value: 1 },
      { label: "BinScan", value: 2 },
    ],
  },
  showIntro: onOff("Intro (logo, heading and text)"),
  logo: mediaField("Intro logo", "image"),
  heading: { type: "text", label: "Heading" },
  intro: { type: "textarea", label: "Intro text" },
  sizeTitle: { type: "text", label: "Size: title" },
  sizeLead: { type: "textarea", label: "Size: text" },
  sizePhoto: mediaField("Size: photo", "image"),
  sizeLink: { type: "text", label: "Size: link" },
  gradeTitle: { type: "text", label: "Grade: title" },
  gradeLead: { type: "textarea", label: "Grade: text" },
  gradePhoto: mediaField("Grade: photo", "image"),
  gradeLink: { type: "text", label: "Grade: link" },
  binScanTitle: { type: "text", label: "BinScan: title" },
  binScanLead: { type: "textarea", label: "BinScan: text" },
  binScanPhoto: mediaField("BinScan: photo", "image"),
  binScanLink: { type: "text", label: "BinScan: link" },
  layout: {
    type: "radio",
    label: "Layout",
    options: [
      { label: "Scale desktop", value: "scale" },
      { label: "Responsive", value: "responsive" },
    ],
  },
  designWidth: { type: "number", label: "Design width (scale desktop)", min: 600, max: 1600 },
  headerHeight: { type: "number", label: "Nav height (the panel pins below it)", min: 0, max: 200 },
};
