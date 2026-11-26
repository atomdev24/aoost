import type { Fields } from "@puckeditor/core";
import type { ChartData } from "../charts";

export const chartFields: Fields<ChartData> = {
  kind: {
    type: "select",
    label: "Graph",
    options: [
      { label: "Bars (size distribution, forecast)", value: "bars" },
      { label: "Lines (growth over the season)", value: "lines" },
      { label: "Colour legend", value: "legend" },
      { label: "Quality (good and bad)", value: "quality" },
    ],
  },
  title: { type: "text", label: "Title" },
  labels: { type: "text", label: "Bars and lines: labels along the bottom (comma separated)" },
  values: { type: "textarea", label: "Bars: values, comma separated. Lines: one line each, Name | colour | values (a ~ starts the forecast)" },
  color: { type: "text", label: "Bars: colour" },
  showValues: { type: "radio", label: "Bars: print the values", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
  unit: { type: "text", label: "Bars: unit after the values. Lines: axis name" },
  rows: { type: "textarea", label: "Colour or quality: one row each, Label | colour (or good / bad)" },
};
export const fields = chartFields;
