import { createElement } from "react";
import { z } from "zod";
import { inline } from "../../render/inline";
import { defineComponent } from "../types";
import { css } from "./Text.styles";

export const TextContent = z.object({
  /** Supports **bold**, *italic*, [links](url) and line breaks. */
  text: z.string(),
  /** A theme text style id, e.g. "h1" or "body". */
  styleId: z.string(),
  tag: z.enum(["h1", "h2", "h3", "h4", "p", "span"]),
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
    return createElement(content.tag, { className: `tx t-${known ? content.styleId : "body"}` }, inline(content.text));
  },
});
