import { z } from "zod";
import { isExternal } from "../../render/links";
import { LinkTarget } from "../../schema/content";
import { defineComponent } from "../types";
import { css } from "./Button.styles";

export const ButtonContent = z.object({
  label: z.string().min(1),
  target: LinkTarget,
  variant: z.enum(["filled", "outline", "text"]),
  newTab: z.boolean().optional(),
});
export type ButtonContent = z.infer<typeof ButtonContent>;

export const Button = defineComponent<ButtonContent>({
  type: "Button",
  label: "Button",
  category: "basic",
  schema: ButtonContent,
  defaults: { content: { label: "Get in touch", target: { kind: "url", url: "/" }, variant: "outline" } },
  css,
  Render: ({ content, ctx }) => {
    const href = ctx.href(content.target);
    const blank = content.newTab || (content.newTab === undefined && isExternal(href));
    return (
      <a className={`btn btn-${content.variant}`} href={ctx.editing ? undefined : href} {...(blank ? { target: "_blank", rel: "noopener" } : {})}>
        {content.label}
        {isExternal(href) ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3 9l6-6M4 3h5v5" />
          </svg>
        ) : null}
      </a>
    );
  },
});
