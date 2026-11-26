import { z } from "zod";
import { safeUrl } from "../../../render/links";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Pic } from "../shared";
import { css } from "./AeroShowcase.styles";

export const AeroShowcaseContent = z.object({
  title: z.string(),
  text: z.string(),
  background: z.string(),
  /** A platform screenshot in a white frame. */
  screen: z.string(),
  screenAlt: z.string(),
  /** A video link: a play button on the screenshot opens it. */
  videoUrl: z.string(),
});
export type AeroShowcaseContent = z.infer<typeof AeroShowcaseContent>;

/** "View all your yield data in one place": a dark photo band with a framed platform screenshot. */
export const AeroShowcase = defineComponent<AeroShowcaseContent>({
  type: "AeroShowcase",
  label: "Platform showcase: screenshot on a photo",
  category: "aerobotics",
  schema: AeroShowcaseContent,
  defaults: {
    content: {
      title: "View all your yield data in one place",
      text: "Our platform combines AI measurements and user inputs for better business planning and sales decisions",
      background: art("showcase_bins"),
      screen: art("dash_yield"),
      screenAlt: "Yield estimates in the Aerobotics platform: volumes by cultivar and week",
      videoUrl: "",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => {
    const video = c.videoUrl.trim() ? safeUrl(c.videoUrl) : "";
    return (
      <div className="ab ab-full ab-on-dark abw">
        <Pic className="abw-bg" src={c.background} alt="" ctx={ctx} />
        <div className="abw-shade" aria-hidden="true" />
        <div className="ab-in abw-in ab-center">
          {c.title ? <h2 className="ab-h2">{c.title}</h2> : null}
          {c.text ? <p className="abw-text">{c.text}</p> : null}
          <div className="abw-frame">
            <Pic className="abw-screen" src={c.screen} alt={c.screenAlt} sizes="(min-width:1100px) 1000px, 100vw" ctx={ctx} />
            {video ? (
              <a className="abw-play" href={ctx.editing ? undefined : video} target="_blank" rel="noopener" aria-label="Play the video">
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
});
