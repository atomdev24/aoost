import type { CSSProperties } from "react";
import { z } from "zod";
import type { ComponentKit } from "../types";
import { defineComponent } from "../types";
import { HTML } from "./markup";
import { css } from "./TrueFruitSeason.styles";

/**
 * TrueFruit by season: the POC's products section (Size → Grade → BinScan along
 * a growing-fruit timeline, with a chart panel per product), ported from the
 * Framer code component. Same markup, styles and script; text, photos and links
 * come from fields. The script (runtime.ts) pins the panel and steps through the
 * products as the page scrolls; it loads only on pages that use this block.
 */
export const TrueFruitSeasonContent = z.object({
  showIntro: z.boolean(),
  logo: z.string(),
  heading: z.string(),
  intro: z.string(),
  sizeTitle: z.string(),
  sizeLead: z.string(),
  sizePhoto: z.string(),
  sizeLink: z.string(),
  gradeTitle: z.string(),
  gradeLead: z.string(),
  gradePhoto: z.string(),
  gradeLink: z.string(),
  binScanTitle: z.string(),
  binScanLead: z.string(),
  binScanPhoto: z.string(),
  binScanLink: z.string(),
  /** "scale": every screen shows the desktop design, shrunk to fit. "responsive": stacked on phones. */
  layout: z.enum(["scale", "responsive"]),
  designWidth: z.number().min(600).max(1600),
  /** Height of the sticky nav: the panel pins just below it. */
  headerHeight: z.number().min(0).max(200),
  /** Which product the editor shows (the page itself follows the scroll). */
  previewStage: z.number().int().min(0).max(2),
});
export type TrueFruitSeasonContent = z.infer<typeof TrueFruitSeasonContent>;

export const truefruitKit: ComponentKit = {
  id: "truefruit",
  css: "",
  googleFonts: ["Nunito Sans:opsz,wght@6..12,300..700"],
  script: "/assets/truefruit.js",
};

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
/** Links: only web, relative and in-page addresses. */
const safeHref = (s: string) => (/^(https?:|\/|#)/i.test(s.trim()) ? s.trim() : "#");

export function seasonMarkup(c: TrueFruitSeasonContent, uid: string, editing: boolean): string {
  const intro = c.showIntro
    ? `<div class="section-intro">${c.logo ? `<img class="suite-logo" src="${esc(c.logo)}" alt="TrueFruit by Aerobotics" height="79">` : ""}<h2>${esc(c.heading)}</h2><p>${esc(c.intro)}</p></div>`
    : "";
  const map: Record<string, string> = {
    IMG_SIZE: esc(c.sizePhoto),
    IMG_GRADE: esc(c.gradePhoto),
    IMG_BINSCAN: esc(c.binScanPhoto),
    LINK_SIZE: esc(safeHref(c.sizeLink || "#")),
    LINK_GRADE: esc(safeHref(c.gradeLink || "#")),
    LINK_BINSCAN: esc(safeHref(c.binScanLink || "#")),
    T0: esc(c.sizeTitle),
    L0: esc(c.sizeLead),
    T1: esc(c.gradeTitle),
    L1: esc(c.gradeLead),
    T2: esc(c.binScanTitle),
    L2: esc(c.binScanLead),
  };
  let out = HTML.replace("{{INTRO_BLOCK}}", intro).replace(/\{\{(\w+)\}\}/g, (_, k: string) => map[k] ?? "");
  // A photo with no picture yet: leave the dark panel instead of a broken image.
  out = out.replace(/<img([^>]*?) src=""([^>]*)>/g, "");
  if (editing) {
    // The editor has no script: show the chosen product with its charts drawn.
    const ids = ["size", "grade", "binscan"];
    const pick = ids[c.previewStage] ?? "size";
    out = out.replace('class="stage is-active"', 'class="stage"').replace(`class="stage" role="tabpanel" id="stage-${pick}__UID__"`, `class="stage is-active" role="tabpanel" id="stage-${pick}__UID__"`);
    out = out.replace(/class="insights stage-visual"/g, 'class="insights stage-visual is-shown"');
  }
  return out.replace(/__UID__/g, "-" + uid);
}

export const TrueFruitSeason = defineComponent<TrueFruitSeasonContent>({
  type: "TrueFruitSeason",
  label: "TrueFruit by season: products along the growing season",
  category: "embed",
  kit: truefruitKit,
  schema: TrueFruitSeasonContent,
  defaults: {
    content: {
      showIntro: true,
      logo: "",
      heading: "Analyze fruit from 10mm through to the packhouse",
      intro: "One platform for fruit size, color and quality, measured from your phone at every stage of the season and post-harvest.",
      sizeTitle: "Precise fruit sizing and size forecasting",
      sizeLead: "Measure fruit on the tree with your phone, track growth through the season, and see the size you will pick at harvest.",
      sizePhoto: "/art/tpl_aero_hero_tall.webp",
      sizeLink: "/true-fruit-size",
      gradeTitle: "Automated size, color and blemish measurements",
      gradeLead: "Grade fruit on the tree before you pick, so you know what will make Class 1.",
      gradePhoto: "/art/tpl_aero_citrus.webp",
      gradeLink: "/true-fruit-grade",
      binScanTitle: "Post-harvest size and quality classification",
      binScanLead: "Scan harvested bins with your phone to check size, color, picking quality like pulled and long stems, and defects like thrips, sooty mold and fruit deformity.",
      binScanPhoto: "/art/tpl_aero_apples.webp",
      binScanLink: "/true-fruit-bin-scan",
      layout: "scale",
      designWidth: 1200,
      headerHeight: 64,
      previewStage: 0,
    },
  },
  css,
  Render: ({ node, content, ctx }) => {
    const uid = node.id.replace(/[^a-zA-Z0-9]/g, "");
    const scale = content.layout === "scale" && !ctx.editing;
    const style = {
      "--tfs-header": `${content.headerHeight}px`,
      "--font": '"Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      "--font-display": '"Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      "--tfs-stroke": `url(#growth-stroke-${uid})`,
    } as CSSProperties;
    return (
      <div style={{ width: "100%", minWidth: 0 }}>
        <div
          className={`tfs${ctx.editing ? " is-canvas" : ""}${scale ? " is-fixed" : ""}`}
          data-tfs=""
          data-layout={content.layout}
          data-design-width={content.designWidth}
          data-header={content.headerHeight}
          style={style}
          dangerouslySetInnerHTML={{ __html: seasonMarkup(content, uid, ctx.editing) }}
        />
      </div>
    );
  },
});
