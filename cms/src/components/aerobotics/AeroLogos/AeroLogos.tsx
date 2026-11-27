import { z } from "zod";
import { defineComponent } from "../../types";
import { CUSTOMER_LOGOS } from "../AeroHero/AeroHero";
import { aeroboticsKit } from "../kit";
import { Band, BACKGROUNDS } from "../shared";
import { LogoTicker, tickerCss, TickerSettings } from "../ticker";
import { css } from "./AeroLogos.styles";

export const AeroLogosContent = z.object({
  title: z.string(),
  logos: z.array(z.object({ src: z.string(), alt: z.string() })),
  bg: z.enum(BACKGROUNDS),
}).merge(TickerSettings);
export type AeroLogosContent = z.infer<typeof AeroLogosContent>;

/**
 * A row of customer logos, still or scrolling along (the ticker). The white artwork turns dark on
 * light backgrounds. Strips saved before the ticker existed stay still.
 */
export const AeroLogos = defineComponent<AeroLogosContent>({
  type: "AeroLogos",
  label: "Logo strip: customer logos",
  category: "aerobotics",
  schema: AeroLogosContent,
  defaults: { content: { title: "Trusted by leading fruit companies", logos: CUSTOMER_LOGOS, bg: "white", logosMotion: "scroll", logosSpeed: 40, logosDirection: "left", logosGap: 56, logosFade: 25, logosPause: false } },
  fullBleed: true,
  kit: aeroboticsKit,
  css: css + tickerCss,
  Render: ({ content: c }) => (
    <Band bg={c.bg} className="abl" center>
      {c.title ? <p className="abl-title">{c.title}</p> : null}
      {c.logosMotion === "scroll" ? (
        <LogoTicker logos={c.logos} s={c} label={c.title || "Customers"} />
      ) : (
      <ul className="abl-row">
        {c.logos.map((l, i) => (
          <li key={i}>
            <img src={l.src} alt={l.alt} loading="lazy" />
          </li>
        ))}
      </ul>
      )}
    </Band>
  ),
});
