import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { sizeField } from "../../../editor/fields/size";
import { listField, matField, onOff } from "../fields";
import type { AoostProjectsContent } from "./AoostProjects";

export const fields: Fields<AoostProjectsContent> = {
  heading: { type: "text", label: "Heading" },
  intro: { type: "text", label: "Line above the heading" },
  projects: {
    type: "array",
    label: "Projects",
    arrayFields: {
      image: mediaField("Artwork", "image", { framed: true }),
      size: sizeField("Size"),
      title: { type: "text", label: "Plaque title (optional)" },
      medium: { type: "text", label: "Plaque medium" },
      year: { type: "text", label: "Plaque year" },
      note: { type: "textarea", label: "Plaque note" },
      link: { type: "text", label: "Link (optional, on the plaque)" },
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
    objectFields: {
      show: onOff("Show"),
      style: {
        type: "radio",
        label: "Drawing on the note",
        options: [
          { label: "Eye", value: "eye" },
          { label: "Plain", value: "plain" },
        ],
      },
      image: mediaField("Your own note design (600 × 600); replaces the drawing", "image", { framed: true }),
    },
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
