import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, Btn, BACKGROUNDS } from "../shared";

export const AeroEventsContent = z.object({
  title: z.string(),
  events: z.array(z.object({ logo: z.string(), name: z.string(), when: z.string(), buttonLabel: z.string(), buttonUrl: z.string() })),
  bg: z.enum(BACKGROUNDS),
});
export type AeroEventsContent = z.infer<typeof AeroEventsContent>;

const meet = "https://aerobotics.com/contact-us";
/** "Catch us at our next event": trade show cards with logo, dates and a meeting button. */
export const AeroEvents = defineComponent<AeroEventsContent>({
  type: "AeroEvents",
  label: "Events: upcoming trade shows",
  category: "aerobotics",
  schema: AeroEventsContent,
  defaults: {
    content: {
      title: "Catch us at our next event",
      events: [
        { logo: art("event_interpoma"), name: "Interpoma", when: "25 — 27 Nov 2026", buttonLabel: "Book a meeting", buttonUrl: meet },
        { logo: art("event_fruit_attraction"), name: "Fruit Attraction", when: "Oct 2027, Madrid", buttonLabel: "Book a meeting", buttonUrl: meet },
        { logo: art("event_fruit_logistica"), name: "Fruit Logistica", when: "3-5 Feb 2027, Berlin", buttonLabel: "Book a meeting", buttonUrl: meet },
      ],
      bg: "pale",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abev-title{margin-bottom:36px;text-align:center}
.abev ul{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;margin:0 auto;padding:0;max-width:960px;list-style:none}
@media (min-width:700px){.abev ul{grid-template-columns:repeat(3,minmax(0,1fr))}}
.abev li{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.abev-logo{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:228/120;margin-bottom:10px;padding:16px 24px;border-radius:8px;background:#fff}
.abev-logo img{max-width:100%;max-height:100%;object-fit:contain}
.abev-name{font-size:17px;font-weight:600}.abev-when{font-size:13px;color:var(--ab-muted)}
.abev .ab-btn{margin-top:8px}
`,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className="abev">
      {c.title ? <h2 className="ab-h2 abev-title">{c.title}</h2> : null}
      <ul>
        {c.events.map((e, i) => (
          <li key={i}>
            <span className="abev-logo">{e.logo ? <img src={e.logo} alt={e.name} loading="lazy" /> : null}</span>
            <span className="abev-name">{e.name}</span>
            <span className="abev-when">{e.when}</span>
            <Btn label={e.buttonLabel} url={e.buttonUrl} kind="blue" ctx={ctx} />
          </li>
        ))}
      </ul>
    </Band>
  ),
});
