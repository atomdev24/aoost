import { z } from "zod";
import { defineComponent } from "../../types";
import { Block, Head } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostRodeo.styles";

export const AoostRodeoContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  /** Optional: empty renders no heading at all. */
  heading: z.string().optional(),
  /** An optional line under the heading. The original has none. */
  copy: z.string(),
  /** The shared top-ten board under the game (Supabase). Off hides it and stops offering a place on it. */
  showLeaderboard: z.boolean(),
  leaderboardTitle: z.string(),
});
export type AoostRodeoContent = z.infer<typeof AoostRodeoContent>;

export const AoostRodeo = defineComponent<AoostRodeoContent>({
  type: "AoostRodeo",
  label: "Rodeo: the lasso game and leaderboard",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostRodeoContent,
  defaults: { content: { mat: "dark", heading: "rodeo", copy: "", showLeaderboard: true, leaderboardTitle: "Leaderboard" } },
  css:
    css +
    `\n.ao .rodeo-copy{margin:0;max-width:52ch;color:var(--ink-2)}\n.ao .rodeo .ao-off-note{position:absolute;left:50%;top:14px;transform:translateX(-50%);margin:0;padding:6px 10px;border:1px dashed #C9CCC5;background:#FBFBF8;color:#56595C;font:400 11px/1.4 "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}\n`,
  Render: ({ content, ctx }) => (
    <Block name="rodeo" mat={content.mat} data={{ showLeaderboard: content.showLeaderboard }}>
      <section className="focus-sec" {...(content.heading ? { "aria-labelledby": "h-rodeo" } : { "aria-label": "Rodeo" })}>
        {content.heading ? <Head id="h-rodeo" title={content.heading} index={5} /> : null}
        {content.copy ? <p className="rodeo-copy">{content.copy}</p> : null}
        <div className="tumble" aria-hidden="true">
          <svg className="doodle" viewBox="0 0 40 40">
            <path id="tumblePath" />
          </svg>
        </div>
        <div className="rodeo">
          <canvas id="rodeo" tabIndex={0} aria-label="Rodeo, a mini game. Tap, or press space, to jump your horse over the cacti, scorpions and tumbleweeds." />
          {ctx.editing ? <p className="ao-off-note">The game plays on the site and in Preview</p> : null}
        </div>
        <div className="board-wrap" hidden={!content.showLeaderboard}>
          <form className="lb-form" id="lbForm" hidden>
            <label htmlFor="lbName" className="label">
              New best: <b id="lbScore">0</b>. Your name?
            </label>
            <div className="lb-row">
              <input id="lbName" maxLength={12} autoComplete="nickname" enterKeyHint="done" placeholder="NAME" required />
              <button className="btn" type="submit">
                Save
              </button>
            </div>
          </form>
          <div className="lb">
            <div className="lb-head">
              <span className="label">{content.leaderboardTitle}</span>
              <span className="label lb-scope" id="lbScope">
                this device
              </span>
            </div>
            <ol className="lb-list" id="lbList" />
          </div>
        </div>
      </section>
    </Block>
  ),
});
