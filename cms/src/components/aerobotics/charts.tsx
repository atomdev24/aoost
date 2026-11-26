import type { CSSProperties } from "react";
import { z } from "zod";

/**
 * Platform graphs drawn as live SVG in the Aerobotics app's style: bar and line charts, a colour
 * legend and a quality list, each on a white card. Shared by the Chart block and the Split block.
 */
export const CHART_KINDS = ["bars", "lines", "legend", "quality"] as const;
export const ChartData = z.object({
  kind: z.enum(CHART_KINDS),
  title: z.string(),
  /** Bars and lines: x labels, comma separated ("Under, 113, 88, 72, 56, Over"). */
  labels: z.string(),
  /** Bars: one value per label, comma separated. Lines: one series per line, "Name | colour | 1, 2, 3". */
  values: z.string(),
  /** Bar colour. */
  color: z.string(),
  /** Bars: print each value above its bar. */
  showValues: z.boolean(),
  /** Bars: a unit after printed values ("%"). Lines: the y axis name. */
  unit: z.string(),
  /** Legend and quality: one row per line, "Label | colour" or "95% unblemished | good" (good or bad). */
  rows: z.string(),
  /** Animate the graph in when it scrolls into view (bars grow, lines draw, rows slide in). On unless switched off. */
  animate: z.boolean().optional(),
  /** Seconds the animation takes. */
  animateSeconds: z.number().min(0.2).max(6).optional(),
  /** Seconds to wait before it starts. */
  animateDelay: z.number().min(0).max(6).optional(),
});
export type ChartData = z.infer<typeof ChartData>;

const nums = (s: string) =>
  s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));
const words = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const rowsOf = (s: string) =>
  s
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((r) => r[0]);

/** "Name | #hex | 1, 2, 3" lines → series. A "~" before a value starts the forecast (dashed). */
export function parseSeries(s: string) {
  return s
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((r) => r.length >= 3)
    .map(([name, color, vals]) => {
      const raw = (vals ?? "").split(",").map((x) => x.trim());
      const forecastFrom = raw.findIndex((x) => x.startsWith("~"));
      return { name: name ?? "", color: color || "#0075E1", values: raw.map((x) => Number(x.replace("~", ""))).filter((n) => Number.isFinite(n)), forecastFrom };
    });
}

const W = 320;
const H = 150;

function Bars({ d }: { d: ChartData }) {
  const v = nums(d.values);
  const l = words(d.labels);
  const max = Math.max(1, ...v);
  const n = Math.max(v.length, 1);
  const slot = W / n;
  const bw = Math.min(28, slot * 0.55);
  return (
    <svg viewBox={`0 0 ${W} ${H + 34}`} className="abg-svg" role="img" aria-label={`${d.title}: ${v.map((x, i) => `${l[i] ?? i + 1} ${x}${d.unit}`).join(", ")}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={H - f * (H - 16)} y2={H - f * (H - 16)} className="abg-grid" />
      ))}
      {v.map((x, i) => {
        const h = (x / max) * (H - 16);
        const cx = slot * i + slot / 2;
        return (
          <g key={i} style={{ "--i": i } as CSSProperties}>
            <rect className="abg-bar" x={cx - bw / 2} y={H - h} width={bw} height={Math.max(h, 1)} rx="2" fill={d.color || "#0B3A75"} />
            {d.showValues ? (
              <text x={cx} y={H - h - 5} className="abg-val abg-late">
                {x}
                {d.unit}
              </text>
            ) : null}
            <text x={cx} y={H + 18} className="abg-lbl">
              {l[i] ?? ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Lines({ d }: { d: ChartData }) {
  const series = parseSeries(d.values);
  const l = words(d.labels);
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const n = Math.max(l.length, ...series.map((s) => s.values.length), 2);
  const x = (i: number) => 28 + (i / (n - 1)) * (W - 36);
  const y = (v: number) => H - 8 - ((v - min) / (max - min || 1)) * (H - 24);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H + 34}`} className="abg-svg" role="img" aria-label={`${d.title}: ${series.map((s) => s.name).join(", ")}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1="28" x2={W} y1={H - 8 - f * (H - 24)} y2={H - 8 - f * (H - 24)} className="abg-grid" />
          <text x="22" y={H - 8 - f * (H - 24) + 3} className="abg-axis">
            {Math.round(min + f * (max - min))}
          </text>
        </g>
      ))}
      <g className="abg-draw">
      {series.map((s, k) => {
        const cut = s.forecastFrom > 0 ? s.forecastFrom : s.values.length;
        const solid = s.values.slice(0, cut);
        const dashed = s.forecastFrom > 0 ? s.values.slice(cut - 1) : [];
        return (
          <g key={k}>
            <path d={path(solid)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {dashed.length > 1 ? <path d={dashed.map((v, i) => `${i ? "L" : "M"}${x(cut - 1 + i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.2" strokeDasharray="4 4" /> : null}
          </g>
        );
      })}
      </g>
      {series[0] && series[0].values.length > 1 ? <circle className="abg-dot abg-late" cx={x(series[0].values.length - 1)} cy={y(series[0].values[series[0].values.length - 1]!)} r="5" fill="#fff" stroke={series[0].color} strokeWidth="3" /> : null}
      {l.map((t, i) => (i % Math.ceil(l.length / 8) === 0 ? <text key={i} x={x(i)} y={H + 14} className="abg-lbl">{t}</text> : null))}
      {d.unit ? <text x={W / 2 + 14} y={H + 30} className="abg-axis abg-axis-name">{d.unit}</text> : null}
    </svg>
  );
}

function Legend({ d }: { d: ChartData }) {
  return (
    <ul className="abg-rows">
      {rowsOf(d.rows).map(([label, color], i) => (
        <li key={i} style={{ "--i": i } as CSSProperties}>
          <i className="abg-sw" style={{ background: color || "#ccc" }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function Quality({ d }: { d: ChartData }) {
  return (
    <ul className="abg-rows">
      {rowsOf(d.rows).map(([label, kind], i) => (
        <li key={i} style={{ "--i": i } as CSSProperties}>
          <i className={`abg-q abg-q-${kind === "bad" ? "bad" : "good"}`} aria-hidden="true">
            {kind === "bad" ? "!" : "✓"}
          </i>
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * One chart on its white card. Animated charts carry data-animate on the live page, and the site
 * script adds "in" when they scroll into view; in the editor they play as soon as they are drawn
 * (and again when the animation settings change): it runs once, so the board lets it play
 * ([data-motion="keep"]) where other site motion is paused.
 */
export function ChartCard({ d, className = "", editing = false, order = 0 }: { d: ChartData; className?: string; editing?: boolean; order?: number }) {
  const anim = d.animate !== false;
  const vars = anim ? ({ "--abg-dur": `${d.animateSeconds ?? 1.2}s`, "--abg-delay": `${(d.animateDelay ?? 0) + order * 0.15}s` } as CSSProperties) : undefined;
  return (
    <figure
      key={anim ? `${d.kind}-${d.animateSeconds ?? ""}-${d.animateDelay ?? ""}` : "still"}
      className={`abg abg-${d.kind}${anim ? ` abg-anim${editing ? " in" : ""}` : ""} ${className}`}
      data-animate={anim && !editing ? "" : undefined}
      data-motion={anim && editing ? "keep" : undefined}
      style={vars}
    >
      {d.title ? <figcaption className="abg-title">{d.title}</figcaption> : null}
      {d.kind === "bars" ? <Bars d={d} /> : d.kind === "lines" ? <Lines d={d} /> : d.kind === "legend" ? <Legend d={d} /> : <Quality d={d} />}
    </figure>
  );
}

export const chartCss = `
.abg{display:flex;flex-direction:column;gap:10px;margin:0;padding:16px 18px;border-radius:14px;background:#fff;box-shadow:0 1px 2px rgba(23,41,62,.06),0 10px 30px rgba(23,41,62,.10);color:#17293E;font-family:"Nunito Sans",ui-sans-serif,system-ui,sans-serif}
.abg-title{font-size:17px;font-weight:700;text-align:center}
.abg-svg{display:block;width:100%;height:auto;overflow:visible}
.abg-grid{stroke:#E6EBF1;stroke-width:1}
.abg-val{font-size:10px;font-weight:700;fill:#17293E;text-anchor:middle}
.abg-lbl{font-size:10px;fill:#5A6573;text-anchor:middle}
.abg-axis{font-size:9px;fill:#8A94A1;text-anchor:end}
.abg-axis-name{text-anchor:middle}
.abg-rows{display:flex;flex-direction:column;gap:7px;margin:0;padding:0;list-style:none;font-size:13px}
.abg-rows li{display:flex;align-items:center;gap:8px}
.abg-sw{display:inline-block;width:26px;height:10px;border-radius:2px}
.abg-q{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;color:#fff;font:700 10px/1 system-ui;font-style:normal}
.abg-q-good{background:#22A35A}.abg-q-bad{background:#D93636}
.abg-bar{transform-box:fill-box;transform-origin:50% 100%}
@media (prefers-reduced-motion:no-preference){
html.js .abg-anim:not(.in) .abg-bar{transform:scaleY(0)}
html.js .abg-anim:not(.in) .abg-draw{clip-path:inset(-12px 100% -12px -12px)}
html.js .abg-anim:not(.in) .abg-late,html.js .abg-anim:not(.in) .abg-rows li{opacity:0}
.abg-anim.in .abg-bar{animation:abg-grow var(--abg-dur) cubic-bezier(.2,.8,.2,1) calc(var(--abg-delay) + var(--i,0) * var(--abg-dur) * .08) both}
.abg-anim.in .abg-draw{animation:abg-draw calc(var(--abg-dur) * 1.4) cubic-bezier(.45,.05,.25,1) var(--abg-delay) both}
.abg-anim.in .abg-late{animation:abg-fade calc(var(--abg-dur) * .4) ease calc(var(--abg-delay) + var(--abg-dur) * .7 + var(--i,0) * var(--abg-dur) * .08) both}
.abg-anim.in .abg-dot{transform-box:fill-box;transform-origin:50% 50%;animation:abg-pop calc(var(--abg-dur) * .4) cubic-bezier(.3,1.6,.5,1) calc(var(--abg-delay) + var(--abg-dur) * 1.3) both}
.abg-anim.in .abg-rows li{animation:abg-in calc(var(--abg-dur) * .6) cubic-bezier(.2,.8,.2,1) calc(var(--abg-delay) + var(--i,0) * var(--abg-dur) * .15) both}
.abg-anim.in .abg-sw{transform-origin:0 50%;animation:abg-widen var(--abg-dur) cubic-bezier(.2,.8,.2,1) calc(var(--abg-delay) + var(--i,0) * var(--abg-dur) * .15) both}
}
@keyframes abg-grow{from{transform:scaleY(0)}}
@keyframes abg-draw{from{clip-path:inset(-12px 100% -12px -12px)}to{clip-path:inset(-12px -12px -12px -12px)}}
@keyframes abg-fade{from{opacity:0}}
@keyframes abg-pop{from{opacity:0;transform:scale(0)}}
@keyframes abg-in{from{opacity:0;transform:translateX(-10px)}}
@keyframes abg-widen{from{transform:scaleX(0)}}
`;

/** Starting data for each kind, as the app shows them on aerobotics.com. */
export const SAMPLE_CHARTS: Record<(typeof CHART_KINDS)[number], ChartData> = {
  bars: { kind: "bars", title: "Forecasted size", labels: "Count 128, Count 113, Count 88, Count 72, Count 56, Count 48", values: "6, 14, 27, 30, 18, 9", color: "#F5A623", showValues: true, unit: "%", rows: "" },
  lines: {
    kind: "lines",
    title: "Growth tracking & forecasting",
    labels: "Week 40, 42, 44, 46, 48, 50, 52, 2, 4, 6, 8",
    values: "This season | #2BB3C0 | 24, 31, 38, 44, 49, 53, 56, ~58, 60, 61, 62\nLast season | #3D8B5A | 22, 28, 35, 41, 46, 50, 53, 55, 56, 57, 57",
    color: "",
    showValues: false,
    unit: "Size (mm)",
    rows: "",
  },
  legend: { kind: "legend", title: "Color", labels: "", values: "", color: "", showValues: false, unit: "", rows: "Green | #A3BE3C\nColor break | #E8D44D\nFull color | #F0A030" },
  quality: { kind: "quality", title: "Quality", labels: "", values: "", color: "", showValues: false, unit: "", rows: "95% unblemished | good\n5% blemished | bad" },
};
export const SIZE_BARS: ChartData = { ...SAMPLE_CHARTS.bars, title: "Size", labels: "Under, 113, 88, 72, 56, Over", values: "8, 20, 32, 37, 24, 15", color: "#0B3A75", showValues: false, unit: "" };
