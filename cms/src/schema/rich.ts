import { z } from "zod";

/**
 * Rich text: a small, strict subset of the editor's (Tiptap / ProseMirror) document format.
 * Only what's listed here can be stored, so the site never draws anything it doesn't know.
 * The plain `text` next to it stays the source for search, Claude and translations
 * (see model/rich.ts: the rich version is used only while it still matches that text).
 */

/** A theme colour ("token:rust") or a plain hex / rgb colour. Nothing else gets into a style. */
export const RichColor = z.string().regex(/^(token:[a-zA-Z][a-zA-Z0-9]*|#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\))$/);

export const RichMark = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("underline") }),
  z.object({ type: z.literal("strike") }),
  z.object({ type: z.literal("link"), attrs: z.object({ href: z.string().min(1).max(2000) }) }),
  z.object({ type: z.literal("color"), attrs: z.object({ color: RichColor }) }),
  z.object({ type: z.literal("size"), attrs: z.object({ size: z.enum(["s", "l", "xl", "xxl"]) }) }),
]);
export type RichMark = z.infer<typeof RichMark>;

export const RichInline = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1), marks: z.array(RichMark).optional() }),
  z.object({ type: z.literal("hardBreak") }),
]);
export type RichInline = z.infer<typeof RichInline>;

export const RichParagraph = z.object({ type: z.literal("paragraph"), content: z.array(RichInline).optional() });
export type RichParagraph = z.infer<typeof RichParagraph>;

export type RichListItem = { type: "listItem"; content: (RichParagraph | RichList)[] };
export type RichList = { type: "bulletList" | "orderedList"; content: RichListItem[] };

export const RichList: z.ZodType<RichList> = z.lazy(() =>
  z.object({
    type: z.enum(["bulletList", "orderedList"]),
    content: z.array(z.object({ type: z.literal("listItem"), content: z.array(z.union([RichParagraph, RichList])).min(1) })).min(1),
  }),
);

export const RichBlock = z.union([RichParagraph, RichList]);
export type RichBlock = RichParagraph | RichList;

export const RichDoc = z.object({ type: z.literal("doc"), content: z.array(RichBlock).min(1).max(400) });
export type RichDoc = z.infer<typeof RichDoc>;
