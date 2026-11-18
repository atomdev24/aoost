import { z } from "zod";
import { defineComponent } from "../../types";
import { Block, Head, LineArt } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostProjects.styles";

export const AoostProject = z.object({
  /** The artwork. Any shape; about 1600px on the long edge. */
  image: z.string(),
  title: z.string().optional(),
  year: z.string().optional(),
  medium: z.string().optional(),
  /** Where the piece leads (shown as "open" in the viewer). */
  link: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** A cut-out sticker: no white card or tape, just its own shape and shadow. */
  sticker: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const AoostProjectsContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  /** The line above the heading ("Alex · Cape Town"). */
  intro: z.string(),
  heading: z.string(),
  projects: z.array(AoostProject),
  /**
   * The neon sticky note pinned to the table's corner. Without an image it shows the drawn eye,
   * or nothing on it when style is "plain". Older content has no style: "eye".
   */
  note: z.object({ show: z.boolean(), style: z.enum(["eye", "plain"]).optional(), image: z.string().optional() }),
  keychain: z.object({ show: z.boolean(), image: z.string(), label: z.string() }),
  /** Western line art: a cactus beside the intro line, a longhorn skull beside the heading. */
  showCactus: z.boolean(),
  showSkull: z.boolean(),
});
export type AoostProjectsContent = z.infer<typeof AoostProjectsContent>;

const extraCss = `
.ao .ao-b[data-ao="projects"] .who-row{margin-bottom:var(--s9)}
.ao .viewer .stage{position:relative}
.ao .viewer .vcap{position:absolute;left:0;right:0;bottom:0;margin:0;padding:10px 12px;text-align:center;font:400 var(--t-xs)/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:#fff;background:linear-gradient(rgba(20,21,22,0),rgba(20,21,22,.7))}
.ao .table.ao-static{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:28px 22px;align-items:center;padding:28px 22px;min-height:0}
.ao .table.ao-static .piece{position:relative}
.ao .table.ao-static .piece:nth-child(odd){transform:rotate(-3deg)}
.ao .table.ao-static .piece:nth-child(even){transform:rotate(2.500deg)}
`;

export const AoostProjects = defineComponent<AoostProjectsContent>({
  type: "AoostProjects",
  label: "Projects: the table of work",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostProjectsContent,
  defaults: {
    content: {
      mat: "light",
      intro: "Alex · Cape Town",
      heading: "projects",
      // Today's live projects, in order (from the site's content on 15 Nov 2026).
      projects: ["hero.jpg", "grillz.jpg", "monkey-figure.jpg", "storefront.png", "hear-no-evil-3d.png", "flower-skull.png", "hear-no-evil-ring.png"].map((f) => ({ image: `/art/${f}` })),
      note: { show: true, style: "eye" },
      keychain: { show: true, image: "/art/keychain.png", label: "Monkey keychain, give it a swing" },
      showCactus: false,
      showSkull: false,
    },
  },
  css: css + extraCss,
  Render: ({ content, ctx }) => {
    const shown = content.projects.filter((p) => p.image && !p.hidden);
    return (
      <Block name="projects" mat={content.mat} data={content}>
        {content.intro || content.showCactus ? (
          <div className="who-row">
            {content.showCactus ? <LineArt kind="cactus" className="cactus" /> : null}
            <p className="who">{content.intro}</p>
          </div>
        ) : null}
        <section className="focus-sec" aria-labelledby="h-proj">
          <Head id="h-proj" title={content.heading} index={0}>
            {content.showSkull ? <LineArt kind="skull" className="skull" /> : null}
          </Head>
          <div className="table-wrap">
            {content.note.show ? <div className="sticky table-note" aria-hidden="true" data-note="0" data-note-style={content.note.style === "plain" ? "plain" : undefined} /> : null}
            {/* On the site the script lays the pieces out and makes them draggable. The editor shows them as a simple grid. */}
            <div className={ctx.editing ? "table ao-static" : "table"} id="table">
              {ctx.editing
                ? shown.map((p, i) => (
                    <div key={i} className={p.sticker ? "piece stk" : "piece"}>
                      <span className="tape" />
                      <img src={p.image} alt={p.title ?? ""} draggable={false} />
                    </div>
                  ))
                : null}
            </div>
            {content.keychain.show && content.keychain.image ? (
              <button className="keychain" id="keychain" type="button" aria-label={content.keychain.label}>
                <span className="kc-pin" aria-hidden="true" />
                <img src={content.keychain.image} alt="" width="466" height="640" />
              </button>
            ) : null}
          </div>
          <label className="btn add-art" htmlFor="addArt">
            Add artwork (preview only)
            <input id="addArt" type="file" accept="image/*" multiple hidden />
          </label>
        </section>
      </Block>
    );
  },
});
