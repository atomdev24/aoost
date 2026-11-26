import type { CSSProperties } from "react";
import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Btn, Pic, BUTTON_STYLES } from "../shared";
import { css } from "./AeroHero.styles";

export const AeroHeroContent = z.object({
  image: z.string(),
  alt: z.string(),
  /** Darkens the photo so white text reads: 0 (none) to 80. */
  shade: z.number().min(0).max(80),
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
});
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
      logos: CUSTOMER_LOGOS.slice(0, 5),
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => (
    <div className={`ab ab-full ab-on-dark abh abh-${c.align} abh-${c.height}`} style={{ "--abh-shade": String((c.shade ?? 25) / 100) } as CSSProperties}>
      <Pic className="abh-bg" src={c.image} alt={c.alt} ctx={ctx} eager />
      <div className="abh-shade" aria-hidden="true" />
      <div className="ab-in abh-in">
        <div className="abh-copy">
          {c.badge ? <img className="abh-badge" src={c.badge} alt="" /> : null}
          {c.eyebrow ? <p className="ab-eyebrow">{c.eyebrow}</p> : null}
          {c.title ? <h1 className="ab-h1">{c.title}</h1> : null}
          {c.text ? <p className="abh-text">{c.text}</p> : null}
          <div className="ab-btns">
            <Btn label={c.primaryLabel} url={c.primaryUrl} kind={c.primaryStyle} ctx={ctx} />
            <Btn label={c.secondaryLabel} url={c.secondaryUrl} kind={c.secondaryStyle} ctx={ctx} />
          </div>
        </div>
        {c.logos.length ? (
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
