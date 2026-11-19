import { z } from "zod";
import { defineComponent } from "../../types";
import { Block } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostAbout.styles";

export const AoostAboutContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  /** A small mono label at the top ("aoost / about"). */
  label: z.string().optional(),
  /** The one line, large and light. */
  line: z.string().optional(),
  /** Small mono line under it ("Alex · Cape Town"). */
  byline: z.string().optional(),
  /** A hairline under the text. */
  rule: z.boolean().optional(),
  /** Links to your profiles, from the site's socials (Site settings). */
  showSocials: z.boolean().optional(),
});
export type AoostAboutContent = z.infer<typeof AoostAboutContent>;

/** A quiet About intro on the cutting mat: label, one line, byline, hairline, and/or the social links. */
export const AoostAbout = defineComponent<AoostAboutContent>({
  type: "AoostAbout",
  label: "About: one line and links",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostAboutContent,
  defaults: { content: { mat: "light", label: "aoost / about", line: "Things I make, when I get to them.", byline: "Alex · Cape Town", rule: true, showSocials: false } },
  css,
  Render: ({ content, ctx }) => {
    const socials = content.showSocials ? ctx.site.settings.socials : [];
    return (
      <Block name="about" mat={content.mat}>
        <div className="ab">
          {content.label ? <p className="label ab-k">{content.label}</p> : null}
          {content.line ? <p className="ab-line">{content.line}</p> : null}
          {content.byline ? <p className="ab-by">{content.byline}</p> : null}
          {content.rule ? <hr className="ab-rule" /> : null}
          {socials.length ? (
            <p className="ab-links">
              {socials.map((s) => (
                <a key={s.network} href={ctx.editing ? undefined : s.url} target="_blank" rel="noopener">
                  {s.label ?? s.network}
                </a>
              ))}
            </p>
          ) : null}
        </div>
      </Block>
    );
  },
});
