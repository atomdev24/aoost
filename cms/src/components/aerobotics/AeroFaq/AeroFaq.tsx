import { z } from "zod";
import { inline } from "../../../render/inline";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { Band, BACKGROUNDS } from "../shared";

export const AeroFaqContent = z.object({ title: z.string(), items: z.array(z.object({ question: z.string(), answer: z.string() })), bg: z.enum(BACKGROUNDS) });
export type AeroFaqContent = z.infer<typeof AeroFaqContent>;

/** Frequently asked questions: each opens to its answer (no script needed). */
export const AeroFaq = defineComponent<AeroFaqContent>({
  type: "AeroFaq",
  label: "FAQ: questions that open to answers",
  category: "aerobotics",
  schema: AeroFaqContent,
  defaults: {
    content: {
      title: "Frequently Asked Questions",
      items: [
        { question: "What is TrueFruit?", answer: "TrueFruit is our suite of AI tools that help growers, packers and sellers better estimate their yields. Please refer to our Product pages for more info." },
        { question: "What crops do you work with?", answer: "The crop types we support differ depending on the product. TrueFruit Size only: Avocados, Kiwifruit, Pomegranates, Stone fruit. TrueFruit Size & Grade: Citrus, Grapes, Apples, Blueberries, Cherries. TrueFruit Bin Scan: Apples, Blueberries, Citrus, Pomegranates, Stone Fruit." },
        { question: "What phone model do you need to use TrueFruit?", answer: "In order to guarantee the highest standards of accuracy, we train our models exclusively on images captured by the iPhone Pro series, specifically the iPhone 15 Pro or 16 Pro." },
        { question: "What countries do we operate in?", answer: "Our TrueFruit and Pest & Disease solutions can be used anywhere in the world. We offer serviced Drone Scans with our own pilots in Australia, New Zealand, Portugal, Spain, South Africa, and the USA." },
        { question: "What is your pricing structure?", answer: "We charge an annual subscription per acre with significant volume discounts on the per-acre rate." },
        { question: "Do you offer a free trial?", answer: "We don’t offer a free trial, but our starter package is an easy, low-cost way to test the TrueFruit product suite in the field." },
      ],
      bg: "soft",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abq .ab-in{max-width:760px}
.abq-title{margin-bottom:28px;text-align:center}
.abq details{border-bottom:1px solid var(--ab-line)}
.abq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0;font-size:17px;font-weight:600;cursor:pointer;list-style:none}
.abq summary::-webkit-details-marker{display:none}
.abq summary::after{content:"";flex:none;width:9px;height:9px;margin-top:-6px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .2s}
.abq details[open] summary::after{transform:rotate(225deg);margin-top:4px}
.abq details p{padding:0 0 22px;font-size:15px;line-height:1.55;color:var(--ab-text)}
.abq.ab-bg-navy details{border-color:rgba(255,255,255,.2)}.abq.ab-bg-navy details p{color:rgba(255,255,255,.8)}
`,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abq">
      {c.title ? <h2 className="ab-h2 abq-title">{c.title}</h2> : null}
      {c.items.map((it, i) => (
        <details key={i} open={ctx.editing && i === 0}>
          <summary>{it.question}</summary>
          <p>{inline(it.answer)}</p>
        </details>
      ))}
    </Band>
  ),
});
