import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { Band, Btn, BACKGROUNDS, BUTTON_STYLES } from "../shared";
import { css } from "./AeroCta.styles";

export const AeroCtaContent = z.object({
  title: z.string(),
  primaryLabel: z.string(),
  primaryUrl: z.string(),
  primaryStyle: z.enum(BUTTON_STYLES),
  secondaryLabel: z.string(),
  secondaryUrl: z.string(),
  secondaryStyle: z.enum(BUTTON_STYLES),
  bg: z.enum(BACKGROUNDS),
});
export type AeroCtaContent = z.infer<typeof AeroCtaContent>;

/** The navy call-to-action band above the footer: one line and two buttons. */
export const AeroCta = defineComponent<AeroCtaContent>({
  type: "AeroCta",
  label: "Call to action: headline and two buttons",
  category: "aerobotics",
  schema: AeroCtaContent,
  defaults: {
    content: {
      title: "Increase your packouts by up to 5% by hitting your target size and quality.",
      primaryLabel: "Book a demo",
      primaryUrl: "https://aerobotics.com/request-a-demo",
      primaryStyle: "white",
      secondaryLabel: "See pricing",
      secondaryUrl: "https://aerobotics.com/pricing",
      secondaryStyle: "blue",
      bg: "navy",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abc">
      <div className="abc-row">
        <h2 className="abc-title">{c.title}</h2>
        <div className="ab-btns">
          <Btn label={c.primaryLabel} url={c.primaryUrl} kind={c.primaryStyle} ctx={ctx} />
          <Btn label={c.secondaryLabel} url={c.secondaryUrl} kind={c.secondaryStyle} ctx={ctx} />
        </div>
      </div>
    </Band>
  ),
});
