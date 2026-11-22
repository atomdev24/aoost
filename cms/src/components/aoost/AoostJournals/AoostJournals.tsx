import { imageSources } from "../../../render/media";
import type { CSSProperties } from "react";
import { z } from "zod";
import { ResponsiveFrameFit } from "../../../schema";
import { defineComponent } from "../../types";
import { Block, Head } from "../Block";
import { shownSlots } from "../frames";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostJournals.styles";
import { KRAFT_BROWN, materialCss } from "./materials.styles";
import { roomCss } from "./room.styles";

/** A page inside a journal. Empty pages show as "work in progress". */
export const AoostJournalPage = z.object({
  /** A scan that fills the whole page. */
  image: z.string().optional(),
  /** A photo taped to the page, with an optional handwritten note and date. */
  photo: z.string().optional(),
  note: z.string().optional(),
  date: z.string().optional(),
  paper: z.enum(["dots", "lined", "graph", "blank", "kraft", "black", "tracing"]).optional(),
  /** The page runs across both pages of its spread. */
  spread: z.boolean().optional(),
  /** Placed items (stickers, photos, tape, text, doodles…) as made in the Atom app. Kept as they are. */
  items: z.array(z.record(z.string(), z.unknown())).optional(),
  id: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const AoostJournal = z.object({
  title: z.string(),
  year: z.string().optional(),
  /** Cover image. Without one the cover is the plain cover colour. */
  cover: z.string().optional(),
  /** A photo of the book (transparent PNG/WebP). When set it stands on the shelf in place of the drawn book. */
  mockup: z.string().optional(),
  /** Framing of the cover image, per screen size. */
  frame: ResponsiveFrameFit.optional(),
  coverColor: z.string().optional(),
  /** What the cover is made of. "none" (or nothing) is the plain printed cover. */
  material: z.enum(["none", "kraft", "leather"]).optional(),
  /** A sticker centred on the cover. */
  sticker: z.string().optional(),
  /** The elastic band's colour. */
  band: z.string().optional(),
  /** Dark pages inside. */
  dark: z.boolean().optional(),
  /** How many degrees the book is tilted on the shelf. */
  tilt: z.number().min(-20).max(20).optional(),
  /** Optional link: the journal's title in the viewer leads there. */
  link: z.string().optional(),
  pages: z.array(AoostJournalPage),
  options: z
    .object({
      ribbon: z.string().optional(),
      wear: z.enum(["none", "light", "heavy"]).optional(),
      titleStamp: z.boolean().optional(),
      coverText: z.enum(["dark", "light"]).optional(),
      sound: z.boolean().optional(),
      backCover: z.string().optional(),
    })
    .optional(),
  coverItems: z.array(z.record(z.string(), z.unknown())).optional(),
  hidden: z.boolean().optional(),
  id: z.string().optional(),
});
export type AoostJournal = z.infer<typeof AoostJournal>;

export const AoostJournalsContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  heading: z.string(),
  sub: z.string(),
  journals: z.array(AoostJournal),
  /**
   * Window light: the sun through a second window further along the wall, continuing the
   * Projects section's window shadow down across the gap and the shelf. Shows only when the
   * section above casts the window shadow. Older content: on.
   */
  windowLight: z.boolean().optional(),
});
export type AoostJournalsContent = z.infer<typeof AoostJournalsContent>;

const pageCount = (j: AoostJournal) => {
  const n = j.pages.length || 8;
  return n + (n % 2);
};

/** The cover material that changes the look ("" for the plain cover). */
const materialOf = (j: AoostJournal) => (j.material === "kraft" || j.material === "leather" ? j.material : "");

/** A mockup keeps its own shape: every one is the same height on the shelf, its width follows the picture. */
const fitMock = (im: HTMLImageElement | null) => {
  if (im?.naturalWidth && im.naturalHeight) (im.closest(".jr") as HTMLElement | null)?.style.setProperty("--ar", (im.naturalWidth / im.naturalHeight).toFixed(4));
};

/** One book on the shelf: the same markup the script builds, so the editor and the first paint match it. */
function ShelfBook({ j, i }: { j: AoostJournal; i: number }) {
  const o = j.options ?? {};
  const mat = materialOf(j);
  const base = j.coverColor || (mat === "kraft" ? KRAFT_BROWN : "#222");
  const cover = { "--cbg": j.cover ? `url('${j.cover.replace(/'/g, "%27")}') center/cover no-repeat,${base}` : base, "--tone": "#333", "--band": j.band || "#141516" } as CSSProperties;
  if (j.mockup)
    return (
      <button type="button" className="jr jr-hasmock" aria-label={`Open journal: ${j.title}`} style={{ "--r": `${j.tilt ?? 0}deg`, "--i": i } as CSSProperties}>
        <span className="jr-cv jr-mock">
          <img {...imageSources(j.mockup)} sizes="(max-width: 640px) 45vw, 220px" alt="" draggable={false} ref={fitMock} onLoad={(e) => fitMock(e.currentTarget)} />
        </span>
        <span className="jr-n">0{i + 1}</span>
        <span className="jr-cap">
          <i>0{i + 1}</i>
          <b>{j.title}</b>
          <span>
            {pageCount(j)} pages · {j.year ?? ""}
          </span>
        </span>
      </button>
    );
  return (
    <button type="button" className="jr" aria-label={`Open journal: ${j.title}`} style={{ "--r": `${j.tilt ?? 0}deg`, "--i": i } as CSSProperties}>
      {o.ribbon && o.ribbon !== "none" ? <span className="jrib" style={{ "--rib": o.ribbon } as CSSProperties} /> : null}
      <span className={`jr-cv cvx${mat ? ` cv-${mat}${j.cover ? " cv-img" : ""}` : ""}`} style={cover}>
        {mat ? <span className="jmat" /> : null}
        {j.sticker ? <img className="st" src={j.sticker} alt="" /> : null}
        <span className="jr-band" />
        {o.wear === "light" || o.wear === "heavy" ? <span className={`jw jw-${o.wear}`} /> : null}
        {o.titleStamp ? <span className={o.coverText === "light" ? "jstamp lt" : "jstamp"}>{j.title}</span> : null}
        <span className="jr-lbl">{j.title}</span>
      </span>
      <span className="jr-n">0{i + 1}</span>
      <span className="jr-cap">
        <i>0{i + 1}</i>
        <b>{j.title}</b>
        <span>
          {pageCount(j)} pages · {j.year ?? ""}
        </span>
      </span>
    </button>
  );
}

/** The second window's light, drawn as the strip directly below the Projects shadow image, at the same scale. */
export const WINDOW2 = { shade: "/art/aoost_mat_window2_shade_3000x1650.webp", sun: "/art/aoost_mat_window2_sunlight_3000x1650.webp", ratio: 1650 / 3000 };

/**
 * The window light, in two pieces that runtime/light.js lines up with the Projects shadow above:
 * "gap" covers the strip of light mat between that shadow and this section (sun soft-light, as on
 * Projects); "room" lies on the dark wall behind the shelf, under the books (sun screen). Hidden
 * until positioned, so without the script (or without the window shadow above) nothing shows.
 */
function WindowLight({ where }: { where: "gap" | "room" }) {
  return (
    <div className={`jr-light jl-${where}`} aria-hidden="true" data-shade={WINDOW2.shade} data-sun={WINDOW2.sun} data-ratio={WINDOW2.ratio}>
      <i className="jl-shade" />
      <i className="jl-sun" />
    </div>
  );
}
const windowLightCss = [
  `.ao .ao-b[data-ao="journals"]{position:relative}`,
  `.ao .jr-light{display:none;position:absolute;left:calc(50% - 50vw);width:100vw;overflow:hidden;pointer-events:none}`,
  `.ao .jr-light.is-on{display:block}`,
  `.ao .jr-light>i{position:absolute;inset:0;background-repeat:no-repeat}`,
  `.ao .jr-light .jl-shade{mix-blend-mode:multiply;opacity:.7}`,
  // over the light mat between the sections, the same blend as Projects; on the dark wall, screen
  `.ao .jl-gap .jl-sun{mix-blend-mode:soft-light;opacity:.6}`,
  `.ao .jl-room{top:0;bottom:0;z-index:0}`,
  `.ao .jl-room .jl-sun{mix-blend-mode:screen;opacity:.7}`,
  `.ao .journals>:not(.jr-light){position:relative;z-index:1}`,
  `@media (prefers-reduced-transparency:reduce){.ao .jr-light.is-on{display:none}}`,
].join("\n") + "\n";

export const AoostJournals = defineComponent<AoostJournalsContent>({
  type: "AoostJournals",
  label: "Journals: the bookshelf",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostJournalsContent,
  frames: (content) =>
    shownSlots(content.journals, (j) => !j.hidden, (j, i, k) => (j.cover && !j.mockup ? { path: ["journals", i], label: `${j.title || `Journal ${k}`} cover`, kind: "bg", selector: `.jr-shelf>.jr:nth-child(${k})>.jr-cv`, src: j.cover } : null)),
  defaults: {
    content: {
      mat: "light",
      heading: "journals",
      sub: "tap a book to open it",
      // Today's live journals (from the site's content on 15 Nov 2026).
      journals: [
        {
          title: "sketchbook 01",
          year: "2025",
          cover: "/art/j-star1.jpg",
          band: "#141516",
          tilt: -5,
          pages: [
            {
              id: "cc67ed56-1343-4107-8236-c6fc982e371f",
              paper: "black",
              spread: true,
              items: [
                {
                  id: "e244da62-0ce7-4377-9ba9-4cb4cec26aa7",
                  kind: "sticker",
                  src: "https://htlshvacmhprvsupkbpt.supabase.co/storage/v1/object/public/aoost/stickers/4e412042-39ad-4a0e-ac61-a61006fd405c.webp",
                  x: 0.512805,
                  y: 0.478652,
                  w: 0.512394,
                  rot: -20.8,
                  skew: -0.778526,
                  z: 1,
                  props: { lift: 0, tape: "none", aspect: 0.6330275229357798, shadow: "soft", tapeStyle: "masking" },
                },
              ],
            },
          ],
        },
        { title: "hear no evil", year: "2025", coverColor: "#B48A5C", sticker: "/art/hear-no-evil-ring.png", band: "#7A1A1A", tilt: 4, pages: [] },
        { title: "stars & static", year: "2026", cover: "/art/j-star2.jpg", band: "#1B2BA0", tilt: -2, pages: [] },
        { title: "late nights", year: "2026", coverColor: "#141516", sticker: "/art/j-monkey.png", band: "#7C5CFF", dark: true, tilt: 6, pages: [] },
      ],
    },
  },
  css: css + materialCss + roomCss + windowLightCss,
  Render: ({ content }) => (
    <Block name="journals" mat={content.mat} data={content}>
      {content.windowLight !== false ? <WindowLight where="gap" /> : null}
      <section className="focus-sec journals" aria-labelledby="h-jr">
        {content.windowLight !== false ? <WindowLight where="room" /> : null}
        <Head id="h-jr" title={content.heading} index={1}>
          {content.sub?.trim() ? <p className="jr-sub">{content.sub}</p> : null}
        </Head>
        <div className="jr-shelf" id="jrShelf">
          {content.journals
            .filter((j) => !j.hidden)
            .map((j, i) => (
              <ShelfBook key={i} j={j} i={i} />
            ))}
        </div>
      </section>
    </Block>
  ),
});
