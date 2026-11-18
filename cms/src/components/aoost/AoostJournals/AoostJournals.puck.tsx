import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { hexField, matField, onOff } from "../fields";
import type { AoostJournalsContent } from "./AoostJournals";

export const fields: Fields<AoostJournalsContent> = {
  heading: { type: "text", label: "Heading" },
  sub: { type: "text", label: "Line under the heading" },
  journals: {
    type: "array",
    label: "Journals",
    arrayFields: {
      title: { type: "text", label: "Title" },
      year: { type: "text", label: "Year" },
      cover: mediaField("Cover image (empty = plain colour)", "image", { framed: true }),
      coverColor: hexField("Cover colour"),
      sticker: mediaField("Sticker on the cover", "image"),
      band: hexField("Elastic band colour"),
      tilt: { type: "number", label: "Tilt on the shelf (degrees)", min: -20, max: 20 },
      dark: onOff("Dark pages"),
      link: { type: "text", label: "Link (optional)" },
      pages: {
        type: "array",
        label: "Pages (keep an even number; empty pages say “work in progress”)",
        arrayFields: {
          image: mediaField("Scan that fills the page", "image"),
          photo: mediaField("Or: a photo taped to the page", "image"),
          note: { type: "textarea", label: "Handwritten note" },
          date: { type: "text", label: "Date" },
          paper: {
            type: "select",
            label: "Paper",
            options: [
              { label: "Default", value: undefined as never },
              ...["dots", "lined", "graph", "blank", "kraft", "black", "tracing"].map((p) => ({ label: p, value: p as never })),
            ],
          },
          spread: onOff("Runs across both pages"),
        } as never,
        defaultItemProps: {},
        getItemSummary: (p: { image?: string; photo?: string; note?: string; items?: unknown[] }, i?: number) =>
          `Page ${(i ?? 0) + 1}${p.image ? " · scan" : p.photo ? " · photo" : p.note ? " · note" : p.items?.length ? ` · ${p.items.length} placed item${p.items.length === 1 ? "" : "s"}` : " · empty"}`,
      } as never,
      options: {
        type: "object",
        label: "Cover extras",
        objectFields: {
          ribbon: hexField("Ribbon bookmark colour (empty = none)"),
          wear: {
            type: "select",
            label: "Wear",
            options: [
              { label: "None", value: "none" },
              { label: "Light", value: "light" },
              { label: "Heavy", value: "heavy" },
            ],
          },
          titleStamp: onOff("Title stamped into the cover"),
          coverText: {
            type: "select",
            label: "Stamp colour",
            options: [
              { label: "Dark", value: "dark" },
              { label: "Light", value: "light" },
            ],
          },
          sound: onOff("Page-turn sound"),
          backCover: mediaField("Back cover image", "image"),
        },
      } as never,
      hidden: onOff("Hidden"),
    } as never,
    defaultItemProps: { title: "new journal", year: String(new Date().getFullYear()), coverColor: "#222222", band: "#141516", tilt: 3, pages: [] },
    getItemSummary: (j) => j.title || "Journal",
  },
  mat: matField,
};
