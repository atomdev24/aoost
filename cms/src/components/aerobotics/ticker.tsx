import type { CSSProperties } from "react";
import type { Fields } from "@puckeditor/core";
import { z } from "zod";

/**
 * A logo ticker like Framer's: the logos scroll along in a loop, fading out at both edges. Pure
 * CSS (two copies of the row slide by half their width), so it needs no script and stops for
 * visitors who prefer reduced motion. Shared by the hero and the logo strip.
 */
export const Logo = z.object({ src: z.string(), alt: z.string() });
export type Logo = z.infer<typeof Logo>;

export const TickerSettings = z.object({
  /** Scroll the logos along, or keep them still in a row. */
  logosMotion: z.enum(["scroll", "still"]).optional(),
  /** Pixels a second. */
  logosSpeed: z.number().min(5).max(300).optional(),
  logosDirection: z.enum(["left", "right"]).optional(),
  /** Space between logos, px. */
  logosGap: z.number().min(0).max(240).optional(),
  /** How far the edges fade, % of the width on each side. */
  logosFade: z.number().min(0).max(45).optional(),
  /** Stop while the pointer is over the logos. */
  logosPause: z.boolean().optional(),
});
export type TickerSettings = z.infer<typeof TickerSettings>;

/** As the Aerobotics hero in Framer: speed 40, left, gap 56, 25% fade, no hover change. */
export const TICKER_DEFAULTS: Required<TickerSettings> = { logosMotion: "scroll", logosSpeed: 40, logosDirection: "left", logosGap: 56, logosFade: 25, logosPause: false };

/** Widest a logo is drawn, px: used to work out how long one loop takes. */
const LOGO_W = 150;
/** At least this many logos in one copy of the row, so a short list still fills a wide screen. */
const MIN_PER_SET = 10;

export function LogoTicker({ logos, s, label = "Customers", className = "" }: { logos: Logo[]; s: TickerSettings; label?: string; className?: string }) {
  const o = { ...TICKER_DEFAULTS, ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) } as Required<TickerSettings>;
  const list = logos.filter((l) => l.src);
  if (!list.length) return null;
  const reps = Math.max(1, Math.ceil(MIN_PER_SET / list.length));
  const set = Array.from({ length: reps }, () => list).flat();
  const seconds = Math.max(4, Math.round(((set.length * (LOGO_W + o.logosGap)) / Math.max(5, o.logosSpeed)) * 10) / 10);
  const vars = { "--abt-gap": `${o.logosGap}px`, "--abt-dur": `${seconds}s`, "--abt-fade": `${o.logosFade}%` } as CSSProperties;
  const row = (copy: number) => (
    <ul className="abt-set" aria-hidden={copy > 0 ? "true" : undefined}>
      {set.map((l, i) => (
        <li key={i} aria-hidden={copy === 0 && i >= list.length ? "true" : undefined}>
          <img src={l.src} alt={copy === 0 && i < list.length ? l.alt : ""} loading="lazy" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`abt abt-${o.logosDirection}${o.logosPause ? " abt-pause" : ""} ${className}`} style={vars} role="group" aria-label={label}>
      <div className="abt-track">
        {row(0)}
        {row(1)}
      </div>
    </div>
  );
}

export const tickerCss = `
.abt{position:relative;width:100%;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 var(--abt-fade),#000 calc(100% - var(--abt-fade)),transparent);mask-image:linear-gradient(90deg,transparent,#000 var(--abt-fade),#000 calc(100% - var(--abt-fade)),transparent)}
.abt-track{display:flex;width:max-content;animation:abt-move var(--abt-dur,30s) linear infinite}
.abt-right .abt-track{animation-direction:reverse}
.abt-pause:hover .abt-track{animation-play-state:paused}
.abt-set{display:flex;flex:none;align-items:center;margin:0;padding:0;list-style:none}
.abt-set li{flex:none;padding-right:var(--abt-gap,56px)}
.abt img{display:block;height:36px;width:auto;max-width:${LOGO_W}px;object-fit:contain}
@keyframes abt-move{to{transform:translate3d(-50%,0,0)}}
@media (prefers-reduced-motion:reduce){.abt-track{animation:none}}
`;

/** The ticker's settings for a block's inspector, after its logos list. */
export const tickerFields: Fields<TickerSettings> = {
  logosMotion: { type: "radio", label: "Logos", options: [{ label: "Scroll along", value: "scroll" }, { label: "Still row", value: "still" }] },
  logosSpeed: { type: "number", label: "Logos: speed (pixels a second)", min: 5, max: 300 },
  logosDirection: { type: "radio", label: "Logos: direction", options: [{ label: "Left", value: "left" }, { label: "Right", value: "right" }] },
  logosGap: { type: "number", label: "Logos: gap (px)", min: 0, max: 240 },
  logosFade: { type: "number", label: "Logos: fade at the edges (%)", min: 0, max: 45 },
  logosPause: { type: "radio", label: "Logos: stop on hover", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
};
