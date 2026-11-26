import { z } from "zod";
import { defineComponent } from "../../types";
import { CUSTOMER_LOGOS } from "../AeroHero/AeroHero";
import { aeroboticsKit } from "../kit";
import { Band, BACKGROUNDS } from "../shared";
import { css } from "./AeroLogos.styles";

export const AeroLogosContent = z.object({
  title: z.string(),
  logos: z.array(z.object({ src: z.string(), alt: z.string() })),
  bg: z.enum(BACKGROUNDS),
});
export type AeroLogosContent = z.infer<typeof AeroLogosContent>;

/** A row of customer logos. The white artwork turns dark on light backgrounds. */
export const AeroLogos = defineComponent<AeroLogosContent>({
  type: "AeroLogos",
  label: "Logo strip: customer logos",
  category: "aerobotics",
  schema: AeroLogosContent,
  defaults: { content: { title: "Trusted by leading fruit companies", logos: CUSTOMER_LOGOS, bg: "white" } },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c }) => (
    <Band bg={c.bg} className="abl" center>
      {c.title ? <p className="abl-title">{c.title}</p> : null}
      <ul className="abl-row">
        {c.logos.map((l, i) => (
          <li key={i}>
            <img src={l.src} alt={l.alt} loading="lazy" />
          </li>
        ))}
      </ul>
    </Band>
  ),
});
