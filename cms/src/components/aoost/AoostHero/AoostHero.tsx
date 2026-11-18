import { Fragment } from "react";
import { z } from "zod";
import { ResponsiveFrameFit } from "../../../schema";
import { defineComponent } from "../../types";
import { Block } from "../Block";
import { shownSlots } from "../frames";
import { aoostKit } from "../kit";
import { css } from "./AoostHero.styles";

export const AoostHeroContent = z.object({
  /** The small label top left, over the artwork. */
  label: z.string(),
  /** Text before the time, e.g. "CPT". */
  clockLabel: z.string(),
  /** IANA time zone for the clock, and for late mode. */
  timeZone: z.string(),
  /** The artwork strip. Left empty, it reuses the projects' images (as the original does). */
  reel: z.array(z.object({ src: z.string(), alt: z.string().optional(), /** Framing of the artwork, per screen size. */ frame: ResponsiveFrameFit.optional() })),
  /** Seconds each artwork stays before the strip moves on. */
  reelSeconds: z.number().min(1).max(60),
  /** Show the ticker strip under the artwork. Off renders no strip at all. Older content has no value: shown. */
  showTicker: z.boolean().optional(),
  /** Ticker lines. "day" and "late" lines show by day or after midnight; "both" always. */
  ticker: z.array(z.object({ text: z.string(), mode: z.enum(["day", "late", "both"]) })),
  /** Add the rodeo's top score to the ticker. */
  tickerTopScore: z.boolean(),
  /** Add "you're visitor #…", "last here…" and who is here now (counts visits in Supabase, shows ghost cursors). */
  tickerVisitors: z.boolean(),
  /** After midnight in the clock's time zone the whole page goes dark. */
  lateMode: z.boolean(),
});
export type AoostHeroContent = z.infer<typeof AoostHeroContent>;

const PETAL = "M20 18.6C14.2 15.4 11.6 12 11.6 8.8A4.2 4.2 0 0 1 20 7.4A4.2 4.2 0 0 1 28.4 8.8C28.4 12 25.8 15.4 20 18.6Z";
/** The pink clover between ticker lines. */
const Clover = () => (
  <span className="tk-c">
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <g fill="currentColor">
        {[0, 90, 180, 270].map((r) => (
          <path key={r} d={PETAL} transform={`rotate(${r} 20 20)`} />
        ))}
      </g>
      <path d="M21.5 21.5c3.5 4 5.5 9 5 15.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  </span>
);

/** The ticker as it stands before the script adds live lines (top score, visitor number). */
export function tickerLines(content: AoostHeroContent): string[] {
  if (content.showTicker === false) return [];
  const own = content.ticker.filter((t) => t.text && (t.mode === "both" || t.mode === "day")).map((t) => t.text);
  return own.concat(content.tickerTopScore ? ["beat the game, be the first on the board"] : []);
}

export const AoostHero = defineComponent<AoostHeroContent>({
  type: "AoostHero",
  label: "Hero: artwork reel, clock and ticker",
  category: "aoost",
  kit: aoostKit,
  schema: AoostHeroContent,
  frames: (content) =>
    shownSlots(content.reel, (r) => !!r.src, (r, i, k) => ({ path: ["reel", i], label: `Artwork ${k}`, kind: "img", selector: `.hr-track>.hr-slide:nth-child(${k})>img`, src: r.src })),
  defaults: {
    content: {
      label: "aoost / portfolio",
      clockLabel: "CPT",
      timeZone: "Africa/Johannesburg",
      reel: [{ src: "/art/hero.jpg", alt: "" }],
      reelSeconds: 5.2,
      showTicker: true,
      ticker: [
        { text: "welcome", mode: "day" },
        { text: "pick a playlist", mode: "both" },
        { text: "you're up late", mode: "late" },
        { text: "the station's still on", mode: "late" },
      ],
      tickerTopScore: true,
      tickerVisitors: true,
      lateMode: true,
    },
  },
  // The ticker follows the reel directly inside this block, so it doesn't need the original's pull-up margin.
  css: css + `\n.ao .ao-b[data-ao="hero"] .ticker{margin-top:0}\n`,
  Render: ({ content }) => {
    const showTicker = content.showTicker !== false;
    const lines = tickerLines(content);
    // With no lines yet the strip stays empty; the script may still add live lines (visitor number).
    const repeat = lines.length ? Math.ceil(9 / lines.length) : 0;
    const half = Array.from({ length: repeat }, (_, r) =>
      lines.map((text, i) => (
        <Fragment key={`${r}-${i}`}>
          <span className="tk-w">{text}</span>
          <Clover />
        </Fragment>
      )),
    );
    return (
      <Block name="hero" mat="none" data={content}>
        <header className="hero-rect focus-sec" aria-label="Artwork">
          <div className="hr-track" id="reel">
            {content.reel
              .filter((r) => r.src)
              .map((r, i, all) => (
                <button key={i} type="button" className="hr-slide" aria-label={`Open artwork ${i + 1} of ${all.length}`}>
                  <img src={r.src} alt="" decoding="async" loading={i ? "lazy" : "eager"} />
                </button>
              ))}
          </div>
          <div className="hr-top">
            <span className="label">{content.label}</span>
            <span className="label clock" id="clock">
              {content.clockLabel} --:--
            </span>
          </div>
          <div className="hr-bar" aria-hidden="true">
            <i id="hrBar" />
          </div>
        </header>
        {showTicker ? (
          <div className="ticker" id="ticker" aria-label={lines.length ? `${lines.join(". ")}.` : undefined}>
            <div className="tk-track" aria-hidden="true">
              <div className="tk-half">{half}</div>
              <div className="tk-half">{half}</div>
            </div>
          </div>
        ) : null}
      </Block>
    );
  },
});
