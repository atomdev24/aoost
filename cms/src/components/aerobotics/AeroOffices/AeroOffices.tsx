import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { lines } from "../shared";

export const AeroOfficesContent = z.object({ kicker: z.string(), title: z.string(), offices: z.array(z.object({ name: z.string(), address: z.string() })) });
export type AeroOfficesContent = z.infer<typeof AeroOfficesContent>;

/** "Ask a question, we're here to help": the offices and their addresses, to sit beside a form. */
export const AeroOffices = defineComponent<AeroOfficesContent>({
  type: "AeroOffices",
  label: "Offices: contact addresses",
  category: "aerobotics",
  schema: AeroOfficesContent,
  defaults: {
    content: {
      kicker: "Contact us",
      title: "Ask a question, we're here to help.",
      offices: [
        { name: "Cape Town Head Office", address: "16 Napier Street, De Waterkant\nCape Town, South Africa\nTel: +27 21 035 1060" },
        { name: "Global Head Office", address: "7621 North Del Mar Avenue,\nFresno, California" },
      ],
    },
    style: { maxWidth: "380px" },
  },
  kit: aeroboticsKit,
  css: `
.abo{display:flex;flex-direction:column;gap:14px}
.abo-kicker{font-size:14px;color:var(--ab-blue)}
.abo h2{font-size:26px;line-height:1.2;font-weight:600;margin-bottom:12px}
.abo-office{font-size:14px;line-height:1.5}
.abo-office b{display:block;font-weight:600}
.abo-office span{display:block;color:var(--ab-text)}
`,
  Render: ({ content: c }) => (
    <div className="ab abo">
      {c.kicker ? <p className="abo-kicker">{c.kicker}</p> : null}
      {c.title ? <h2>{c.title}</h2> : null}
      {c.offices.map((o, i) => (
        <p key={i} className="abo-office">
          <b>{o.name}</b>
          {lines(o.address).map((l, j) => (
            <span key={j}>{l}</span>
          ))}
        </p>
      ))}
    </div>
  ),
});
