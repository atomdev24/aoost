import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { Band, BACKGROUNDS } from "../shared";

export const AeroStatsContent = z.object({ items: z.array(z.object({ value: z.string(), label: z.string() })), bg: z.enum(BACKGROUNDS) });
export type AeroStatsContent = z.infer<typeof AeroStatsContent>;

/** Key numbers in a row with dividers ("2014 · Year founded"). */
export const AeroStats = defineComponent<AeroStatsContent>({
  type: "AeroStats",
  label: "Stats: key numbers in a row",
  category: "aerobotics",
  schema: AeroStatsContent,
  defaults: {
    content: {
      items: [
        { value: "2014", label: "Year founded" },
        { value: "50+ people", label: "The size of our team" },
        { value: "18+ countries", label: "Operating worldwide" },
        { value: "> 130 million fruit", label: "Analysed by our software" },
      ],
      bg: "soft",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: `
.abn.ab-sec{padding:40px 0}
.abn ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 0;margin:0;padding:0;list-style:none}
.abn li{display:flex;flex-direction:column;gap:6px;padding:0 20px;border-left:1px solid var(--ab-line)}
.abn li:nth-child(2n+1){border-left:0;padding-left:0}
.abn b{font-size:22px;line-height:1.2;font-weight:600}
.abn span{font-size:13px;color:var(--ab-muted)}
.abn.ab-bg-navy li{border-color:rgba(255,255,255,.2)}.abn.ab-bg-navy span{color:rgba(255,255,255,.7)}
@media (min-width:810px){.abn ul{grid-template-columns:repeat(auto-fit,minmax(0,1fr))}.abn li:nth-child(2n+1){border-left:1px solid var(--ab-line);padding-left:20px}.abn li:first-child{border-left:0;padding-left:0}}
`,
  Render: ({ content: c }) => (
    <Band bg={c.bg} className="abn">
      <ul>
        {c.items.map((it, i) => (
          <li key={i}>
            <b>{it.value}</b>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </Band>
  ),
});
