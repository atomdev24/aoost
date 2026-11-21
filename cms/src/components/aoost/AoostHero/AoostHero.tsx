import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { startDotBoard } from "../runtime/dots.js";
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
  /** The thin progress line along the bottom of the artwork. Older content: shown. */
  reelBar: z.boolean().optional(),
  /** Clicking an artwork opens it full screen in the viewer. Older content: on. */
  reelViewer: z.boolean().optional(),
  /** Artwork pan: the image glides slowly across inside its frame, on its own, from load. Older content: off. */
  artPan: z.enum(["off", "rtl", "ltr"]).optional(),
  /** Seconds for one pass across (it then glides back). */
  artPanSeconds: z.number().min(3).max(60).optional(),
  /** How far it travels, as % of the frame's width (the artwork is enlarged to match). */
  artPanDistance: z.number().min(2).max(20).optional(),
  /** Show the ticker strip under the artwork. Off renders no strip at all. Older content has no value: shown. */
  showTicker: z.boolean().optional(),
  /** How the strip shows its lines: scrolling (the ticker) or a dot board (lines breathe in, hold, fade). Older content: scrolling. */
  tickerStyle: z.enum(["scroll", "dots"]).optional(),
  /** Dot board: seconds each line (or part of a long line) stays up. */
  dotSeconds: z.number().min(2.4).max(30).optional(),
  /** Dot board: the faint dot grid behind the lit dots. Older content: on. */
  dotGrid: z.boolean().optional(),
  /** Dot board: once every line has shown, repeat them ("loop") or play an idle animation instead. Older content: loop. */
  dotAfter: z.enum(["loop", "wave", "twinkle"]).optional(),
  /** Dot board: idle animation speed (1 = brisk, 0.5 = slow). */
  dotIdleSpeed: z.number().min(0.1).max(3).optional(),
  /** Dot board: letter height, as % of the strip's height. */
  dotTextSize: z.number().min(30).max(95).optional(),
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

/** The dot board in the editor's frames: the same animation as the site, with the lines as saved. */
type DotOpts = { seconds: number; grid: boolean; after: string; idleSpeed: number; textSize: number };
const dotOpts = (c: AoostHeroContent): DotOpts => ({ seconds: c.dotSeconds ?? 4, grid: c.dotGrid !== false, after: c.dotAfter ?? "loop", idleSpeed: c.dotIdleSpeed ?? 0.5, textSize: c.dotTextSize ?? 70 });

function EditingDots({ lines, opts }: { lines: string[]; opts: DotOpts }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = lines.join("|");
  useEffect(() => {
    if (!ref.current) return;
    const board = startDotBoard(ref.current, { lines, ...opts });
    return () => board.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.seconds, opts.grid, opts.after, opts.idleSpeed, opts.textSize]);
  return <canvas className="dm" ref={ref} aria-hidden="true" />;
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
  css:
    css +
    `\n.ao .ao-b[data-ao="hero"] .ticker{margin-top:0}\n` +
    // The dot board: the strip's dark band, a canvas the height of the ticker's line.
    `.ao .ticker.dots{height:clamp(78px,8.6vw,124px)}\n.ao .ticker.dots .dm{display:block;width:100%;height:100%}\n` +
    // Progress line hidden; artwork that doesn't open the viewer.
    `.ao .hero-rect.no-bar .hr-bar{display:none}\n.ao .hero-rect.no-viewer .hr-slide{cursor:default}\n` +
    // Artwork pan: each image is enlarged (scale) and glides side to side (translate); both add to its own framing transform.
    `.ao .hero-rect.pan .hr-slide{overflow:hidden}\n` +
    `.ao .hero-rect.pan .hr-slide img,.ao .hero-rect.pan .hr-slide canvas{scale:var(--pan-s);animation:ao-pan var(--pan-t) ease-in-out infinite alternate;will-change:translate}\n` +
    `@keyframes ao-pan{from{translate:var(--pan-a) 0}to{translate:var(--pan-b) 0}}\n` +
    `@media (prefers-reduced-motion:reduce){.ao .hero-rect.pan .hr-slide img,.ao .hero-rect.pan .hr-slide canvas{animation:none;translate:0 0}}\n` +
    // Parallax: the artwork drifts inside its frame (effects.ts sets --drift), enlarged so no edge shows.
    // (on the track, since each image's own transform is its framing).
    `.ao .hero-rect.drifting .hr-track{transform:translate3d(0,var(--drift,0px),0) scale(var(--drift-scale,1));transform-origin:var(--drift-origin,50% 50%);will-change:transform}\n`,
  Render: ({ content, ctx }) => {
    const showTicker = content.showTicker !== false;
    // Artwork pan: travel d% of the width each way from centre's other side; enlarged just enough to never show an edge.
    const pan = content.artPan === "rtl" || content.artPan === "ltr"
      ? (() => {
          const d = (content.artPanDistance ?? 8) / 2;
          const [a, b] = content.artPan === "rtl" ? [d, -d] : [-d, d];
          return { "--pan-a": `${a}%`, "--pan-b": `${b}%`, "--pan-s": String(Math.round((1 + (2 * d) / 100 + 0.01) * 1000) / 1000), "--pan-t": `${content.artPanSeconds ?? 14}s` } as CSSProperties;
        })()
      : undefined;
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
        <header
          className={`hero-rect focus-sec${content.reelBar === false ? " no-bar" : ""}${content.reelViewer === false ? " no-viewer" : ""}${pan ? " pan" : ""}`}
          style={pan}
          data-motion={pan ? "keep" : undefined}
          aria-label="Artwork"
          data-parallax-inner=""
        >
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
        {showTicker && content.tickerStyle === "dots" ? (
          <div
            className="ticker dots"
            id="ticker"
            role="img"
            aria-label={lines.length ? `${lines.join(". ")}.` : "Dot board"}
            data-seconds={content.dotSeconds ?? 4}
            data-grid={content.dotGrid === false ? "off" : "on"}
            data-after={content.dotAfter ?? "loop"}
            data-idle-speed={content.dotIdleSpeed ?? 0.5}
            data-text-size={content.dotTextSize ?? 70}
          >
            {ctx.editing ? <EditingDots lines={lines} opts={dotOpts(content)} /> : <canvas className="dm" aria-hidden="true" />}
          </div>
        ) : showTicker ? (
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
