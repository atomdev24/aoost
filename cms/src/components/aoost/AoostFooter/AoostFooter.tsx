import { z } from "zod";
import { defineComponent } from "../../types";
import { Block, LineArt } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostFooter.styles";

export const AoostFooterContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  /** An optional quiet line before the sign-off. */
  line: z.string().optional(),
  text: z.string(),
  /** The scorpion that walks along the footer rule. */
  showScorpion: z.boolean(),
  /** Links to your profiles, taken from the site's socials (Site settings). The original has none. */
  showSocials: z.boolean(),
});
export type AoostFooterContent = z.infer<typeof AoostFooterContent>;

export const AoostFooter = defineComponent<AoostFooterContent>({
  type: "AoostFooter",
  label: "Footer: sign-off line",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostFooterContent,
  defaults: { content: { mat: "dark", text: "aoost · 2026", showScorpion: true, showSocials: false } },
  css: css + `\n.ao footer .ao-socials{display:flex;gap:var(--s4);margin-right:auto}\n.ao footer .ao-socials a{text-decoration:none}\n.ao footer .ao-socials a:hover{color:var(--ink)}\n.ao footer .ao-foot-line{margin-right:auto;padding-right:var(--s4);opacity:.6;text-transform:none;letter-spacing:0}\n.ao footer .ao-socials+.ao-foot-line{margin-right:0}\n`,
  Render: ({ content, ctx }) => (
    <Block name="footer" mat={content.mat}>
      <footer>
        {content.showScorpion ? <LineArt kind="scorpion" className="scorp" /> : null}
        {content.showSocials && ctx.site.settings.socials.length ? (
          <span className="ao-socials">
            {ctx.site.settings.socials.map((s) => (
              <a key={s.network} className="label" href={ctx.editing ? undefined : s.url} target="_blank" rel="noopener">
                {s.label ?? s.network}
              </a>
            ))}
          </span>
        ) : null}
        {content.line ? <span className="label ao-foot-line">{content.line}</span> : null}
        <span className="label">{content.text}</span>
      </footer>
    </Block>
  ),
});
