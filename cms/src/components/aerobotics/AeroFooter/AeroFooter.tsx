import { z } from "zod";
import { safeUrl } from "../../../render/links";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { linkLines } from "../shared";
import { css } from "./AeroFooter.styles";

export const AeroFooterContent = z.object({
  columns: z.array(z.object({ title: z.string(), links: z.string() })),
  linkedin: z.string(),
  instagram: z.string(),
  youtube: z.string(),
  facebook: z.string(),
  x: z.string(),
  legalLabel: z.string(),
  legalUrl: z.string(),
  copyright: z.string(),
});
export type AeroFooterContent = z.infer<typeof AeroFooterContent>;

const A = "https://aerobotics.com";
const NAMES: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", x: "X" };
const ICONS: Record<string, string> = {
  linkedin: "M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2 9h4v12H2zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.5-2.2 3V21H9z",
  instagram: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 2c-2.7 0-3 0-4.1.1C4.3 2.3 2.3 4.2 2.1 7.9 2 9 2 9.3 2 12s0 3 .1 4.1c.2 3.6 2.2 5.6 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c3.6-.2 5.6-2.2 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.2-3.6-2.2-5.6-5.8-5.8C15 2 14.7 2 12 2z",
  youtube: "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15V9l5.8 3z",
  facebook: "M14 8V6c0-.9.6-1.1 1-1.1h2.6V1H14c-4 0-4.9 3-4.9 4.9V8H6.8v4h2.3v11H14V12h3.3l.4-4z",
  x: "M17.8 2h3.4l-7.4 8.5L22.5 22h-6.8l-5.3-7-6.1 7H.9l7.9-9.1L.5 2h7l4.8 6.4zm-1.2 18h1.9L6.5 3.9H4.5z",
};

/** The navy footer: link columns, social icons, the large faint wordmark and the legal line. */
export const AeroFooter = defineComponent<AeroFooterContent>({
  type: "AeroFooter",
  label: "Footer: links, socials and wordmark",
  category: "aerobotics",
  schema: AeroFooterContent,
  defaults: {
    content: {
      columns: [
        { title: "Products", links: `TrueFruit Size | ${A}/true-fruit-size\nTrueFruit Grade | ${A}/true-fruit-grade\nTrueFruit Bin Scan | ${A}/true-fruit-bin-scan\nDrone Scan | ${A}/drone-scan\nPest & Disease | ${A}/pest-and-disease` },
        { title: "Company", links: `Pricing | ${A}/pricing\nSuccess stories | ${A}/success-stories\nAbout us | ${A}/about-us\nBlog | https://blog.aerobotics.com/\nCareers | ${A}/careers\nContact us | ${A}/contact-us` },
        { title: "Partners", links: `Drone partners | ${A}/drone-partners` },
      ],
      linkedin: "https://www.linkedin.com/company/aerobotics",
      instagram: "https://www.instagram.com/aerobotics_intl/",
      youtube: "https://www.youtube.com/channel/UC32aZCHJxtIKoSJpU5F2hRA",
      facebook: "https://www.facebook.com/aeroboticsintl",
      x: "https://x.com/aerobotics_intl",
      legalLabel: "Legal",
      legalUrl: "https://page.aerobotics.com/legal",
      copyright: "© 2026 Aerobotics, (Pty) LTD All rights reserved.",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => {
    const go = (u: string) => (ctx.editing ? undefined : safeUrl(u || "#"));
    const socials = (["linkedin", "instagram", "youtube", "facebook", "x"] as const).filter((k) => c[k].trim());
    return (
      <footer className="ab ab-full ab-bg-navy abft">
        <div className="ab-in">
          <div className="abft-top">
            <nav className="abft-cols" aria-label="Footer">
              {c.columns.map((col, i) => (
                <div key={i} className="abft-col">
                  <p className="abft-h">{col.title}</p>
                  <ul>
                    {linkLines(col.links).map((l, j) => (
                      <li key={j}>{l.url ? <a href={go(l.url)}>{l.label}</a> : <span>{l.label}</span>}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            {socials.length ? (
              <ul className="abft-social">
                {socials.map((k) => (
                  <li key={k}>
                    <a href={go(c[k])} aria-label={NAMES[k]} target="_blank" rel="noopener">
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <path d={ICONS[k]} fill="currentColor" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <p className="abft-legal">
            {c.legalLabel ? <a href={go(c.legalUrl)}>{c.legalLabel}</a> : null}
            <span>{c.copyright}</span>
          </p>
        </div>
        <img className="abft-mark" src="/art/tpl_aero_wordmark.webp" alt="" aria-hidden="true" loading="lazy" />
      </footer>
    );
  },
});
