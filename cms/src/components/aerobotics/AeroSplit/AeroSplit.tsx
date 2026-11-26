import { z } from "zod";
import { defineComponent } from "../../types";
import { ChartCard, chartCss, ChartData, SAMPLE_CHARTS, SIZE_BARS } from "../charts";
import { CROP_KEYS, cropCss, CropStrip, ALL_CROPS } from "../AeroCrops/crops";
import { aeroboticsKit } from "../kit";
import { art, Band, Btn, Pic, BACKGROUNDS } from "../shared";
import { css } from "./AeroSplit.styles";

export const AeroSplitContent = z.object({
  kicker: z.string(),
  title: z.string(),
  text: z.string(),
  cropsLabel: z.string(),
  crops: z.array(z.object({ crop: z.enum(CROP_KEYS) })),
  primaryLabel: z.string(),
  primaryUrl: z.string(),
  secondaryLabel: z.string(),
  secondaryUrl: z.string(),
  /** What sits beside the words: a photo, platform graphs, or a photo with graph cards over its edge. */
  media: z.enum(["picture", "charts", "picture-cards"]),
  image: z.string(),
  alt: z.string(),
  charts: z.array(ChartData),
  side: z.enum(["right", "left"]),
  bg: z.enum(BACKGROUNDS),
});
export type AeroSplitContent = z.infer<typeof AeroSplitContent>;

/**
 * Words beside a picture or platform graphs: "Take photos of fruit to get the true picture" on the
 * home page and "Turn your phone into a digital calliper" on the product pages.
 */
export const AeroSplit = defineComponent<AeroSplitContent>({
  type: "AeroSplit",
  label: "Split: words beside a photo or platform graphs",
  category: "aerobotics",
  schema: AeroSplitContent,
  defaults: {
    content: {
      kicker: "",
      title: "Take photos of fruit to get the true picture",
      text: "Estimating yields accurately is difficult, but our platform makes it easier with AI-enabled measurements and user inputs all in one place. Take pictures of fruit in the field to receive up-to-date, accurate fruit size, color and quality measurements immediately, and intelligent size forecasting from early in the season.",
      cropsLabel: "Solutions for a range of crop types",
      crops: ALL_CROPS,
      primaryLabel: "",
      primaryUrl: "",
      secondaryLabel: "",
      secondaryUrl: "",
      media: "picture-cards",
      image: art("team_2"),
      alt: "Citrus on the tree, each fruit measured",
      charts: [SAMPLE_CHARTS.legend, SIZE_BARS, SAMPLE_CHARTS.quality],
      side: "right",
      bg: "pale",
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css: css + chartCss + cropCss,
  Render: ({ content: c, ctx }) => (
    <Band bg={c.bg} className={`abs abs-${c.side} abs-m-${c.media}`}>
      <div className="abs-grid">
        <div className="abs-copy">
          {c.kicker ? <p className="ab-kicker">{c.kicker}</p> : null}
          {c.title ? <h2 className="ab-h2">{c.title}</h2> : null}
          {c.text ? <p className="ab-text">{c.text}</p> : null}
          <CropStrip label={c.cropsLabel} crops={c.crops} />
          {c.primaryLabel || c.secondaryLabel ? (
            <div className="ab-btns">
              <Btn label={c.primaryLabel} url={c.primaryUrl} kind="blue" ctx={ctx} />
              <Btn label={c.secondaryLabel} url={c.secondaryUrl} kind="outline" ctx={ctx} />
            </div>
          ) : null}
        </div>
        <div className="abs-media">
          {c.media !== "charts" ? <Pic className="abs-pic" src={c.image} alt={c.alt} sizes="(min-width:810px) 480px, 100vw" ctx={ctx} /> : null}
          {c.media !== "picture" && c.charts.length ? (
            <div className="abs-charts">
              {c.charts.map((d, i) => (
                <ChartCard key={i} d={d} editing={ctx.editing} order={i} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Band>
  ),
});

/** The product-page version: growth and forecast graphs beside the words. */
export const productSplit = (): AeroSplitContent => ({
  ...AeroSplit.defaults.content,
  title: "Turn your phone into a digital calliper",
  text: "TrueFruit Size turns your smartphone into an advanced fruit measuring tool. Simply take photos of fruit on your trees, and let our AI calculate the sizes.",
  cropsLabel: "Available for a range of crop types",
  media: "charts",
  charts: [SAMPLE_CHARTS.lines, SAMPLE_CHARTS.bars],
});
