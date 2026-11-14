import type { FrameFit, SectionLayout, Style } from "../../schema";

/** A declarative description of one property row in a responsive panel. */
export type RowKind = "length" | "text" | "number" | "select" | "color" | "toggle" | "corners" | "border" | "filter" | "background";
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
  /** Show the row only in some contexts, e.g. inside a grid or canvas section. */
  when?: (ctx: RowContext) => boolean;
};
export type RowContext = { parentKind?: "flow" | "grid" | "canvas"; framed?: boolean; fit?: FrameFit["fit"] };

const ALIGN = [
  { value: "", label: "Default" },
  { value: "start", label: "Start" },
  { value: "center", label: "Centre" },
  { value: "end", label: "End" },
  { value: "stretch", label: "Stretch" },
];
const inCanvas = (c: RowContext) => c.parentKind === "canvas";
const notCanvas = (c: RowContext) => c.parentKind !== "canvas";

export const STYLE_ROWS: RowDef<Style>[] = [
  { key: "x", label: "X", group: "Position", kind: "number", when: inCanvas, suffix: "px" },
  { key: "y", label: "Y", group: "Position", kind: "number", when: inCanvas, suffix: "px" },
  { key: "w", label: "Width", group: "Position", kind: "number", min: 1, when: inCanvas, suffix: "px" },
  { key: "h", label: "Height", group: "Position", kind: "number", min: 1, when: inCanvas, suffix: "px" },
  { key: "rotation", label: "Rotate", group: "Position", kind: "number", min: -360, max: 360, suffix: "°" },
  { key: "z", label: "Layer order", group: "Position", kind: "number", step: 1 },
  { key: "width", label: "Width", group: "Size", kind: "length", placeholder: "auto", when: notCanvas },
  { key: "height", label: "Height", group: "Size", kind: "length", placeholder: "auto", when: notCanvas },
  { key: "minHeight", label: "Min height", group: "Size", kind: "length", placeholder: "none", when: notCanvas },
  { key: "maxWidth", label: "Max width", group: "Size", kind: "length", placeholder: "none", when: notCanvas },
  { key: "aspectRatio", label: "Aspect ratio", group: "Size", kind: "text", placeholder: "4/3", when: notCanvas },
  { key: "colSpan", label: "Column span", group: "Grid cell", kind: "number", min: 1, max: 12, when: (c) => c.parentKind === "grid" },
  { key: "rowSpan", label: "Row span", group: "Grid cell", kind: "number", min: 1, max: 12, when: (c) => c.parentKind === "grid" },
  { key: "alignSelf", label: "Align", group: "Grid cell", kind: "select", options: ALIGN, when: notCanvas },
  { key: "justifySelf", label: "Justify", group: "Grid cell", kind: "select", options: ALIGN, when: notCanvas },
  { key: "margin", label: "Margin", group: "Spacing", kind: "text", placeholder: "0px", when: notCanvas },
  { key: "padding", label: "Padding", group: "Spacing", kind: "text", placeholder: "0px" },
  { key: "radius", label: "Corners", group: "Frame", kind: "corners" },
  { key: "border", label: "Border", group: "Frame", kind: "border" },
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
  { key: "opacity", label: "Opacity", group: "Look", kind: "number", min: 0, max: 1, step: 0.05 },
  {
    key: "blend",
    label: "Blend",
    group: "Look",
    kind: "select",
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
  { key: "focalX", label: "Focal point X", group: "Content in frame", kind: "number", min: 0, max: 100, suffix: "%" },
  { key: "focalY", label: "Focal point Y", group: "Content in frame", kind: "number", min: 0, max: 100, suffix: "%" },
  { key: "zoom", label: "Zoom", group: "Content in frame", kind: "number", min: 0.1, max: 10, step: 0.05, when: (c) => c.fit === "free" },
  { key: "panX", label: "Pan X", group: "Content in frame", kind: "number", min: -500, max: 500, suffix: "%", when: (c) => c.fit === "free" },
  { key: "panY", label: "Pan Y", group: "Content in frame", kind: "number", min: -500, max: 500, suffix: "%", when: (c) => c.fit === "free" },
];

const isGrid = (c: RowContext) => c.parentKind === "grid";
export const SECTION_ROWS: RowDef<SectionLayout>[] = [
  { key: "columns", label: "Columns", group: "Layout", kind: "number", min: 1, max: 12, when: isGrid },
  { key: "rows", label: "Rows", group: "Layout", kind: "number", min: 1, max: 12, when: isGrid },
  { key: "gap", label: "Gap", group: "Layout", kind: "number", min: 0, suffix: "px", when: notCanvas },
  { key: "height", label: "Artboard height", group: "Layout", kind: "number", min: 40, suffix: "px", when: inCanvas },
  { key: "padding", label: "Padding", group: "Layout", kind: "text", placeholder: "56px 20px", when: notCanvas },
  { key: "maxWidth", label: "Content width", group: "Layout", kind: "number", min: 200, suffix: "px", placeholder: "full" },
  { key: "minHeight", label: "Min height", group: "Layout", kind: "length", placeholder: "none" },
  { key: "align", label: "Align cells", group: "Layout", kind: "select", options: ALIGN, when: notCanvas },
  { key: "justify", label: "Justify cells", group: "Layout", kind: "select", options: ALIGN, when: notCanvas },
  { key: "background", label: "Background", group: "Background", kind: "background" },
  { key: "hidden", label: "Hide on this breakpoint", group: "Visibility", kind: "toggle" },
];
