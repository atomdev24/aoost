import type { CSSProperties } from "react";
import { z } from "zod";
import { defineComponent } from "../../types";
import { Block, Head } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostTools.styles";

export const AoostTool = z.object({
  /** Two letters on the app tile, e.g. "Ps". */
  abbr: z.string(),
  name: z.string(),
  /** The word on the right, e.g. "Daily". */
  level: z.string(),
  /** How full the ruler bar is, 0 to 100. */
  value: z.number().min(0).max(100),
});

export const AoostToolsContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  heading: z.string(),
  tools: z.array(AoostTool),
});
export type AoostToolsContent = z.infer<typeof AoostToolsContent>;

export const AoostTools = defineComponent<AoostToolsContent>({
  type: "AoostTools",
  label: "Skills: tools and proficiency",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostToolsContent,
  defaults: {
    content: {
      mat: "light",
      heading: "skills",
      tools: [
        { abbr: "Id", name: "InDesign", level: "Daily", value: 90 },
        { abbr: "Ai", name: "Illustrator", level: "Fluent", value: 85 },
        { abbr: "Ps", name: "Photoshop", level: "Daily", value: 75 },
        { abbr: "Fg", name: "Figma", level: "Fluent", value: 60 },
        { abbr: "Ae", name: "After Effects", level: "Learning", value: 45 },
        { abbr: "Bl", name: "Blender", level: "Learning", value: 35 },
      ],
    },
  },
  css,
  Render: ({ content, ctx }) => (
    <Block name="tools" mat={content.mat}>
      {/* The bars grow when the section scrolls into view (the script adds .seen). The editor shows them grown. */}
      <section className={ctx.editing ? "focus-sec skills seen" : "focus-sec skills"} aria-labelledby="h-tools">
        <Head id="h-tools" title={content.heading} index={2} />
        <ul className="sk-list">
          {content.tools.map((t, i) => (
            <li key={i}>
              <span className="sk-ic" aria-hidden="true">
                {t.abbr}
              </span>
              <div className="sk-main">
                <div className="sk-top">
                  <b>{t.name}</b>
                  <span className="sk-lv">{t.level}</span>
                </div>
                <div className="sk-bar" role="meter" aria-label={`${t.name} proficiency`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.value} aria-valuetext={t.level}>
                  <i style={{ "--v": t.value / 100 } as CSSProperties} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Block>
  ),
});
