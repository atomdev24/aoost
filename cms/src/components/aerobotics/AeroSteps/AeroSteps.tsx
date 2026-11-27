import { z } from "zod";
import { inline } from "../../../render/inline";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, Btn, Pic, lines, BACKGROUNDS } from "../shared";

export const AeroStepsContent = z.object({
  title: z.string(),
  steps: z.string(),
  image: z.string(),
  cardTitle: z.string(),
  cardText: z.string(),
  cardPrompt: z.string(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
  bg: z.enum(BACKGROUNDS),
});
export type AeroStepsContent = z.infer<typeof AeroStepsContent>;

/** Numbered steps beside a card with a photo and a button ("Steps to become a drone partner"). */
export const AeroSteps = defineComponent<AeroStepsContent>({
  type: "AeroSteps",
  label: "Steps: numbered list beside a card",
  category: "aerobotics",
  schema: AeroStepsContent,
  defaults: {
    content: {
      title: "Steps to become a drone partner",
      steps: "Invest in your own hardware\nAcquire a remote pilot license in your region\nGet insurance for your business\nStudy our support resources for mapping flights\nPass a theory test online to start your application\nPerform a practical drone flight test\nSign our partners agreement",
      image: art("hero_orchard"),
      cardTitle: "Mapping Flights",
      cardText: "Visual and multispectral cameras attached to a drone capture high-resolution imagery of a farm, which we process using artificial intelligence to extract crop insights for customers.",
      cardPrompt: "Gone through the resources and ready to get started?",
      buttonLabel: "Take the mapping theory quiz",
      buttonUrl: "https://aerobotics.com/drone-partners",
      bg: "pale",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abse-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:40px;align-items:start}
.abse-left{display:flex;flex-direction:column;gap:28px}
.abse ol{display:flex;flex-direction:column;gap:0;margin:0;padding:12px 24px;border-radius:12px;background:var(--ab-chip);list-style:none;counter-reset:s}
.abse ol li{counter-increment:s;display:flex;gap:18px;padding:14px 0;font-size:15px}
.abse ol li::before{content:counter(s);color:var(--ab-blue);font-weight:700;min-width:14px}
.abse-card{display:flex;flex-direction:column;gap:14px;padding:20px 20px 28px;border-radius:12px;background:#fff}
.abse-card .ab-img{height:auto;aspect-ratio:16/9;border-radius:6px}
.abse-card h3{font-size:24px;font-weight:600}
.abse-card .ab-btn{align-self:flex-start}
@media (min-width:810px){.abse-grid{grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:96px}}
`,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abse">
      <div className="abse-grid">
        <div className="abse-left">
          {c.title ? <h2 className="ab-h2">{c.title}</h2> : null}
          <ol>
            {lines(c.steps).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="abse-card">
          <Pic src={c.image} alt="" sizes="480px" ctx={ctx} />
          {c.cardTitle ? <h3>{c.cardTitle}</h3> : null}
          {c.cardText ? <p className="ab-text">{inline(c.cardText)}</p> : null}
          {c.cardPrompt ? <p className="ab-text">
              <b>{c.cardPrompt}</b>
            </p> : null}
          <Btn label={c.buttonLabel} url={c.buttonUrl} kind="blue" ctx={ctx} />
        </div>
      </div>
    </Band>
  ),
});
