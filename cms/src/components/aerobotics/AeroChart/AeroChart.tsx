import { defineComponent } from "../../types";
import { ChartCard, chartCss, ChartData, SAMPLE_CHARTS } from "../charts";
import { aeroboticsKit } from "../kit";

export const AeroChartContent = ChartData;
export type AeroChartContent = ChartData;

/**
 * A platform graph as a block: bars, lines, a colour legend or a quality list on a white card,
 * drawn live so it stays sharp, takes edits and can sit anywhere (also in a free layout over a photo).
 */
export const AeroChart = defineComponent<AeroChartContent>({
  type: "AeroChart",
  label: "Platform graph: bars, lines, colour or quality card",
  category: "aerobotics",
  schema: AeroChartContent,
  defaults: { content: SAMPLE_CHARTS.bars, style: { maxWidth: "380px" } },
  kit: aeroboticsKit,
  css: chartCss,
  Render: ({ content, ctx }) => <ChartCard d={content} editing={ctx.editing} />,
});
