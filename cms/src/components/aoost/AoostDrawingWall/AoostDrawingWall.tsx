import { z } from "zod";
import { defineComponent } from "../../types";
import { Block, Head } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostDrawingWall.styles";
import { wallMarkup } from "./wall.markup";

const Swatch = z.object({ name: z.string(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "use a hex colour like #2236F2") });

export const AoostDrawingWallContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  /** The wall is switched off on the live site today; turn it on to show it. */
  show: z.boolean(),
  heading: z.string(),
  /** Paint colours in the toolbar. */
  paint: z.array(Swatch).min(1),
  /** Sticky-note colours. */
  noteColors: z.array(Swatch).min(1),
  /** Background colours; the first is the wall's starting colour. */
  backgrounds: z.array(Swatch).min(1),
});
export type AoostDrawingWallContent = z.infer<typeof AoostDrawingWallContent>;

export const AoostDrawingWall = defineComponent<AoostDrawingWallContent>({
  type: "AoostDrawingWall",
  label: "The wall: a pocket Photoshop to draw on",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostDrawingWallContent,
  defaults: {
    content: {
      mat: "dark",
      show: false,
      heading: "the wall",
      paint: [
        { name: "Black", color: "#141516" },
        { name: "White", color: "#FFFFFF" },
        { name: "Blue", color: "#2236F2" },
        { name: "Pink", color: "#D9559E" },
        { name: "Lime", color: "#86E06F" },
        { name: "Orange", color: "#F1A23B" },
      ],
      noteColors: [
        { name: "Yellow", color: "#F2E36B" },
        { name: "Pink", color: "#D9559E" },
        { name: "Lime", color: "#86E06F" },
        { name: "Blue", color: "#7FA9E6" },
        { name: "White", color: "#FFFFFF" },
      ],
      backgrounds: [
        { name: "White", color: "#FFFFFF" },
        { name: "Paper", color: "#EFF0EC" },
        { name: "Black", color: "#141516" },
        { name: "Neon pink", color: "#FF2D95" },
        { name: "Lime", color: "#86E06F" },
        { name: "Sky", color: "#7FA9E6" },
        { name: "Orange", color: "#F1A23B" },
        { name: "Yellow", color: "#F2E36B" },
      ],
    },
  },
  // The site nav (when a page shows it) also styles a class called .menu; undo that inside the wall.
  css:
    css +
    `\n.ao .ps .menu{top:auto;left:auto;min-width:0;padding:0;display:block;background:none;color:inherit;border:0;border-radius:0;box-shadow:none;white-space:normal;opacity:1;transform:none;transition:none}\n.ao .ps .menu::before{content:none}\n.ao .ao-off-note{margin:0;padding:14px 16px;border:1px dashed var(--rule);color:var(--ink-2);font:400 var(--t-xs)/1.5 var(--mono);letter-spacing:.06em;text-transform:uppercase}\n`,
  Render: ({ content, ctx }) => (
    <Block name="wall" mat={content.mat} data={content} off={!content.show}>
      {!content.show && ctx.editing ? <p className="ao-off-note">The wall is switched off (as on the live site). Turn it on in this block's settings to show it.</p> : null}
      <section aria-labelledby="h-wall" hidden={!content.show}>
        <Head id="h-wall" title={content.heading} index={4} />
        <div dangerouslySetInnerHTML={{ __html: wallMarkup }} style={{ display: "contents" }} />
      </section>
    </Block>
  ),
});
