import { createElement } from "react";
import { z } from "zod";
import { inline } from "../../render/inline";
import { renderRich } from "../../render/rich";
import { richFor } from "../../model/rich";
import { RichDoc } from "../../schema/rich";
import { defineComponent } from "../types";
import { css } from "./Text.styles";

export const TextContent = z.object({
  /** Supports **bold**, *italic*, [links](url) and line breaks. */
  text: z.string(),
  /** A theme text style id, e.g. "h1" or "body". */
  styleId: z.string(),
  tag: z.enum(["h1", "h2", "h3", "h4", "p", "span"]),
  /** The same words with colour, underline, lists and paragraphs (model/rich.ts). Drawn only while it matches `text`. */
  rich: RichDoc.optional(),
});
export type TextContent = z.infer<typeof TextContent>;

export const Text = defineComponent<TextContent>({
  type: "Text",
  label: "Text",
  category: "basic",
  schema: TextContent,
  defaults: { content: { text: "Say something", styleId: "body", tag: "p" } },
  css,
  Render: ({ content, ctx }) => {
    const known = content.styleId in ctx.site.theme.typeStyles;
    const className = `tx t-${known ? content.styleId : "body"}`;
    const rich = richFor(content);
    return rich ? renderRich(rich, content.tag, className) : createElement(content.tag, { className }, inline(content.text));
  },
});
