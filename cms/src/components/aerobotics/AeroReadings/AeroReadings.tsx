import type { CSSProperties } from "react";
import { z } from "zod";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { Tag } from "../shared";

export const Reading = z.object({ label: z.string(), value: z.string(), swatch: z.string() });
export const AeroReadingsContent = z.object({
  readings: z.array(Reading),
  /** Stacked or in a row. */
  layout: z.enum(["stack", "row"]),
  /** Pop the tags in one after another when they scroll into view. On unless switched off. */
  animate: z.boolean().optional(),
});
export type AeroReadingsContent = z.infer<typeof AeroReadingsContent>;

export const SAMPLE_READINGS = [
  { label: "Avg size", value: "70mm", swatch: "" },
  { label: "Peak size", value: "Count 88", swatch: "" },
  { label: "Color distribution", value: "95% above color break", swatch: "#F0A030" },
  { label: "Blemished fruit", value: "90% unblemished", swatch: "" },
];

/**
 * The app's reading tags (glass labels such as "Current size 65mm"), on their own so they can be
 * placed over any photo in a free layout.
 */
export const AeroReadings = defineComponent<AeroReadingsContent>({
  type: "AeroReadings",
  label: "Reading tags: app labels for a photo",
  category: "aerobotics",
  schema: AeroReadingsContent,
  defaults: { content: { readings: SAMPLE_READINGS, layout: "stack" } },
  kit: aeroboticsKit,
  css: `.abr{display:flex;gap:10px;align-items:flex-start}.abr-stack{flex-direction:column}.abr-row{flex-wrap:wrap}
@media (prefers-reduced-motion:no-preference){
html.js .abr-anim:not(.in)>.ab-tag{opacity:0}
.abr-anim.in>.ab-tag{animation:abr-pop .5s cubic-bezier(.3,1.4,.5,1) calc(var(--i,0) * .18s) both}
}
@keyframes abr-pop{from{opacity:0;transform:translateY(8px) scale(.92)}}`,
  Render: ({ content: c, ctx }) => {
    const anim = c.animate !== false;
    return (
      <div className={`ab abr abr-${c.layout}${anim ? ` abr-anim${ctx.editing ? " in" : ""}` : ""}`} data-animate={anim && !ctx.editing ? "" : undefined} data-motion={anim && ctx.editing ? "keep" : undefined}>
        {c.readings.map((r, i) => (
          <Tag key={i} label={r.label} value={r.value} swatch={r.swatch || undefined} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    );
  },
});
