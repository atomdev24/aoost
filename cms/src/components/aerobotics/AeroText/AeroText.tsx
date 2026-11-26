import { z } from "zod";
import { inline } from "../../../render/inline";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { Band, Pic, BACKGROUNDS } from "../shared";

export const AeroTextContent = z.object({
  title: z.string(),
  /** Paragraphs split by a blank line; **bold**, *italic* and [links](url) work. */
  body: z.string(),
  /** An optional picture under the words (e.g. the customer map). */
  image: z.string(),
  alt: z.string(),
  align: z.enum(["left", "center"]),
  bg: z.enum(BACKGROUNDS),
});
export type AeroTextContent = z.infer<typeof AeroTextContent>;

/** A heading and paragraphs in the site's type ("Our Story"), with an optional picture below. */
export const AeroText = defineComponent<AeroTextContent>({
  type: "AeroText",
  label: "Text: heading and paragraphs",
  category: "aerobotics",
  schema: AeroTextContent,
  defaults: {
    content: {
      title: "Our Story",
      body: "James grew up on a farm outside of Cape Town, learning first-hand the challenges faced by his family and community of growers. Years later, at university, he met Benji and together they decided to see how they could use their combined skills in aeronautics and machine learning to find ways to solve the challenges faced by the agricultural sector.\n\nToday, we have measured and analyzed millions of pieces of fruit to help growers, packers and shippers of fruit improve their packouts and profitability.",
      image: "",
      alt: "",
      align: "left",
      bg: "soft",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abx.ab-sec{padding:48px 0}
.abx .ab-in{display:flex;flex-direction:column;gap:18px}
.abx-center .ab-in{align-items:center;text-align:center}
.abx-center .abx-p{max-width:720px}
.abx-p{font-size:16px;line-height:1.55;color:var(--ab-text)}
.abx-p a{color:var(--ab-blue)}
.abx.ab-bg-navy .abx-p{color:rgba(255,255,255,.82)}.abx.ab-bg-navy .abx-p a{color:#fff}
.abx-img{height:auto;margin-top:16px;border-radius:12px}
@media (min-width:810px){.abx.ab-sec{padding:64px 0}}
`,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className={`abx abx-${c.align}`}>
      {c.title ? <h2 className="ab-h2">{c.title}</h2> : null}
      {c.body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="abx-p">
            {inline(p)}
          </p>
        ))}
      {c.image ? <Pic className="abx-img" src={c.image} alt={c.alt} sizes="(min-width:1100px) 1100px, 100vw" ctx={ctx} /> : null}
    </Band>
  ),
});
