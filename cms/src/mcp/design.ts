import { z } from "zod";
import { createNode, createSection } from "../model/page-ops";
import { DESIGN_WIDTH, type Node, type Section, type Site, type Style } from "../schema";

/**
 * Bringing in a design (a Figma frame, or any flat list of layers) as a free-layout section
 * (site and CMS review, 22 Nov 2026, phase 2). Claude reads the frame with the Figma connector,
 * uploads its pictures (upload_media_from_url), and passes the layers here in one call.
 *
 * - Desktop: the frame is scaled to the 1440 px artboard, every layer where the design put it.
 * - Phones: given a phone frame, its layers' spots are used (matched by name); otherwise the
 *   layers are stacked in reading order (top to bottom, then left to right) at the phone's
 *   width, so the section is readable on a phone straight away and can be tidied in the editor.
 * - Text takes the theme's text style closest to its size, so it stays on the site's type scale.
 */

const Layer = z.object({
  kind: z.enum(["text", "image", "box", "button"]),
  name: z.string().max(80).optional().describe("Layer name (used to match the phone frame's layer)."),
  x: z.number(),
  y: z.number(),
  w: z.number().min(1),
  h: z.number().min(1),
  rotation: z.number().min(-360).max(360).optional(),
  opacity: z.number().min(0).max(1).optional(),
  radius: z.number().min(0).optional().describe("Corner radius in the design's px."),
  // text and button
  text: z.string().max(4000).optional(),
  size: z.number().min(4).max(400).optional().describe("Font size in the design's px."),
  color: z.string().max(40).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  tag: z.enum(["h1", "h2", "h3", "h4", "p", "span"]).optional(),
  // image
  src: z.string().optional().describe("A /media/... URL from upload_media_from_url, or /art/..."),
  alt: z.string().max(300).optional(),
  // box
  fill: z.string().max(40).optional(),
  // button
  href: z.string().optional(),
});
export type DesignLayer = z.infer<typeof Layer>;

export const DesignInput = z.object({
  frame: z.object({ width: z.number().min(100), height: z.number().min(40) }).describe("The design frame's size (desktop)."),
  layers: z.array(Layer).min(1).max(200).describe("The frame's layers, top-level, with x/y relative to the frame."),
  phone: z
    .object({ width: z.number().min(200), height: z.number().min(40), layers: z.array(Layer).max(200) })
    .optional()
    .describe("The same section's phone frame, if the design has one. Layers are matched by name."),
});
export type DesignInput = z.infer<typeof DesignInput>;

const round = (n: number) => Math.round(n * 10) / 10;
const hex = (c?: string) => (c && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : undefined);

/** The theme text style whose desktop size is nearest. */
export function nearestStyle(site: Site, size: number): string {
  let best = "body";
  let gap = Infinity;
  for (const [id, t] of Object.entries(site.theme.typeStyles)) {
    const d = Math.abs((t.size.desktop ?? t.size.base) - size);
    if (d < gap) {
      gap = d;
      best = id;
    }
  }
  return best;
}

function boxStyle(l: DesignLayer, s: number): Style {
  return {
    x: round(l.x * s),
    y: round(l.y * s),
    w: round(l.w * s),
    h: round(l.h * s),
    ...(l.rotation ? { rotation: l.rotation } : {}),
    ...(l.opacity !== undefined && l.opacity < 1 ? { opacity: l.opacity } : {}),
    ...(l.radius ? { radius: [round(l.radius * s), round(l.radius * s), round(l.radius * s), round(l.radius * s)] as [number, number, number, number] } : {}),
  };
}

function layerNode(site: Site, l: DesignLayer): Node {
  const look: Style = { ...(hex(l.color) ? { color: hex(l.color) } : {}), ...(l.align ? { textAlign: l.align } : {}) };
  switch (l.kind) {
    case "text": {
      const size = l.size ?? 16;
      return createNode("Text", { content: { text: l.text ?? "", styleId: nearestStyle(site, size), tag: l.tag ?? (size >= 40 ? "h2" : size >= 24 ? "h3" : "p") }, style: look });
    }
    case "image":
      return { ...createNode("Image", { content: { src: l.src ?? "", alt: l.alt ?? l.name ?? "" } }), name: l.name };
    case "button":
      return { ...createNode("Button", { content: { label: l.text || "Button", target: { kind: "url", url: l.href || "#" }, variant: "filled" } }), name: l.name };
    case "box":
      return { ...createNode("Spacer", { content: {}, style: hex(l.fill) ? { background: hex(l.fill) } : {} }), name: l.name ?? "Shape" };
  }
}

/** Stack layers for a phone: reading order, full width with a margin, proportional heights. */
function stacked(layers: DesignLayer[], frameW: number): { boxes: Style[]; height: number } {
  const W = DESIGN_WIDTH.mobile;
  const M = 20;
  const order = layers.map((l, i) => ({ l, i })).sort((a, b) => a.l.y - b.l.y || a.l.x - b.l.x);
  const boxes: Style[] = new Array(layers.length);
  let y = 32;
  for (const { l, i } of order) {
    // narrow things (a button, an icon) keep their size; wide ones take the phone's width
    const native = l.w * Math.min(1, W / frameW) * 1.6;
    const w = Math.min(W - 2 * M, Math.max(native, l.kind === "button" ? 120 : 40));
    const h = l.kind === "text" ? Math.max(24, Math.ceil(((l.text ?? "").length * (l.size ?? 16) * 0.55) / w) * (l.size ?? 16) * 1.35) : (l.h / l.w) * w;
    boxes[i] = { x: round(l.kind === "box" && w >= W - 2 * M ? 0 : M), y: round(y), w: round(l.kind === "box" && w >= W - 2 * M ? W : w), h: round(h) };
    y += h + 16;
  }
  return { boxes, height: round(y + 16) };
}

/** The section and its nodes. */
export function designSection(site: Site, input: DesignInput, name?: string): Section {
  const s = DESIGN_WIDTH.desktop / input.frame.width;
  const phone = input.phone;
  const byName = new Map((phone?.layers ?? []).filter((l) => l.name).map((l) => [l.name!, l]));
  const auto = stacked(input.layers, input.frame.width);
  const ps = phone ? DESIGN_WIDTH.mobile / phone.width : 1;
  const nodes = input.layers.map((l, i) => {
    const node = { ...layerNode(site, l), ...(l.name ? { name: l.name } : {}) };
    const mine = l.name ? byName.get(l.name) : undefined;
    const mobile = phone && mine ? boxStyle(mine, ps) : auto.boxes[i]!;
    return { ...node, style: { base: { ...node.style.base, ...mobile }, desktop: boxStyle(l, s) } };
  });
  const base = createSection("canvas", { name: name ?? "Imported design" });
  return {
    ...base,
    customDesktop: true,
    layout: {
      base: { ...base.layout.base, height: phone ? round(phone.height * ps) : auto.height },
      desktop: { ...(base.layout.desktop ?? base.layout.base), height: round(input.frame.height * s) },
    },
    children: nodes,
  };
}
