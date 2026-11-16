import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./Footer.styles";

export const FooterContent = z.object({ text: z.string(), showSocials: z.boolean() });
export type FooterContent = z.infer<typeof FooterContent>;

export const Footer = defineComponent<FooterContent>({
  type: "Footer",
  label: "Footer",
  category: "site",
  schema: FooterContent,
  defaults: { content: { text: "© aoost", showSocials: true } },
  css,
  Render: ({ content, ctx }) => (
    <footer className="ft">
      <svg className="ft-art" viewBox="0 0 360 60" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M0 52h360" />
        <path d="M70 52V22c0-8 12-8 12 0v30M70 36h-9c-4 0-5-3-5-6v-8c0-5 7-5 7 0v8h7M82 32h8V20c0-5 7-5 7 0v9c0 4-2 7-6 7h-9" />
        <path d="M220 52c1-8 6-13 13-13s12 5 13 13M300 48l6-4 6 4M298 52l8-6 8 6" />
      </svg>
      <div className="ft-row">
        <p className="t-small">{content.text}</p>
        {content.showSocials && ctx.site.settings.socials.length ? (
          <ul className="ft-social">
            {ctx.site.settings.socials.map((s) => (
              <li key={s.network}>
                <a className="t-small" href={ctx.editing ? undefined : s.url} target="_blank" rel="noopener">
                  {s.label ?? s.network}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  ),
});
