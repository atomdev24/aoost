import type { CSSProperties } from "react";
import { z } from "zod";
import { annotationCss, MARK_STYLES, ReadingChips } from "../Image/annotations";
import { defineComponent } from "../types";

/**
 * A fruit reading as a layer of its own: a ring (or brackets, or a pulse)
 * with a frosted label giving the fruit's size and colour. Placed over a
 * picture in a free-layout section, it anchors to the spot under its centre
 * and follows it (crop on each screen size, parallax) — see ./follow.ts.
 * It looks like the readings on a picture (Image > Fruit readings) and plays
 * in the same way.
 */
export const FruitReadingContent = z.object({
  size: z.number().min(0).max(999),
  colour: z.enum(["green", "break", "mostly", "orange"]),
  /** The colour callout's block, when it should differ from the stage's usual colour. */
  swatch: z.string().optional(),
  look: z.enum(MARK_STYLES),
  side: z.enum(["right", "left"]),
  labels: z.enum(["fixed", "scale"]),
  /** Seconds after it comes into view before it plays. */
  delay: z.number().min(0).max(20),
  /** The picture under it: its block id and the spot (percent of the picture's content) the ring's centre sits on. */
  anchor: z.object({ id: z.string(), x: z.number(), y: z.number() }).optional(),
});
export type FruitReadingContent = z.infer<typeof FruitReadingContent>;

export const FruitReading = defineComponent<FruitReadingContent>({
  type: "FruitReading",
  label: "Fruit reading: a ring and label that sits on a picture",
  category: "media",
  schema: FruitReadingContent,
  defaults: { content: { size: 68, colour: "break", look: "ring", side: "right", labels: "fixed", delay: 0 }, style: { w: 96, h: 96, aspectRatio: "1/1" } },
  css: annotationCss + `
.fr{position:relative;width:100%;height:100%}
.fr>.ann{inset:0}
.fr .ann-m{left:50%;top:50%}
`,
  Render: ({ content, ctx }) => {
    const a = content.anchor;
    return (
      <div className="fr" data-fr="" data-labels={content.labels} {...(a ? { "data-anchor": a.id, "data-ax": String(a.x), "data-ay": String(a.y) } : {})}>
        <div className={`ann ann-${content.look}${ctx.editing ? " in" : ""}`} data-ann="" data-delay={content.delay ? String(content.delay) : undefined} aria-hidden="true">
          <span className={`ann-m ann-${content.side}`} style={{ "--r": "50cqw", "--d": "0s" } as CSSProperties}>
            {content.look === "ring" ? (
              <svg className="ann-shape" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="47" pathLength="100" />
              </svg>
            ) : content.look === "brackets" ? (
              <svg className="ann-shape" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M2 24V2h22M76 2h22v22M98 76v22H76M24 98H2V76" />
              </svg>
            ) : (
              <span className="ann-dot" />
            )}
            {content.look === "brackets" ? <span className="ann-scan" /> : null}
            <ReadingChips size={content.size} colour={content.colour} swatch={content.swatch} />
          </span>
        </div>
      </div>
    );
  },
});
