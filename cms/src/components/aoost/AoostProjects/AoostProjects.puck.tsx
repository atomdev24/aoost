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
  fixtures: {
    type: "array",
    label: "Fixtures (sit on top of everything)",
    arrayFields: {
      image: mediaField("Object (transparent PNG)", "image"),
      x: { type: "number", label: "Across the table (%)", min: 0, max: 100 },
      y: { type: "number", label: "Down the table (%)", min: 0, max: 100 },
      width: { type: "number", label: "Width (px on a wide screen)", min: 40, max: 800 },
      rotate: { type: "number", label: "Turn (degrees)", min: -180, max: 180 },
      hidden: onOff("Hidden"),
    },
    defaultItemProps: { image: "", x: 30, y: 30, width: 200 },
    getItemSummary: (item, i) => item.image?.split("/").pop() || `Fixture ${(i ?? 0) + 1}`,
  },
  shadow: {
    type: "object",
    label: "Shadow over the section (sits on top of everything)",
    objectFields: {
      show: onOff("Show"),
      style: { type: "select", label: "Shadow", options: [{ label: "Window and plant", value: "window" }] },
      image: mediaField("Your own shadow (transparent PNG/WebP, dark where the shadow falls); replaces the preset", "image"),
      strength: { type: "number", label: "Darkness (0–100, default 70)", min: 0, max: 100 },
      sun: { type: "number", label: "Warm light in the window (0–100, default 60)", min: 0, max: 100 },
      scale: { type: "number", label: "Size (% of the screen's width, default 110)", min: 40, max: 300 },
      x: { type: "number", label: "Across (%, default 50)", min: 0, max: 100 },
      y: { type: "number", label: "Down (%, default 40)", min: 0, max: 100 },
    },
  },
  viewer: onOff("Tap a piece to open it full screen"),
  showCactus: onOff("Cactus beside the intro line"),
  showSkull: onOff("Longhorn skull beside the heading"),
  mat: matField,
};
