import type { FrameFit, Overlay, SectionLayout, Style } from "../../schema";

/** A declarative description of one property row in a responsive panel. */
export type RowKind = "aspect" | "length" | "text" | "number" | "select" | "color" | "toggle" | "corners" | "border" | "filter" | "background" | "spacing" | "align";
export type RowDef<T> = {
  key: keyof T & string;
  label: string;
  group: string;
  kind: RowKind;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  /** Dense rows: rows sharing a pair label sit side by side in one inspector row under that label. */
  pair?: string;
  /** The short glyph at the start of a number field (drag it to scrub). */
  glyph?: string;
  /** A spacing value: right-click snaps it to the theme's spacing steps. */
  spacing?: boolean;
  /** The value can't be cleared (the schema requires it). */
  required?: boolean;
  /** An alignment grid: which keys hold the horizontal and vertical alignment. */
  alignKeys?: { x: string; y: string };
  /** Show the row only in some contexts, e.g. inside a grid or canvas section. */
  when?: (ctx: RowContext) => boolean;
};
export type RowContext = { parentKind?: "flow" | "grid" | "canvas"; framed?: boolean; fit?: FrameFit["fit"] };

const inCanvas = (c: RowContext) => c.parentKind === "canvas";
const notCanvas = (c: RowContext) => c.parentKind !== "canvas";

export const STYLE_ROWS: RowDef<Style>[] = [
  { key: "x", label: "X", group: "Position", kind: "number", when: inCanvas, suffix: "px", pair: "Position", glyph: "X" },
  { key: "y", label: "Y", group: "Position", kind: "number", when: inCanvas, suffix: "px", pair: "Position", glyph: "Y" },
  { key: "w", label: "Width", group: "Position", kind: "number", min: 1, when: inCanvas, suffix: "px", pair: "Size", glyph: "W" },
  { key: "h", label: "Height", group: "Position", kind: "number", min: 1, when: inCanvas, suffix: "px", pair: "Size", glyph: "H" },
  { key: "rotation", label: "Rotate", group: "Position", kind: "number", min: -360, max: 360, suffix: "°", pair: "Rotate", glyph: "↻" },
  { key: "z", label: "Layer order", group: "Position", kind: "number", step: 1, pair: "Rotate", glyph: "Z" },
  { key: "width", label: "Width", group: "Size", kind: "length", placeholder: "auto", when: notCanvas, pair: "Size", glyph: "W" },
  { key: "height", label: "Height", group: "Size", kind: "length", placeholder: "auto", when: notCanvas, pair: "Size", glyph: "H" },
  { key: "minHeight", label: "Min height", group: "Size", kind: "length", placeholder: "none", when: notCanvas, pair: "Limits", glyph: "↧" },
  { key: "maxWidth", label: "Max width", group: "Size", kind: "length", placeholder: "none", when: notCanvas, pair: "Limits", glyph: "↦" },
  { key: "aspectRatio", label: "Ratio", group: "Size", kind: "aspect", placeholder: "4/3", when: notCanvas },
  { key: "colSpan", label: "Column span", group: "Grid cell", kind: "number", min: 1, max: 12, when: (c) => c.parentKind === "grid", pair: "Span", glyph: "↔" },
  { key: "rowSpan", label: "Row span", group: "Grid cell", kind: "number", min: 1, max: 12, when: (c) => c.parentKind === "grid", pair: "Span", glyph: "↕" },
  { key: "alignSelf", label: "Align", group: "Grid cell", kind: "align", alignKeys: { x: "justifySelf", y: "alignSelf" }, when: notCanvas },
  { key: "margin", label: "Margin", group: "Spacing", kind: "spacing", when: notCanvas, spacing: true },
  { key: "padding", label: "Padding", group: "Spacing", kind: "spacing", spacing: true },
  { key: "radius", label: "Radius", group: "Frame", kind: "corners", pair: "Corners", glyph: "◜" },
  { key: "border", label: "Border", group: "Frame", kind: "border", pair: "Corners", glyph: "▢" },
  {
    key: "shadow",
    label: "Shadow",
    group: "Frame",
    kind: "select",
    options: [
      { value: "", label: "Default" },
      { value: "none", label: "None" },
      { value: "soft", label: "Soft" },
      { value: "hard", label: "Hard offset" },
    ],
  },
  { key: "opacity", label: "Opacity", group: "Look", kind: "number", min: 0, max: 1, step: 0.01, pair: "Layer", glyph: "◐" },
  {
    key: "blend",
    label: "Blend",
    group: "Look",
    kind: "select",
    pair: "Layer",
    options: [{ value: "", label: "Default" }, ...["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference", "exclusion", "luminosity", "soft-light", "hard-light", "color-burn", "color-dodge"].map((v) => ({ value: v, label: v }))],
  },
  { key: "filter", label: "Filter", group: "Look", kind: "filter", when: (c) => !!c.framed },
  { key: "background", label: "Fill", group: "Look", kind: "color" },
  { key: "color", label: "Text colour", group: "Look", kind: "color" },
  {
    key: "textAlign",
    label: "Text align",
    group: "Look",
    kind: "select",
    options: [
      { value: "", label: "Default" },
      { value: "left", label: "Left" },
      { value: "center", label: "Centre" },
      { value: "right", label: "Right" },
    ],
  },
  { key: "hidden", label: "Hide on this breakpoint", group: "Visibility", kind: "toggle" },
];

export const FRAME_ROWS: RowDef<FrameFit>[] = [
  {
    key: "fit",
    label: "Content",
    group: "Content in frame",
    kind: "select",
    options: [
      { value: "fill", label: "Fill the frame" },
      { value: "fit", label: "Fit inside" },
      { value: "free", label: "Free (pan + zoom)" },
    ],
  },
  { key: "focalX", label: "Focal point X", group: "Content in frame", kind: "number", min: 0, max: 100, suffix: "%", pair: "Focal", glyph: "X" },
  { key: "focalY", label: "Focal point Y", group: "Content in frame", kind: "number", min: 0, max: 100, suffix: "%", pair: "Focal", glyph: "Y" },
  { key: "zoom", label: "Zoom", group: "Content in frame", kind: "number", min: 0.1, max: 10, step: 0.01, when: (c) => c.fit === "free", glyph: "⤢" },
  { key: "panX", label: "Pan X", group: "Content in frame", kind: "number", min: -500, max: 500, suffix: "%", when: (c) => c.fit === "free", pair: "Pan", glyph: "X" },
  { key: "panY", label: "Pan Y", group: "Content in frame", kind: "number", min: -500, max: 500, suffix: "%", when: (c) => c.fit === "free", pair: "Pan", glyph: "Y" },
];

const isGrid = (c: RowContext) => c.parentKind === "grid";
export const SECTION_ROWS: RowDef<SectionLayout>[] = [
  { key: "columns", label: "Columns", group: "Layout", kind: "number", min: 1, max: 12, when: isGrid, pair: "Columns", glyph: "⫴", required: true },
  { key: "rows", label: "Rows", group: "Layout", kind: "number", min: 1, max: 12, when: isGrid, glyph: "☰" },
  { key: "gap", label: "Gap", group: "Layout", kind: "number", min: 0, suffix: "px", when: notCanvas, pair: "Columns", glyph: "⇹", spacing: true, required: true },
  { key: "height", label: "Artboard", group: "Layout", kind: "number", min: 40, suffix: "px", when: inCanvas, glyph: "H" },
  { key: "padding", label: "Padding", group: "Layout", kind: "spacing", when: notCanvas, spacing: true, required: true },
  { key: "maxWidth", label: "Content width", group: "Layout", kind: "number", min: 200, suffix: "px", placeholder: "full", pair: "Size", glyph: "↦" },
  { key: "minHeight", label: "Min height", group: "Layout", kind: "length", placeholder: "none", pair: "Size", glyph: "↧" },
  { key: "align", label: "Align", group: "Layout", kind: "align", alignKeys: { x: "justify", y: "align" }, when: notCanvas },
  { key: "background", label: "Background", group: "Background", kind: "background" },
  { key: "hidden", label: "Hide on this breakpoint", group: "Visibility", kind: "toggle" },
];

export const OVERLAY_ROWS: RowDef<Overlay["place"]["base"]>[] = [
  {
    key: "h",
    label: "Across",
    group: "Placement",
    kind: "select",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Centre" },
      { value: "right", label: "Right" },
    ],
  },
  {
    key: "v",
    label: "Down (viewport)",
    group: "Placement",
    kind: "select",
    options: [
      { value: "top", label: "Top" },
      { value: "center", label: "Middle" },
      { value: "bottom", label: "Bottom" },
    ],
  },
  { key: "dx", label: "Nudge X", group: "Placement", kind: "number", suffix: "px", pair: "Nudge", glyph: "X" },
  { key: "dy", label: "Nudge Y", group: "Placement", kind: "number", suffix: "px", pair: "Nudge", glyph: "Y" },
  { key: "width", label: "Width", group: "Placement", kind: "number", min: 1, suffix: "px", glyph: "W" },
];
