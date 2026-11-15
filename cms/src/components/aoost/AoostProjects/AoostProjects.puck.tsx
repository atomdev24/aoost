import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { listField, matField, onOff } from "../fields";
import type { AoostProjectsContent } from "./AoostProjects";

export const fields: Fields<AoostProjectsContent> = {
  heading: { type: "text", label: "Heading" },
  intro: { type: "text", label: "Line above the heading" },
  projects: {
    type: "array",
    label: "Projects",
    arrayFields: {
      image: mediaField("Artwork", "image"),
      title: { type: "text", label: "Title" },
      year: { type: "text", label: "Year" },
      medium: { type: "text", label: "Medium" },
      link: { type: "text", label: "Link (optional)" },
      tags: listField("Tags (comma separated)", "ink, print"),
      sticker: onOff("Cut-out sticker (no card or tape)"),
      hidden: onOff("Hidden"),
    },
    defaultItemProps: { image: "" },
    getItemSummary: (item, i) => item.title || item.image?.split("/").pop() || `Project ${(i ?? 0) + 1}`,
  },
  note: {
    type: "object",
    label: "Sticky note on the table",
    objectFields: { show: onOff("Show"), image: mediaField("Your own note design (600 × 600); empty = the drawn eye", "image") },
  },
  keychain: {
    type: "object",
    label: "Keychain",
    objectFields: { show: onOff("Show"), image: mediaField("Image", "image"), label: { type: "text", label: "Description (for screen readers)" } },
  },
  showCactus: onOff("Cactus beside the intro line"),
  showSkull: onOff("Longhorn skull beside the heading"),
  mat: matField,
};
