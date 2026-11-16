import type { Fields } from "@puckeditor/core";
import { hexField, matField, onOff } from "../fields";
import type { AoostDrawingWallContent } from "./AoostDrawingWall";

const swatches = (label: string) => ({
  type: "array" as const,
  label,
  arrayFields: { name: { type: "text" as const, label: "Name" }, color: hexField("Colour") },
  defaultItemProps: { name: "New colour", color: "#2236F2" },
  getItemSummary: (s: { name?: string; color?: string }) => `${s.name ?? ""} ${s.color ?? ""}`.trim() || "Colour",
});

export const fields: Fields<AoostDrawingWallContent> = {
  show: onOff("Show the wall on the page"),
  heading: { type: "text", label: "Heading" },
  paint: swatches("Paint colours"),
  noteColors: swatches("Sticky-note colours"),
  backgrounds: swatches("Background colours (the first is the starting colour)"),
  mat: matField,
};
