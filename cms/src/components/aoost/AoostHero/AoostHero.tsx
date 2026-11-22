import { imageSources } from "../../../render/media";
import { Fragment, useEffect, useRef, type CSSProperties } from "react";
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
  reel: z.array(
    z.object({
      src: z.string(),
      alt: z.string().optional(),
      /** Framing of the artwork, per screen size. */
      frame: ResponsiveFrameFit.optional(),
      /** "Artwork colour" overlay: this piece's colour (hex). Empty: taken from the artwork. */
      tone: z.string().optional(),
    }),
  ),
  /**
   * Text over the artwork. "difference": a big wordmark that inverts against whatever is behind it;
   * "tone": a headline whose accent takes each artwork's colour; "handwritten": a line that writes
   * itself across each piece; "cutout": a paper strip with the wordmark cut out of it. Older content: off.
   */
  overlay: z.enum(["off", "difference", "tone", "handwritten", "cutout"]).optional(),
  /** The wordmark (difference, cut-out) or the headline (artwork colour: the part after the first comma takes the colour). */
  overlayText: z.string().optional(),
  /** Handwritten: one line per artwork, in turn. */
  overlayLines: z.array(z.object({ text: z.string() })).optional(),
  /**
   * Matte screen: the artwork seen through a matte display. Shade (darker edges, multiply), glare
   * (a soft patch of light, screen) and grain (fine speckle, screen), each 0 to 1. Older content: off.
   */
  screen: z
    .object({
      show: z.boolean(),
      shade: z.number().min(0).max(1).optional(),
      glare: z.number().min(0).max(1).optional(),
      grain: z.number().min(0).max(1).optional(),
    })
    .optional(),
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
  /** Dot board: how each line appears. "breathe" (older content) or "resolve" (a ghost of the shape, then a wave settles it). */
  dotEffect: z.enum(["breathe", "resolve"]).optional(),
  /** Dot board: "flat" (older content) or "glass" (black, lit from the middle of each stroke, with a halo and bloom). */
  dotLook: z.enum(["flat", "glass", "glassblock", "liquid"]).optional(),
  /** Glass block / Liquid glass: how crisp the words stay (0 all bent, 1 crisp), square size (px), how much each square bends, the shimmer, and the liquid's wobble. */
  dotGlass: z
    .object({
      clarity: z.number().min(0).max(1).optional(),
      cell: z.number().min(6).max(60).optional(),
      refract: z.number().min(0).max(0.9).optional(),
      shimmer: z.number().min(0).max(2).optional(),
      wobble: z.number().min(0).max(6).optional(),
    })
    .optional(),
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
  /** Simulated visitors: now and then a cursor drifts through the page like someone browsing. Older content: off. */
  phantoms: z.boolean().optional(),
  /** How often simulated visitors turn up. */
  phantomRate: z.enum(["rare", "sometimes", "often"]).optional(),
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
type DotOpts = { seconds: number; grid: boolean; after: string; idleSpeed: number; textSize: number; effect: string; look: string; lensOpts: Record<string, number> };
const dotOpts = (c: AoostHeroContent): DotOpts => ({ seconds: c.dotSeconds ?? 4, grid: c.dotGrid !== false, after: c.dotAfter ?? "loop", idleSpeed: c.dotIdleSpeed ?? 0.5, textSize: c.dotTextSize ?? 70, effect: c.dotEffect ?? "breathe", look: c.dotLook ?? "flat", lensOpts: lensOf(c) });
/** The glass settings in effect (the studies' choice where unset). */
const lensOf = (c: AoostHeroContent) => ({ clarity: 0.65, cell: 18, refract: 0.3, shimmer: 0.7, wobble: 1.5, ...(c.dotGlass ?? {}) });

function EditingDots({ lines, opts }: { lines: string[]; opts: DotOpts }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = lines.join("|");
  useEffect(() => {
    if (!ref.current) return;
    // Loaded when a board is on screen, so the editor's first download stays small.
    let board: { stop(): void } | null = null, gone = false;
    void import("../runtime/dots.js").then(({ startDotBoard }) => {
      if (!gone && ref.current) board = startDotBoard(ref.current, { lines, ...opts });
    });
    return () => { gone = true; board?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.seconds, opts.grid, opts.after, opts.idleSpeed, opts.textSize, opts.effect, opts.look, JSON.stringify(opts.lensOpts)]);
  return <canvas className="dm" ref={ref} aria-hidden="true" />;
}

export const SCREEN = { shade: 0.85, glare: 0.6, grain: 0.5 };
/** The matte screen's three layers, over the artwork and its text, under the corner labels. */
function MatteScreen({ screen }: { screen: AoostHeroContent["screen"] }) {
  if (!screen?.show) return null;
  const style = { "--sc-shade": screen.shade ?? SCREEN.shade, "--sc-glare": screen.glare ?? SCREEN.glare, "--sc-grain": screen.grain ?? SCREEN.grain } as CSSProperties;
  return (
    <div className="hr-screen" style={style} aria-hidden="true">
      <i className="sc-shade" />
      <i className="sc-glare" />
      <i className="sc-grain" />
    </div>
  );
}
const screenCss = [
  `.ao .hr-screen{position:absolute;inset:0;pointer-events:none}`,
  `.ao .hr-screen i{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat}`,
  `.ao .hr-screen .sc-shade{background-image:url(/art/hero-screen-shade.webp);mix-blend-mode:multiply;opacity:var(--sc-shade)}`,
  `.ao .hr-screen .sc-glare{background-image:url(/art/hero-screen-glare.webp);mix-blend-mode:screen;opacity:var(--sc-glare)}`,
  `.ao .hr-screen .sc-grain{background-image:url(/art/hero-screen-grain.webp);background-size:256px 256px;background-repeat:repeat;background-position:0 0;mix-blend-mode:screen;opacity:var(--sc-grain)}`,
].join("\n") + "\n";

/** Text over the artwork: the four looks (see HeroOverlay). */
const overlayCss = [
  `.ao .hr-over{position:absolute;inset:0;pointer-events:none}`,
  // Difference: white text that inverts whatever is behind it; the corner labels follow suit.
  `.ao .hr-over[data-over="difference"]{mix-blend-mode:difference}`,
  `.ao .hero-rect[data-over="difference"] .hr-top{background:none;mix-blend-mode:difference}`,
  `.ao .ov-word{position:absolute;left:clamp(14px,3vw,40px);bottom:-.16em;color:#fff;font:700 clamp(96px,23vw,360px)/1 var(--display);letter-spacing:-.045em;white-space:nowrap}`,
  // Artwork colour: a soft shade from the left (from below on phones), a headline whose accent takes the artwork's colour.
  `.ao .hr-over[data-over="tone"]{display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:14px;padding:0 clamp(18px,4vw,56px) clamp(34px,7svh,72px);background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.35) 38%,rgba(0,0,0,0) 64%)}`,
  `@media (max-width:640px){.ao .hr-over[data-over="tone"]{background:linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,.3) 50%,rgba(0,0,0,0) 72%)}}`,
  `.ao .ov-kick{font:500 12px/1.3 var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--tone,#F3EFE6);transition:color .9s ease}`,
  `.ao .ov-head{margin:0;max-width:min(660px,92%);font:700 clamp(38px,6.4vw,92px)/.95 var(--display);letter-spacing:-.035em;color:#F3EFE6}`,
  `.ao .ov-head em{font-style:normal;color:var(--tone,#F3EFE6);transition:color .9s ease}`,
  `.ao .ov-rule{display:block;width:72px;height:4px;border-radius:2px;background:var(--tone,#F3EFE6);transition:background-color .9s ease}`,
  // Handwritten: the line traces itself, then fills in, then the underline draws.
  `.ao .ov-hw{position:absolute;left:clamp(10px,4vw,60px);bottom:clamp(18px,7svh,90px);width:min(88%,980px);height:auto;overflow:visible;transform:rotate(-4deg);transform-origin:0 100%}`,
  `.ao .ov-hw text{font-family:'Caveat',cursive;font-weight:700;fill:transparent;stroke:#F3EFE6;stroke-width:1.6;stroke-dasharray:2200;stroke-dashoffset:2200;opacity:0}`,
  `.ao .ov-hw path{fill:none;stroke:#F3EFE6;stroke-width:5;stroke-linecap:round;stroke-dasharray:1200;stroke-dashoffset:1200;opacity:0}`,
  `.ao .ov-hw.on text{opacity:1;animation:ov-draw 2.4s cubic-bezier(.6,.1,.3,1) forwards,ov-ink .7s 1.9s ease forwards}`,
  `.ao .ov-hw.on path{opacity:.9;animation:ov-draw 1s 2.2s ease-out forwards}`,
  `@media (max-width:640px){.ao .ov-hw{left:8px;width:calc(100% - 16px);transform:rotate(-3deg)}.ao .ov-word{font-size:30vw}}`,
  `@keyframes ov-draw{to{stroke-dashoffset:0}}`,
  `@keyframes ov-ink{to{fill:#F3EFE6;stroke-width:0}}`,
  `@media (prefers-reduced-motion:reduce){.ao .ov-hw.on text{animation:none;fill:#F3EFE6;stroke-width:0;stroke-dashoffset:0}.ao .ov-hw.on path{animation:none;stroke-dashoffset:0}}`,
  // Cut-out: a paper strip along the bottom with the wordmark cut out, showing the artwork through it.
  `.ao .hero-rect[data-over="cutout"]{container-type:size}`,
  `.ao .ov-band{position:absolute;left:0;right:0;bottom:0;height:28%;background:var(--c-bone,#F3EFE6)}`,
  `.ao .ov-cut{position:absolute;inset:0;display:flex;align-items:flex-end;padding:0 clamp(12px,3vw,36px) 2cqh;clip-path:inset(72% 0 0 0);background-image:var(--art);background-size:cover;background-position:center;-webkit-background-clip:text;background-clip:text;color:transparent;font:700 min(34cqh,38cqw)/.78 var(--display);letter-spacing:-.05em;white-space:nowrap}`,
  `.ao .hero-rect[data-over="cutout"] .hr-bar{display:none}`,
].join("\n") + "\n";

export const OVERLAY_TEXT = { tone: "Things I make, when I get to them.", word: "aoost" };
export const OVERLAY_LINES = ["hey, welcome", "take a look around", "things I make, when I get to them"];
const HW_FONT = "https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap";

/** One handwritten line: sized to fit the box (Caveat is about 0.42em a letter), with an underline as long as the words. */
function HandLine({ text, on }: { text: string; on: boolean }) {
  const size = Math.round(Math.min(170, 960 / Math.max(1, text.length * 0.42)));
  const w = Math.round(Math.min(970, 20 + text.length * size * 0.42));
  return (
    <svg className={`ov-hw${on ? " on" : ""}`} viewBox="0 0 1000 260" aria-hidden="true">
      <text x="10" y="170" fontSize={size}>
        {text}
      </text>
      <path d={`M14 ${196 + size * 0.08} C ${Math.round(w * 0.3)} ${186 + size * 0.06}, ${Math.round(w * 0.66)} ${214 + size * 0.06}, ${w} ${180 + size * 0.04}`} />
    </svg>
  );
}

/** The text over the artwork (hero.js keeps it in step with the reel on the site). */
function HeroOverlay({ content }: { content: AoostHeroContent }) {
  const mode = content.overlay ?? "off";
  if (mode === "off") return null;
  const first = content.reel.find((r) => r.src);
  if (mode === "difference")
    return (
      <div className="hr-over" data-over="difference" aria-hidden="true">
        <span className="ov-word">{content.overlayText || OVERLAY_TEXT.word}</span>
      </div>
    );
  if (mode === "cutout")
    return (
      <div className="hr-over" data-over="cutout" aria-hidden="true">
        <i className="ov-band" />
        <span className="ov-cut" style={first ? ({ "--art": `url("${first.src}")` } as CSSProperties) : undefined}>
          {content.overlayText || OVERLAY_TEXT.word}
        </span>
      </div>
    );
  if (mode === "tone") {
    const text = content.overlayText || OVERLAY_TEXT.tone;
    const cut = text.indexOf(",");
    return (
      <div className="hr-over" data-over="tone" style={first?.tone ? ({ "--tone": first.tone } as CSSProperties) : undefined}>
        <span className="ov-kick" aria-hidden="true">
          01{first?.alt ? ` · ${first.alt}` : ""}
        </span>
        <p className="ov-head">
          {cut > 0 ? (
            <>
              {text.slice(0, cut + 1)} <em>{text.slice(cut + 1).trim()}</em>
            </>
          ) : (
            text
          )}
        </p>
        <i className="ov-rule" aria-hidden="true" />
      </div>
    );
  }
  const lines = (content.overlayLines ?? []).map((l) => l.text).filter(Boolean);
  const shown = lines.length ? lines : OVERLAY_LINES;
  return (
    <div className="hr-over" data-over="handwritten">
      <link rel="stylesheet" href={HW_FONT} />
      {shown.map((t, i) => (
        <HandLine key={i} text={t} on={i === 0} />
      ))}
      <span className="sr">{shown.join(". ")}</span>
    </div>
  );
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
    `.ao .ticker.dots.glass,html.late .ao .ticker.dots.glass{background:#000}\n` +
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
    `.ao .hero-rect.drifting .hr-track{transform:translate3d(0,var(--drift,0px),0) scale(var(--drift-scale,1));transform-origin:var(--drift-origin,50% 50%);will-change:transform}\n` +
    overlayCss +
    screenCss,
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
          data-over={content.overlay && content.overlay !== "off" ? content.overlay : undefined}
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
                  <img {...imageSources(r.src)} sizes="100vw" alt="" decoding="async" loading={i ? "lazy" : "eager"} />
                </button>
              ))}
          </div>
          <HeroOverlay content={content} />
          <MatteScreen screen={content.screen} />
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
            className={`ticker dots${content.dotLook && content.dotLook !== "flat" ? " glass" : ""}`}
            id="ticker"
            role="img"
            aria-label={lines.length ? `${lines.join(". ")}.` : "Dot board"}
            data-seconds={content.dotSeconds ?? 4}
            data-grid={content.dotGrid === false ? "off" : "on"}
            data-after={content.dotAfter ?? "loop"}
            data-idle-speed={content.dotIdleSpeed ?? 0.5}
            data-text-size={content.dotTextSize ?? 70}
            data-effect={content.dotEffect ?? "breathe"}
            data-look={content.dotLook ?? "flat"}
            data-lens={content.dotLook === "glassblock" || content.dotLook === "liquid" ? JSON.stringify(lensOf(content)) : undefined}
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
