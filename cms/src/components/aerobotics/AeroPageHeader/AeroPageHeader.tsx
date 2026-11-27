import { z } from "zod";
import { inline } from "../../../render/inline";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { Band, Btn, BACKGROUNDS } from "../shared";
import { css } from "./AeroPageHeader.styles";

export const AeroPageHeaderContent = z.object({
  kicker: z.string(),
  title: z.string(),
  text: z.string(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
  bg: z.enum(BACKGROUNDS),
});
export type AeroPageHeaderContent = z.infer<typeof AeroPageHeaderContent>;

/** The plain page top used on Pricing, About, Careers and Request a demo: a centred title and a short line. */
export const AeroPageHeader = defineComponent<AeroPageHeaderContent>({
  type: "AeroPageHeader",
  label: "Page header: centred title and intro",
  category: "aerobotics",
  schema: AeroPageHeaderContent,
  defaults: {
    content: {
      kicker: "",
      title: "Request a demo",
      text: "Fill out the form below and we'll take you through a demo of our AI tools helping you improve your yield forecasting.",
      buttonLabel: "",
      buttonUrl: "",
      bg: "pale",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abp" center>
      {c.kicker ? <p className="ab-kicker">{c.kicker}</p> : null}
      {c.title ? <h1 className="ab-h1">{c.title}</h1> : null}
      {c.text ? <p className="ab-lede abp-text">{inline(c.text)}</p> : null}
      {c.buttonLabel ? (
        <div className="ab-btns">
          <Btn label={c.buttonLabel} url={c.buttonUrl} kind="blue" ctx={ctx} />
        </div>
      ) : null}
    </Band>
  ),
});
