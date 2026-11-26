import type { CSSProperties } from "react";
import { z } from "zod";
import { defineComponent } from "../../types";
import { Reading } from "../AeroReadings/AeroReadings";
import { aeroboticsKit } from "../kit";
import { art, Btn, Pic, Tag } from "../shared";
import { css } from "./AeroProductCard.styles";

export const AeroProductCardContent = z.object({
  image: z.string(),
  alt: z.string(),
  eyebrow: z.string(),
  title: z.string(),
  primaryLabel: z.string(),
  primaryUrl: z.string(),
  secondaryLabel: z.string(),
  secondaryUrl: z.string(),
  /** The panel's colour (dark, picked to sit with the photo). */
  panel: z.string(),
  side: z.enum(["left", "right"]),
  /** Optional reading tags over the photo, opposite the panel. */
  readings: z.array(Reading),
});
export type AeroProductCardContent = z.infer<typeof AeroProductCardContent>;

/** A product on a large rounded photo, with a dark panel (name, one-liner, two buttons): "Explore our suite of tools". */
export const AeroProductCard = defineComponent<AeroProductCardContent>({
  type: "AeroProductCard",
  label: "Product card: photo with a dark panel",
  category: "aerobotics",
  schema: AeroProductCardContent,
  defaults: {
    content: {
      image: art("product_binscan"),
      alt: "Scanning a bin of lemons with a phone",
      eyebrow: "TrueFruit Bin Scan",
      title: "Post-harvest size and quality classification",
      primaryLabel: "Discover TrueFruit Bin Scan",
      primaryUrl: "https://aerobotics.com/true-fruit-bin-scan",
      secondaryLabel: "See pricing",
      secondaryUrl: "https://aerobotics.com/pricing",
      panel: "#2A241F",
      side: "left",
      readings: [],
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => (
    <div className="ab ab-full abpc-wrap">
      <div className="ab-in">
        <article className={`abpc abpc-${c.side}`}>
          <Pic className="abpc-bg" src={c.image} alt={c.alt} sizes="(min-width:1100px) 1100px, 100vw" ctx={ctx} />
          <div className="abpc-panel" style={{ background: c.panel || "#14210A" } as CSSProperties}>
            {c.eyebrow ? <p className="ab-eyebrow">{c.eyebrow}</p> : null}
            {c.title ? <h3 className="ab-h3">{c.title}</h3> : null}
            <div className="ab-btns">
              <Btn label={c.primaryLabel} url={c.primaryUrl} kind="blue" ctx={ctx} />
              <Btn label={c.secondaryLabel} url={c.secondaryUrl} kind="white" ctx={ctx} />
            </div>
          </div>
          {c.readings.length ? (
            <div className="abpc-tags">
              {c.readings.map((r, i) => (
                <Tag key={i} label={r.label} value={r.value} swatch={r.swatch || undefined} />
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  ),
});

/** The three TrueFruit cards of the home page. */
export const PRODUCT_CARDS: AeroProductCardContent[] = [
  { ...AeroProductCard.defaults.content, image: art("product_size"), alt: "Measuring oranges on the tree with a phone", eyebrow: "TrueFruit Size", title: "Precise fruit sizing & size forecasting", primaryLabel: "Discover TrueFruit Size", primaryUrl: "https://aerobotics.com/true-fruit-size", panel: "#142104" },
  { ...AeroProductCard.defaults.content, image: art("product_grade"), alt: "Grading oranges on the tree with a phone", eyebrow: "TrueFruit Grade", title: "Automated size, color & blemish measurements", primaryLabel: "Discover TrueFruit Grade", primaryUrl: "https://aerobotics.com/true-fruit-grade", panel: "#0E1A0A" },
  AeroProductCard.defaults.content,
];
