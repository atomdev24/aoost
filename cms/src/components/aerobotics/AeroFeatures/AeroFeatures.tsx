import type { CSSProperties } from "react";
import { inline } from "../../../render/inline";
import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, BACKGROUNDS } from "../shared";
import { css } from "./AeroFeatures.styles";

export const AeroFeaturesContent = z.object({
  title: z.string(),
  text: z.string(),
  items: z.array(z.object({ icon: z.string(), title: z.string(), text: z.string() })),
  columns: z.number().int().min(2).max(4),
  /** "rule": a thin line over each item (Careers' values); "plain": icon, title and text. */
  look: z.enum(["plain", "rule"]),
  align: z.enum(["center", "left"]),
  bg: z.enum(BACKGROUNDS),
});
export type AeroFeaturesContent = z.infer<typeof AeroFeaturesContent>;

/** A title over three or four short points with icons: benefits, perks, values. */
export const AeroFeatures = defineComponent<AeroFeaturesContent>({
  type: "AeroFeatures",
  label: "Features: points with icons in columns",
  category: "aerobotics",
  schema: AeroFeaturesContent,
  defaults: {
    content: {
      title: "Get accurate size measurements with intelligent forecasts",
      text: "",
      items: [
        { icon: art("icon_chart"), title: "25x larger sample sizes", text: "Improve accuracy by measuring more fruit than traditional sampling methods, making sure that your size distribution is representative." },
        { icon: art("icon_timer"), title: "10x faster", text: "Save time in the field by taking pictures instead of measuring fruit with traditional callipers, improving your team's efficiency and covering more ground." },
        { icon: art("icon_ruler"), title: "Start from 10mm", text: "Measure from as soon as your fruit are 10mm in size for early season growth tracking, and get updated size forecasts after each collection." },
      ],
      columns: 3,
      look: "rule",
      align: "center",
      bg: "white",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c }) => (
    <Band bg={c.bg} className={`abf abf-${c.look} abf-${c.align}`}>
      {c.title || c.text ? (
        <div className="abf-head">
          {c.title ? <h2 className="ab-h2">{c.title}</h2> : null}
          {c.text ? <p className="ab-lede">{inline(c.text)}</p> : null}
        </div>
      ) : null}
      <ul className="abf-grid" style={{ "--abf-cols": String(c.columns) } as CSSProperties}>
        {c.items.map((it, i) => (
          <li key={i} className="abf-item">
            {it.icon ? <img className="abf-icon" src={it.icon} alt="" loading="lazy" /> : null}
            {it.title ? <h3 className="abf-title">{it.title}</h3> : null}
            {it.text ? <p className="ab-text abf-text">{inline(it.text)}</p> : null}
          </li>
        ))}
      </ul>
    </Band>
  ),
});
