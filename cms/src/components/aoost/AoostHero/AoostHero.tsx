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
      /** Shown by the text over the artwork. */
      title: z.string().optional(),
      /** Shown by the text over the artwork, as written ("2026", "Nov 2026"). */
      date: z.string().optional(),
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
  overlay: z.enum(["off", "difference", "tone", "handwritten", "cutout", "minimal"]).optional(),
  /** Shown when an artwork has no title of its own. */
  overlayText: z.string().optional(),
  /** Handwritten: lines for artworks with no title, in turn. */
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
      /** Carry the screen over the ticker strip too, in the hero's own dark tone, so both read as one display. Older content: on. */
      ticker: z.boolean().optional(),
      /** The screen's dark: the ticker (and the hero behind the artwork) take it, to match the artwork's own black. Older content: black. */
      tone: z.string().optional(),
    })
    .optional(),
  /**
   * Opening: the hero starts as a blank screen, a dot lights and becomes the clover in dots, the
   * clover squashes into a bright line that runs to the edges and opens onto the artwork (a CRT
   * switching on). "always": every page load; "session": once per visit. Older content: off.
   */
  intro: z.enum(["off", "always", "session"]).optional(),
  /** Darken the artwork (0 = as it is, 0.8 = very dark), under the text and the glass. Older content: 0.15. */
  artDim: z.number().min(0).max(0.8).optional(),
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
  dotAfter: z.enum(["loop", "wave", "twinkle", "sky"]).optional(),
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
type DotOpts = { seconds: number; grid: boolean; after: string; idleSpeed: number; textSize: number; effect: string; look: string; lensOpts: Record<string, number>; base?: string };
const dotOpts = (c: AoostHeroContent): DotOpts => ({ seconds: c.dotSeconds ?? 4, grid: c.dotGrid !== false, after: c.dotAfter ?? "loop", idleSpeed: c.dotIdleSpeed ?? 0.5, textSize: c.dotTextSize ?? 70, effect: c.dotEffect ?? "breathe", look: c.dotLook ?? "flat", lensOpts: lensOf(c), base: joinedScreen(c) ? screenTone(c) : undefined });
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
  }, [key, opts.seconds, opts.grid, opts.after, opts.idleSpeed, opts.textSize, opts.effect, opts.look, opts.base, JSON.stringify(opts.lensOpts)]);
  return <canvas className="dm" ref={ref} aria-hidden="true" />;
}

export const SCREEN = { shade: 0.7, glare: 1, grain: 0.6 };
/**
 * The matte screen's three layers: the "glass". They hang on header.hero-rect itself (after the
 * track and the text over the artwork, before the corner labels and the progress line), so the
 * reel's pan, drift and parallax move the artwork underneath and never the glass.
 */
/** The hero's own dark tone (.hero-rect's background): the ticker takes it when it joins the screen. */
export const HERO_DARK = "#000000";
/** How much the artwork is darkened unless set. */
export const ART_DIM = 0.15;
/** The screen's dark tone: the hero's own setting, else black (the artwork's black). */
export const screenTone = (c: AoostHeroContent) => (/^#[0-9a-f]{6}$/i.test(c.screen?.tone ?? "") ? c.screen!.tone! : HERO_DARK);
/** The opening animation plays (on the site and in preview; never in the editor's canvas). */
export const introMode = (c: AoostHeroContent) => (c.intro === "always" || c.intro === "session" ? c.intro : null);
/** The matte screen carries on over the ticker strip (on with the screen, unless switched off). */
export const joinedScreen = (c: AoostHeroContent) => !!c.screen?.show && c.screen.ticker !== false && c.showTicker !== false;

function MatteScreen({ screen, part }: { screen: AoostHeroContent["screen"]; part?: "ticker" }) {
  if (!screen?.show) return null;
  const style = { "--sc-shade": screen.shade ?? SCREEN.shade, "--sc-glare": screen.glare ?? SCREEN.glare, "--sc-grain": screen.grain ?? SCREEN.grain } as CSSProperties;
  return (
    <div className={part ? "hr-screen tk-screen" : "hr-screen"} style={style} aria-hidden="true">
      <i className="sc-shade" />
      <i className="sc-glare" />
      <i className="sc-grain" />
    </div>
  );
}
const screenCss = [
  `.ao .hr-screen{position:absolute;inset:0;pointer-events:none}`,
  // shade and glare are drawn for the hero's shape (2400×1000) and stretched to it; the grain tile repeats at 1:1 so it stays sharp
  `.ao .hr-screen i{position:absolute;inset:0;background-position:0 0;background-size:100% 100%;background-repeat:no-repeat}`,
  `.ao .hr-screen .sc-shade{background-image:url(/art/aoost_hero_screen_shade_2400x1000.webp);mix-blend-mode:multiply;opacity:var(--sc-shade)}`,
  `.ao .hr-screen .sc-glare{background-image:url(/art/aoost_hero_screen_glare_2400x1000.webp);mix-blend-mode:screen;opacity:var(--sc-glare)}`,
  // Phones get the 960 px copies of the screen's shade and glare: the glare is what the phone sees first (LCP).
  `@media (max-width:767px){.ao .hr-screen .sc-shade{background-image:url(/art/aoost_hero_screen_shade_2400x1000.960.webp)}.ao .hr-screen .sc-glare{background-image:url(/art/aoost_hero_screen_glare_2400x1000.960.webp)}}`,
  `.ao .hr-screen .sc-grain{background-image:url(/art/aoost_hero_screen_grain_tile_512.webp);background-size:256px 256px;background-repeat:repeat;mix-blend-mode:screen;opacity:var(--sc-grain)}`,
  // carried over the ticker: one screen; its shade and glare span hero + strip (hero.js sets the heights)
  `.ao .sc-joined.hero-rect .hr-screen i:not(.sc-grain){background-size:100% calc(100% + var(--tk-h,124px))}`,
  `.ao .ticker.sc-joined:is(*,.dots.glass),.ao .hero-rect.sc-joined{background:var(--sc-tone,#000)}.ao .ticker.sc-joined{border-top-color:transparent}`,
  // the opening: a blank screen in the screen's tone over the artwork, its canvas drawn by runtime/intro.js;
  // if the script never takes over, it clears itself after 9 s; reduced motion never sees it
  // behind the hero (focus effect on scroll): black, with a blurred dim copy of the piece showing (hero.js); the artwork dimmed a touch
  `.ao .ao-b[data-ao="hero"]{position:relative;isolation:isolate}.ao .hr-ambient{position:absolute;z-index:-1;left:calc(50% - 50vw);width:100vw;top:calc(-1*var(--s5) - 40px);height:calc(var(--hero-h,clamp(320px,72svh,760px)) + 80px);background:#000;overflow:hidden;pointer-events:none}.ao .hr-ambient::after{content:"";position:absolute;inset:-10%;background:var(--amb,none) center/cover no-repeat;filter:blur(36px) brightness(.4);transition:opacity .8s}`,
  `.ao .hr-dim{position:absolute;inset:0;background:#000;opacity:var(--dim,.15);pointer-events:none}`,
  `.ao .hr-intro{position:absolute;inset:0;background:var(--sc-tone,#000);pointer-events:none;animation:hr-safe .4s 9s forwards}.ao .hr-intro.is-playing{animation:none;background:none}.ao .hr-intro canvas{position:absolute;inset:0;width:100%;height:100%}`,
  `.ao .hr-top,.ao .hr-bar{transition:opacity .7s}.ao .is-intro :is(.hr-top,.hr-bar){opacity:0;animation:hr-show 0s 9s forwards}@keyframes hr-safe{to{opacity:0;visibility:hidden}}@keyframes hr-show{to{opacity:1}}`,
  `@media (prefers-reduced-motion:reduce){.ao .hr-intro{display:none}.ao .is-intro :is(.hr-top,.hr-bar){opacity:1}}`,
  // no z-index on .tk-screen: it would isolate it and its layers would blend with nothing
  `.ao .tk-screen i:not(.sc-grain){background-size:100% calc(100% + var(--hero-h,72svh));background-position:0 100%}`,
  `@media (prefers-reduced-transparency:reduce){.ao .hr-screen{display:none}}`,
].join("\n") + "\n";

/** Text over the artwork: the four looks (see HeroOverlay). */
const overlayCss = [
  `.ao .hr-over{position:absolute;inset:0;pointer-events:none}`,
  // Difference: white text that inverts whatever is behind it; the corner labels follow suit.
  `.ao .hr-over[data-over="difference"]{mix-blend-mode:difference}`,
  `.ao .hero-rect[data-over="difference"] .hr-top{background:none;mix-blend-mode:difference}`,
  `.ao .ov-word{position:absolute;left:clamp(14px,3vw,40px);bottom:-.16em;color:#fff;font:700 min(clamp(96px,23vw,360px),calc(170vw / var(--ch,5)))/1 var(--display);letter-spacing:-.045em;white-space:nowrap}`,
  `.ao .ov-meta{position:absolute;left:clamp(16px,3vw,42px);top:clamp(52px,8svh,76px);color:#fff;font:500 12px/1.3 var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase}`,
  // Artwork colour: a soft shade from the left (from below on phones), a headline whose accent takes the artwork's colour.
  `.ao .hr-over[data-over="tone"]{display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:14px;padding:0 clamp(18px,4vw,56px) clamp(34px,7svh,72px);background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.35) 38%,rgba(0,0,0,0) 64%)}`,
  `@media (max-width:640px){.ao .hr-over[data-over="tone"]{background:linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,.3) 50%,rgba(0,0,0,0) 72%)}}`,
  `.ao .ov-kick{font:500 12px/1.3 var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--tone,#F3EFE6);transition:color .9s ease}`,
  `.ao .ov-head{margin:0;max-width:min(760px,92%);font:700 clamp(38px,6.4vw,92px)/.95 var(--display);letter-spacing:-.035em;color:var(--tone,#F3EFE6);transition:color .9s ease}`,
  `.ao .ov-rule{display:block;width:72px;height:4px;border-radius:2px;background:var(--tone,#F3EFE6);transition:background-color .9s ease}`,
  // Handwritten: the line traces itself, then fills in, then the underline draws.
  `.ao .ov-hw{position:absolute;left:clamp(10px,4vw,60px);bottom:clamp(18px,7svh,90px);width:min(88%,980px);height:auto;overflow:visible;transform:rotate(-4deg);transform-origin:0 100%}`,
  `.ao .ov-hw text{font-family:'Caveat',cursive;font-weight:700;fill:transparent;stroke:#F3EFE6;stroke-width:1.6;stroke-dasharray:2200;stroke-dashoffset:2200;opacity:0}`,
  `.ao .ov-hw path{fill:none;stroke:#F3EFE6;stroke-width:5;stroke-linecap:round;stroke-dasharray:1200;stroke-dashoffset:1200;opacity:0}`,
  `.ao .ov-hw.on text{opacity:1;animation:ov-draw 2.4s cubic-bezier(.6,.1,.3,1) forwards,ov-ink .7s 1.9s ease forwards}`,
  `.ao .ov-hw.on path{opacity:.9;animation:ov-draw 1s 2.2s ease-out forwards}`,
  `@media (max-width:640px){.ao .ov-hw{left:8px;width:calc(100% - 16px);transform:rotate(-3deg)}.ao .ov-word{font-size:min(30vw,calc(190vw / var(--ch,5)))}}`,
  `@keyframes ov-draw{to{stroke-dashoffset:0}}`,
  `@keyframes ov-ink{to{fill:#F3EFE6;stroke-width:0}}`,
  `@media (prefers-reduced-motion:reduce){.ao .ov-hw.on text{animation:none;fill:#F3EFE6;stroke-width:0;stroke-dashoffset:0}.ao .ov-hw.on path{animation:none;stroke-dashoffset:0}}`,
  // Cut-out: a paper strip along the bottom with the wordmark cut out, showing the artwork through it.
  `.ao .hero-rect[data-over="cutout"]{container-type:size}`,
  `.ao .ov-band{position:absolute;left:0;right:0;bottom:0;height:28%;background:var(--c-bone,#F3EFE6)}`,
  `.ao .ov-cut{position:absolute;inset:0;display:flex;align-items:flex-end;padding:0 clamp(12px,3vw,36px) 0;clip-path:inset(72% 0 0 0);background-image:var(--art);background-size:cover;background-position:center;-webkit-background-clip:text;background-clip:text;color:transparent;font:700 min(26cqh,38cqw,calc(170cqw / var(--ch,5)))/1 var(--display);letter-spacing:-.05em;white-space:nowrap}`,
  `.ao .ov-band-meta{position:absolute;right:clamp(14px,3vw,40px);bottom:calc(28% - 34px);color:#141414;font:500 12px/1.3 var(--mono,ui-monospace,monospace);letter-spacing:.12em;text-transform:uppercase;text-align:right}`,
  `.ao .hero-rect[data-over="cutout"] .hr-bar{display:none}`,
  // Minimal: a small title and date, on the left, halfway down, in paper white with a soft shadow.
  `.ao .hr-over[data-over="minimal"]{display:flex;align-items:center;padding-left:clamp(16px,4vw,56px);color:#F3EFE6;text-shadow:0 1px 2px rgba(0,0,0,.45),0 0 18px rgba(0,0,0,.35)}`,
  `.ao .ov-min{display:flex;flex-direction:column;gap:6px;max-width:min(360px,70%)}`,
  `.ao .ov-min .ov-idx,.ao .ov-min .ov-d{font:500 12px/1.4 var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;opacity:.8}`,
  `.ao .ov-min .ov-t{font:500 clamp(15px,1.35vw,19px)/1.3 var(--display);letter-spacing:-.005em}`,
  `.ao .hr-over [data-ov]:empty{display:none}`,
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

const pad2 = (n: number) => String(n).padStart(2, "0");
/** "03 · Nov 2026" */
const kick = (i: number, date: string) => pad2(i + 1) + (date ? ` · ${date}` : "");

/**
 * What each artwork says over itself: its own title and date (set on the artwork in the reel),
 * else the fallback text. hero.js reads the list (data-texts) and swaps the words as the reel moves.
 */
export function overlayTexts(content: AoostHeroContent): { t: string; d: string }[] {
  const mode = content.overlay ?? "off";
  const lines = (content.overlayLines ?? []).map((l) => l.text).filter(Boolean);
  const fallback = (k: number) =>
    mode === "handwritten" ? (lines.length ? lines : OVERLAY_LINES)[k % (lines.length || OVERLAY_LINES.length)]! : content.overlayText || (mode === "tone" ? OVERLAY_TEXT.tone : mode === "minimal" ? "" : OVERLAY_TEXT.word);
  const reel = content.reel.filter((r) => r.src);
  return (reel.length ? reel : [{ src: "" }]).map((r: { title?: string; date?: string }, k) => ({ t: r.title?.trim() || fallback(k), d: r.date?.trim() || "" }));
}

/** The text over the artwork (hero.js keeps it in step with the reel on the site). */
function HeroOverlay({ content }: { content: AoostHeroContent }) {
  const mode = content.overlay ?? "off";
  if (mode === "off") return null;
  const first = content.reel.find((r) => r.src);
  const texts = overlayTexts(content);
  const n = content.reel.filter((r) => r.src).length;
  const { t, d } = texts[0]!;
  const ch = { "--ch": Math.max(3, t.length) } as CSSProperties;
  const common = { className: "hr-over", "data-over": mode, "data-texts": JSON.stringify(texts) };
  if (mode === "difference")
    return (
      <div {...common} aria-hidden="true">
        <span className="ov-meta" data-ov="kick">
          {d ? kick(0, d) : ""}
        </span>
        <span className="ov-word" data-ov="title" style={ch}>
          {t}
        </span>
      </div>
    );
  if (mode === "cutout")
    return (
      <div {...common} aria-hidden="true">
        <i className="ov-band" />
        <span className="ov-cut" data-ov="title" style={{ ...ch, ...(first ? { "--art": `url("${first.src}")` } : {}) } as CSSProperties}>
          {t}
        </span>
        <span className="ov-band-meta">
          <span data-ov="date">{d}</span>
          {d ? <br /> : null}
          <span data-ov="count">{`${pad2(1)} / ${pad2(Math.max(1, n))}`}</span>
        </span>
      </div>
    );
  if (mode === "tone")
    return (
      <div {...common} style={first?.tone ? ({ "--tone": first.tone } as CSSProperties) : undefined}>
        <span className="ov-kick" data-ov="kick" aria-hidden="true">
          {kick(0, d)}
        </span>
        <p className="ov-head" data-ov="title">
          {t}
        </p>
        <i className="ov-rule" aria-hidden="true" />
      </div>
    );
  if (mode === "minimal")
    return (
      <div {...common}>
        <div className="ov-min">
          <span className="ov-idx" data-ov="count" aria-hidden="true">{`${pad2(1)} / ${pad2(Math.max(1, n))}`}</span>
          <span className="ov-t" data-ov="title">
            {t}
          </span>
          <span className="ov-d" data-ov="date">
            {d}
          </span>
        </div>
      </div>
    );
  return (
    <div {...common}>
      <link rel="stylesheet" href={HW_FONT} />
      {texts.map((x, i) => (
        <HandLine key={i} text={x.t} on={i === 0} />
      ))}
      <span className="sr">{texts.map((x) => x.t).join(". ")}</span>
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
    const joined = joinedScreen(content);
    const tone = screenTone(content);
    const intro = ctx.editing ? null : introMode(content);
    const toneVar = joined || intro ? ({ "--sc-tone": tone } as CSSProperties) : undefined;
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
        <div className="hr-ambient" aria-hidden="true" />
        <header
          data-over={content.overlay && content.overlay !== "off" ? content.overlay : undefined}
          className={`hero-rect focus-sec${joined ? " sc-joined" : ""}${intro ? " is-intro" : ""}${content.reelBar === false ? " no-bar" : ""}${content.reelViewer === false ? " no-viewer" : ""}${pan ? " pan" : ""}`}
          style={pan || toneVar ? { ...pan, ...toneVar } : undefined}
          data-intro={intro ?? undefined}
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
          <div className="hr-dim" aria-hidden="true" style={{ "--dim": content.artDim ?? ART_DIM } as CSSProperties} />
          <HeroOverlay content={content} />
          {intro ? <div className="hr-intro" aria-hidden="true" /> : null}
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
            className={`ticker dots${content.dotLook && content.dotLook !== "flat" ? " glass" : ""}${joined ? " sc-joined" : ""}`}
            data-base={joined ? tone : undefined}
            style={toneVar}
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
            {joined ? <MatteScreen screen={content.screen} part="ticker" /> : null}
          </div>
        ) : showTicker ? (
          <div className={`ticker${joined ? " sc-joined" : ""}`} style={toneVar} id="ticker" aria-label={lines.length ? `${lines.join(". ")}.` : undefined}>
            <div className="tk-track" aria-hidden="true">
              <div className="tk-half">{half}</div>
              <div className="tk-half">{half}</div>
            </div>
            {joined ? <MatteScreen screen={content.screen} part="ticker" /> : null}
          </div>
        ) : null}
      </Block>
    );
  },
});
