import { useEffect, useRef, type CSSProperties } from "react";
import { clearLayout, pieceTransform, placeOf } from "../runtime/table.js";
import { z } from "zod";
import { ResponsiveFrameFit, ResponsiveItemSize } from "../../../schema";
import { defineComponent } from "../../types";
import { Block, Head, LineArt } from "../Block";
import { shownSlots } from "../frames";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostProjects.styles";

/** The editor's table: the pieces where the site puts them (same layout, same screen width), not draggable here. */
function EditingTable({ shown }: { shown: { image?: string; title?: string; sticker?: boolean; size?: unknown }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = shown.map((p) => p.image).join("|");
  // Sizes and saved spots live in CSS the frame may not report as a change: lay out again when they change.
  const sizes = JSON.stringify(shown.map((p) => p.size ?? null));
  useEffect(() => {
    const table = ref.current;
    const win = table?.ownerDocument.defaultView;
    if (!table || !win) return;
    let frame = 0;
    const arrange = () => {
      win.cancelAnimationFrame(frame);
      frame = win.requestAnimationFrame(() => {
        const pieces = [...table.querySelectorAll<HTMLElement>(":scope > .piece")];
        if (!pieces.length || !table.clientWidth) return;
        const aspects = pieces.map((p) => {
          const img = p.querySelector("img");
          return img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1.25;
        });
        const scales = pieces.map((p) => {
          const v = win.getComputedStyle(p).scale;
          return v && v !== "none" ? Number(v.split(" ")[0]) || 1 : 1;
        });
        const places = pieces.map((p) => placeOf(win.getComputedStyle(p)));
        const L = clearLayout(table.clientWidth, aspects, scales, places);
        table.classList.remove("ao-static");
        table.style.height = `${L.H}px`;
        pieces.forEach((p, i) => {
          const it = L.items[i]!;
          p.style.width = `${L.pw}px`;
          p.style.transform = pieceTransform(it.x, it.y, it.rot, scales[i]);
          p.style.zIndex = String(i + 1);
        });
      });
    };
    arrange();
    const imgs = [...table.querySelectorAll("img")];
    imgs.forEach((i) => i.addEventListener("load", arrange));
    const ro = new win.ResizeObserver(arrange);
    ro.observe(table);
    // A size set in the editor changes the pieces' scale: lay out again so they stay clear.
    const mo = new win.MutationObserver(arrange);
    mo.observe(table.ownerDocument.head, { childList: true, subtree: true, characterData: true });
    return () => {
      win.cancelAnimationFrame(frame);
      imgs.forEach((i) => i.removeEventListener("load", arrange));
      ro.disconnect();
      mo.disconnect();
    };
  }, [key, sizes]);
  return (
    <div className="table ao-static" id="table" ref={ref}>
      {shown.map((p, i) => (
        <div key={i} className={p.sticker ? "piece stk" : "piece"}>
          <span className="tape" />
          <img src={p.image} alt={p.title ?? ""} draggable={false} />
        </div>
      ))}
    </div>
  );
}

export const AoostProject = z.object({
  /** The artwork. Any shape; about 1600px on the long edge. */
  image: z.string(),
  title: z.string().optional(),
  year: z.string().optional(),
  medium: z.string().optional(),
  /** Plaque note: shown under the title on the piece's plaque in the viewer (title, medium, year and note are all optional). */
  note: z.string().optional(),
  /** Where the piece leads (shown as "open" on the plaque). */
  link: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** A cut-out sticker: no white card or tape, just its own shape and shadow. */
  sticker: z.boolean().optional(),
  hidden: z.boolean().optional(),
  /** Framing of the image, per screen size. */
  frame: ResponsiveFrameFit.optional(),
  /** Size of the piece on the table, per screen size (1 = as laid out). It grows around its own spot. */
  size: ResponsiveItemSize.optional(),
});

/**
 * A fixture: an object that sits on the table above everything else (the metal clover).
 * Pieces can be dragged underneath it, never on top. It doesn't take clicks, so a piece under it can still be picked up.
 */
export const AoostFixture = z.object({
  image: z.string(),
  /** Where its centre sits, as a percentage of the table's width and height. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  /** Width in px on a wide screen; it shrinks with the screen on phones. */
  width: z.number().min(40).max(800),
  rotate: z.number().min(-180).max(180).optional(),
  hidden: z.boolean().optional(),
});

/** Shadow presets: a shade layer (darkens, multiplied) and a sunlight layer (warms the lit patches). */
export const SHADOWS = {
  window: { shade: "/art/shadow-window-shade.webp", sun: "/art/shadow-window-sun.webp" },
} as const;

/**
 * A shadow cast across the whole section, edge to edge, on top of everything (heading, pieces, fixtures, keychain). It never takes clicks.
 * Older content has none (off).
 */
export const AoostShadow = z.object({
  show: z.boolean(),
  style: z.enum(["window"]).optional(),
  /** Your own shade image (transparent; dark where the shadow falls). Replaces the preset's shade. */
  image: z.string().optional(),
  /** How dark the shadow is, 0–100 (default 70). */
  strength: z.number().min(0).max(100).optional(),
  /** How warm the lit patches are, 0–100 (default 60). */
  sun: z.number().min(0).max(100).optional(),
  /** How big the shadow is, as a percentage of the board's width (default 110). */
  scale: z.number().min(40).max(300).optional(),
  /** Where it sits, as percentages across and down (default 50, 40). */
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
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
  note: z.object({ show: z.boolean(), style: z.enum(["eye", "plain"]).optional(), image: z.string().optional(), frame: ResponsiveFrameFit.optional() }),
  keychain: z.object({ show: z.boolean(), image: z.string(), label: z.string() }),
  /** Western line art: a cactus beside the intro line, a longhorn skull beside the heading. */
  showCactus: z.boolean(),
  showSkull: z.boolean(),
  /** Objects fixed on top of the table (older content has none). */
  fixtures: z.array(AoostFixture).optional(),
  /** Tapping a piece (without dragging it) opens it full screen in the viewer. Older content: on. */
  viewer: z.boolean().optional(),
  shadow: AoostShadow.optional(),
});
export type AoostProjectsContent = z.infer<typeof AoostProjectsContent>;

const extraCss = `
.ao .ao-b[data-ao="projects"] .who-row{margin-bottom:var(--s9)}
.ao .table.ao-static{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:28px 22px;align-items:center;padding:28px 22px;min-height:0}
.ao .table.ao-static .piece{position:relative}
.ao .table.ao-static .piece:nth-child(odd){transform:rotate(-3deg)}
.ao .table.ao-static .piece:nth-child(even){transform:rotate(2.500deg)}
.ao .table{isolation:isolate}
.ao .fixture{position:absolute;z-index:8;width:min(var(--fw,200px),36vw);height:auto;left:var(--fx,50%);top:var(--fy,50%);transform:translate(-50%,-50%) rotate(var(--fr,0deg)) scale(var(--fs,1));user-select:none;-webkit-user-select:none;-webkit-user-drag:none;-webkit-touch-callout:none;touch-action:pan-y pinch-zoom;cursor:grab}
.ao .piece.pressing,.ao .fixture.pressing{transition:filter .3s;filter:brightness(.96)}
.ao .piece img{-webkit-touch-callout:none}
.ao .fixture.lifted{--fs:1.06;cursor:grabbing;filter:drop-shadow(0 14px 12px rgba(20,21,22,.18))}
.ao.editing .fixture,.ao .table.ao-static~.fixture{pointer-events:none}
/* The whole section, edge to edge: out to the screen's sides and over the band's padding (the band clips it). */
.ao .board-shadow{position:absolute;z-index:70;pointer-events:none;overflow:hidden;container-type:size;left:calc(50% - 50vw);width:100vw;top:calc(-1 * var(--s8));bottom:calc(-1 * var(--s8));-webkit-mask-image:linear-gradient(#000 calc(100% - 140px),transparent);mask-image:linear-gradient(#000 calc(100% - 140px),transparent)}
.ao .board-shadow>i{position:absolute;inset:0;background-repeat:no-repeat;background-size:max(calc(var(--sh-s,110) * 1cqw),100cqh);background-position:var(--sh-x,50%) var(--sh-y,40%)}
.ao .board-shadow .sh-shade{mix-blend-mode:multiply;opacity:var(--sh-k,.7)}
.ao .board-shadow .sh-sun{mix-blend-mode:soft-light;opacity:var(--sh-w,.6)}
`;

function BoardShadow({ shadow }: { shadow?: z.infer<typeof AoostShadow> }) {
  if (!shadow?.show) return null;
  const preset = SHADOWS[shadow.style ?? "window"];
  const shade = shadow.image || preset.shade;
  const sun = shadow.image ? null : preset.sun;
  const pct = (v: number | undefined, d: number) => `${Math.max(0, Math.min(100, v ?? d)) / 100}`;
  const style = {
    "--sh-k": pct(shadow.strength, 70),
    "--sh-w": pct(shadow.sun, 60),
    "--sh-s": `${shadow.scale ?? 110}`,
    "--sh-x": `${shadow.x ?? 50}%`,
    "--sh-y": `${shadow.y ?? 40}%`,
  } as CSSProperties;
  const url = (u: string) => `url('${u.replace(/'/g, "%27")}')`;
  return (
    <div className="board-shadow" aria-hidden="true" data-shadow={shadow.image ? "custom" : (shadow.style ?? "window")} style={style}>
      <i className="sh-shade" style={{ backgroundImage: url(shade) }} />
      {sun ? <i className="sh-sun" style={{ backgroundImage: url(sun) }} /> : null}
    </div>
  );
}

export const AoostProjects = defineComponent<AoostProjectsContent>({
  type: "AoostProjects",
  label: "Projects: the table of work",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostProjectsContent,
  frames: (content) => [
    ...shownSlots(content.projects, (p) => !!p.image && !p.hidden, (p, i, k) => ({ path: ["projects", i], label: p.title || `Piece ${k}`, kind: "img", selector: `.table>.piece:nth-child(${k})>img`, box: `.table>.piece:nth-child(${k})`, src: p.image })),
    ...(content.note.show && content.note.image ? [{ path: ["note"], label: "Sticky note", kind: "img" as const, selector: '.sticky[data-note="0"]>img', src: content.note.image, frame: content.note.frame }] : []),
    // Fixtures last: they sit on top, so a click on one picks it over a piece underneath.
    ...(content.fixtures ?? []).flatMap((f, i) =>
      f.image && !f.hidden
        ? [{ path: ["fixtures", i], label: f.image.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") || `Fixture ${i + 1}`, kind: "img" as const, selector: `.fixture[data-fixture="${i}"]`, box: `.fixture[data-fixture="${i}"]`, src: f.image, fixture: true }]
        : [],
    ),
  ],
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
            {/* On the site the script lays the pieces out and makes them draggable. The editor lays them
                out with the same code (runtime/table.js), so its frames show the table as the site does. */}
            {ctx.editing ? (
              <EditingTable shown={shown} />
            ) : (
              <div className="table" id="table" />
            )}
            {(content.fixtures ?? []).map((f, i) =>
              !f.image || f.hidden ? null : (
                <img
                  key={i}
                  className="fixture"
                  data-fixture={i}
                  src={f.image}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ "--fx": `${f.x}%`, "--fy": `${f.y}%`, "--fw": `${f.width}px`, "--fr": `${f.rotate ?? 0}deg` } as CSSProperties}
                />
              ))}
            {content.keychain.show && content.keychain.image ? (
              <button className="keychain" id="keychain" type="button" aria-label={content.keychain.label}>
                <span className="kc-pin" aria-hidden="true" />
                <img src={content.keychain.image} alt="" width="480" height="757" />
              </button>
            ) : null}
          </div>
          <label className="btn add-art" htmlFor="addArt">
            Add artwork (preview only)
            <input id="addArt" type="file" accept="image/*" multiple hidden />
          </label>
        </section>
        <BoardShadow shadow={content.shadow} />
      </Block>
    );
  },
});
