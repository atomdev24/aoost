import type { CSSProperties } from "react";
import { inline } from "../../../render/inline";
import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Btn, Pic, BUTTON_STYLES } from "../shared";
import { LogoTicker, tickerCss, TickerSettings } from "../ticker";
import { css } from "./AeroHero.styles";

/** A chosen overlay colour, faded the same way as the deep green: stronger behind the words. */
function shadeStyle(colour: string | undefined, shade: number, align: string): CSSProperties | undefined {
  if (!colour) return undefined;
  const c = colour.startsWith("token:") ? `var(--c-${colour.slice(6)})` : colour;
  const at = (pct: number) => `color-mix(in srgb, ${c} ${Math.max(0, Math.min(100, Math.round(pct)))}%, transparent)`;
  return { background: align === "center" ? at(shade) : `linear-gradient(90deg, ${at(shade + 20)} 0%, ${at(shade)} 55%, ${at(shade * 0.6)} 100%)` };
}

export const AeroHeroContent = z.object({
  image: z.string(),
  alt: z.string(),
  /** Darkens the photo so white text reads: 0 (none) to 80. */
  shade: z.number().min(0).max(80),
  /** The colour the photo is darkened (or tinted) with: a theme colour ("token:name") or a hex. Unset: the deep green. */
  shadeColour: z.string().regex(/^(token:[a-zA-Z][a-zA-Z0-9]*|#[0-9a-fA-F]{3,8})$/).optional(),
  align: z.enum(["left", "center"]),
  height: z.enum(["full", "medium"]),
  /** A product badge above the headline (e.g. the TrueFruit Size lockup). */
  badge: z.string(),
  eyebrow: z.string(),
  title: z.string(),
  text: z.string(),
  primaryLabel: z.string(),
  primaryUrl: z.string(),
  primaryStyle: z.enum(BUTTON_STYLES),
  secondaryLabel: z.string(),
  secondaryUrl: z.string(),
  secondaryStyle: z.enum(BUTTON_STYLES),
  /** Customer logos along the bottom (white artwork). */
  logos: z.array(z.object({ src: z.string(), alt: z.string() })),
}).merge(TickerSettings);
export type AeroHeroContent = z.infer<typeof AeroHeroContent>;

const logo = (n: string, alt: string) => ({ src: art(`logo_${n}`), alt });
export const CUSTOMER_LOGOS = [logo("ac_foods", "AC Foods"), logo("mouton_citrus", "Mouton Citrus"), logo("redland", "Redland"), logo("anecoop", "Anecoop"), logo("unifrutti", "Unifrutti"), logo("guadex", "Guadex"), logo("bagu", "Bagu"), logo("daltex", "Daltex")];

/** The photo hero of aerobotics.com: a full-bleed photo, headline, line of text, two buttons and customer logos. */
export const AeroHero = defineComponent<AeroHeroContent>({
  type: "AeroHero",
  label: "Hero: photo with headline and buttons",
  category: "aerobotics",
  schema: AeroHeroContent,
  defaults: {
    content: {
      image: art("hero_home"),
      alt: "A hand holding a phone that measures oranges on the tree",
      shade: 25,
      align: "left",
      height: "full",
      badge: "",
      eyebrow: "",
      title: "Yield forecasting in the palm of your hand",
      text: "Aerobotics helps fruit growers, packers and marketers forecast yields using accurate size, color and quality measurements from smartphone imagery.",
      primaryLabel: "Request a demo",
      primaryUrl: "https://aerobotics.com/request-a-demo",
      primaryStyle: "blue",
      secondaryLabel: "See how it works",
      secondaryUrl: "https://aerobotics.com/#how-it-works",
      secondaryStyle: "white",
      logos: CUSTOMER_LOGOS,
      logosMotion: "scroll",
      logosSpeed: 40,
      logosDirection: "left",
      logosGap: 56,
      logosFade: 25,
      logosPause: false,
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: css + tickerCss,
  Render: ({ content: c, ctx }) => (
    <div className={`ab ab-full ab-on-dark abh abh-${c.align} abh-${c.height}`} style={{ "--abh-shade": String((c.shade ?? 25) / 100) } as CSSProperties}>
      <Pic className="abh-bg" src={c.image} alt={c.alt} ctx={ctx} eager />
      <div className="abh-shade" aria-hidden="true" style={shadeStyle(c.shadeColour, c.shade ?? 25, c.align)} />
      <div className="ab-in abh-in">
        <div className="abh-copy">
          {c.badge ? <img className="abh-badge" src={c.badge} alt="" /> : null}
          {c.eyebrow ? <p className="ab-eyebrow">{c.eyebrow}</p> : null}
          {c.title ? <h1 className="ab-h1">{c.title}</h1> : null}
          {c.text ? <p className="abh-text">{inline(c.text)}</p> : null}
          <div className="ab-btns">
            <Btn label={c.primaryLabel} url={c.primaryUrl} kind={c.primaryStyle} ctx={ctx} />
            <Btn label={c.secondaryLabel} url={c.secondaryUrl} kind={c.secondaryStyle} ctx={ctx} />
          </div>
        </div>
        {c.logos.length && (c.logosMotion ?? "scroll") === "scroll" ? (
          <LogoTicker logos={c.logos} s={c} className="abh-ticker" />
        ) : c.logos.length ? (
          <ul className="abh-logos" aria-label="Customers">
            {c.logos.map((l, i) => (
              <li key={i}>
                <img src={l.src} alt={l.alt} loading="lazy" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  ),
});
