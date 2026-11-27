import { z } from "zod";
import { inline } from "../../../render/inline";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, Btn, Pic, lines, BACKGROUNDS } from "../shared";

export const Plan = z.object({ image: z.string(), title: z.string(), text: z.string(), points: z.string(), buttonLabel: z.string(), buttonUrl: z.string() });
export const AeroPricingContent = z.object({ title: z.string(), plans: z.array(Plan), bg: z.enum(BACKGROUNDS) });
export type AeroPricingContent = z.infer<typeof AeroPricingContent>;

/** Pricing: a title over one or more plan cards (photo, navy body, ticked points, a button). */
export const AeroPricing = defineComponent<AeroPricingContent>({
  type: "AeroPricing",
  label: "Pricing: plan cards with ticked points",
  category: "aerobotics",
  schema: AeroPricingContent,
  defaults: {
    content: {
      title: "Get started with your new yield forecasting platform today",
      plans: [
        {
          image: art("pricing_laptop"),
          title: "Custom package",
          text: "A tailored solution to suit your crops and farming practices. Receive a quote that covers your full operation, making sure you get maximum value.",
          points: "Pick the crops you work with\nChoose the products you are interested in\nVolume-based pricing per acre\nGet dedicated support for your team",
          buttonLabel: "Request quote",
          buttonUrl: "https://aerobotics.com/request-a-demo",
        },
      ],
      bg: "soft",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abpr.ab-sec{padding-top:128px}
.abpr-title{max-width:640px;margin:0 auto 40px;text-align:center}
.abpr-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:24px}
.abpr-card{display:flex;flex-direction:column;width:100%;max-width:600px;overflow:hidden;border-radius:20px;background:var(--ab-navy);color:#fff}
.abpr-img{aspect-ratio:600/260;height:auto}
.abpr-body{display:flex;flex-direction:column;gap:14px;padding:28px 40px 36px}
.abpr-body h3{font-size:32px;font-weight:500}
.abpr-body>p{font-size:14px;line-height:1.5;color:rgba(255,255,255,.75)}
.abpr-points{display:flex;flex-direction:column;gap:12px;margin:8px 0 12px;padding:0;list-style:none;font-size:14px}
.abpr-points li{display:flex;align-items:center;gap:10px}
.abpr-points li::before{content:"✓";display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;height:18px;border-radius:50%;background:#fff;color:var(--ab-navy);font-size:11px;font-weight:800}
.abpr-body .ab-btn{align-self:flex-start}
@media (min-width:810px){.abpr.ab-sec{padding-top:176px}}
`,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abpr">
      {c.title ? <h1 className="ab-h2 abpr-title">{c.title}</h1> : null}
      <div className="abpr-grid">
        {c.plans.map((p, i) => (
          <article key={i} className="abpr-card">
            <Pic className="abpr-img" src={p.image} alt="" sizes="600px" ctx={ctx} />
            <div className="abpr-body">
              <h3>{p.title}</h3>
              {p.text ? <p>{inline(p.text)}</p> : null}
              <ul className="abpr-points">
                {lines(p.points).map((pt, j) => (
                  <li key={j}>{pt}</li>
                ))}
              </ul>
              <Btn label={p.buttonLabel} url={p.buttonUrl} kind="blue" ctx={ctx} />
            </div>
          </article>
        ))}
      </div>
    </Band>
  ),
});
