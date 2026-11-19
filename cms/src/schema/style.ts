import { z } from "zod";
import { responsive } from "./responsive";

/** A colour is a raw CSS colour or a theme token reference like "token:rust". */
export const Color = z.string().min(1);
/** A CSS length: "320px", "100%", "auto", "12rem", "60vh". */
export const Length = z.string().regex(/^(auto|0|-?\d*\.?\d+(px|%|rem|em|vw|vh|svh|dvh|fr|ch))$/, "not a CSS length");

export const Border = z.object({
  width: z.number().min(0).max(40),
  style: z.enum(["solid", "dashed", "dotted"]),
  color: Color,
});

export const ImageFilter = z.object({
  kind: z.enum(["none", "grayscale", "duotone"]),
  /** Duotone shadow and highlight colours. */
  dark: Color.optional(),
  light: Color.optional(),
});

/** Per-breakpoint layout and look of a node. Every field is optional. */
export const Style = z.object({
  width: Length.optional(),
  height: Length.optional(),
  minHeight: Length.optional(),
  maxWidth: Length.optional(),
  aspectRatio: z.string().regex(/^(auto|\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?)$/).optional(),
  margin: z.string().optional(),
  padding: z.string().optional(),
  alignSelf: z.enum(["start", "center", "end", "stretch"]).optional(),
  justifySelf: z.enum(["start", "center", "end", "stretch"]).optional(),
  /** Grid sections: how many columns / rows the cell spans. */
  colSpan: z.number().int().min(1).max(12).optional(),
  rowSpan: z.number().int().min(1).max(12).optional(),
  /** Canvas sections and overlays: the layer box in design px. */
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().min(1).optional(),
  h: z.number().min(1).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  z: z.number().int().optional(),
  /** Corner radii in px: top-left, top-right, bottom-right, bottom-left. */
  radius: z.tuple([z.number().min(0), z.number().min(0), z.number().min(0), z.number().min(0)]).optional(),
  border: Border.optional(),
  shadow: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  blend: z
    .enum(["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference", "exclusion", "luminosity", "color-burn", "color-dodge", "soft-light", "hard-light"])
    .optional(),
  hidden: z.boolean().optional(),
  background: Color.optional(),
  color: Color.optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  filter: ImageFilter.optional(),
});
export type Style = z.infer<typeof Style>;
export const ResponsiveStyle = responsive(Style);
export type ResponsiveStyle = z.infer<typeof ResponsiveStyle>;

/** InDesign-style content fitting inside a frame (media nodes). */
export const FrameFit = z.object({
  fit: z.enum(["fill", "fit", "free"]),
  /** Focal point in percent of the content. */
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
  /** Free mode: 1 = content fills the frame width. */
  zoom: z.number().min(0.1).max(10),
  /** Free mode: pan in percent of the frame. */
  panX: z.number().min(-500).max(500),
  panY: z.number().min(-500).max(500),
});
export type FrameFit = z.infer<typeof FrameFit>;
export const ResponsiveFrameFit = responsive(FrameFit);
/** A content item's size on its own layout spot (a project piece): a multiplier on its laid-out size. */
export const ItemSize = z.object({ scale: z.number().min(0.4).max(2.5) });
export type ItemSize = z.infer<typeof ItemSize>;
export const ResponsiveItemSize = responsive(ItemSize);
export const DEFAULT_ITEM_SIZE: ItemSize = { scale: 1 };
export const DEFAULT_FRAME_FIT: FrameFit = { fit: "fill", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 };
