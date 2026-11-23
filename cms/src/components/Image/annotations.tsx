import type { CSSProperties, ReactElement } from "react";
import { z } from "zod";

/**
 * Fruit annotations: readings drawn on top of a picture, like the TrueFruit
 * scanner overlay. Each mark circles a fruit and a frosted label gives its
 * reading (size in mm, colour stage). They play in when the picture scrolls
 * into view (runtime/annotations.ts); the editor shows them settled.
 */
export const FRUIT_COLOURS = { green: { label: "Green", swatch: "#6aa53a" }, break: { label: "Colour break", swatch: "#d4c233" }, mostly: { label: "Mostly orange", swatch: "#f0a030" }, orange: { label: "Orange", swatch: "#f28a1c" } } as const;
export const Mark = z.object({
  /** Centre, in percent of the picture's frame. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  /** Radius, in percent of the frame's width. */
  r: z.number().min(1).max(40),
  size: z.number().min(0).max(999),
  colour: z.enum(["green", "break", "mostly", "orange"]),
  /** Which side of the fruit the label sits. */
  side: z.enum(["right", "left"]),
  /** The colour callout's block, when it should differ from the stage's usual colour. */
  swatch: z.string().optional(),
  /** The colour callout's words, when they should differ from the stage's name. */
  colourText: z.string().optional(),
});
export type Mark = z.infer<typeof Mark>;
export const MARK_STYLES = ["ring", "brackets", "pulse"] as const;
export const NEW_MARK: Mark = { x: 50, y: 50, r: 8, size: 68, colour: "break", side: "right" };

const ring = (
  <svg className="ann-shape" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="47" pathLength="100" />
  </svg>
);
const brackets = (
  <svg className="ann-shape" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M2 24V2h22M76 2h22v22M98 76v22H76M24 98H2V76" />
  </svg>
);

/** A label's size: fixed, or growing and shrinking with its ring (the default ring is 8% of the width). */
export const labelScale = (r: number, grow: boolean) => (grow ? Math.round(Math.min(2.2, Math.max(0.6, r / 8)) * 100) / 100 : 1);

export function ReadingChips({ size, colour, swatch, text }: { size: number; colour: keyof typeof FRUIT_COLOURS; swatch?: string; text?: string }): ReactElement {
  const c = FRUIT_COLOURS[colour];
  return (
    <span className="ann-chips">
      <span className="ann-chip">
        <small>Size</small>
        <b data-count={size}>{size}</b> mm
      </span>
      <span className="ann-chip">
        <small>Colour</small>
        <span className="ann-sw" style={{ background: swatch || c.swatch }} />
        <b>{text?.trim() || c.label}</b>
      </span>
    </span>
  );
}

export function Annotations({ marks, style, editing, grow = false, delay }: { marks: Mark[]; style: (typeof MARK_STYLES)[number]; editing: boolean; grow?: boolean; delay?: number }): ReactElement | null {
  if (!marks.length) return null;
  const sorted = marks.map((m, i) => ({ m, i }));
  return (
    <div className={`ann ann-${style}${editing ? " in ann-edit" : ""}`} data-ann="" data-delay={delay ? String(delay) : undefined} aria-hidden="true">
      {sorted.map(({ m, i }) => {
        return (
          <span key={i} className={`ann-m ann-${m.side === "left" || m.x > 74 ? "left" : "right"}`} data-ann-i={i} style={{ left: `${m.x}%`, top: `${m.y}%`, "--r": `${m.r}cqw`, "--d": `${i * 0.65}s`, "--ls": labelScale(m.r, grow) } as CSSProperties}>
            {style === "ring" ? ring : style === "brackets" ? brackets : <span className="ann-dot" />}
            {style === "brackets" ? <span className="ann-scan" /> : null}
            <ReadingChips size={m.size} colour={m.colour} swatch={m.swatch} text={m.colourText} />
            {editing ? <i className="ann-h" data-ann-h="" title="Drag to resize" /> : null}
          </span>
        );
      })}
    </div>
  );
}

export const annotationCss = `
.ann{position:absolute;inset:0;z-index:2;container-type:inline-size;pointer-events:none;font-family:var(--font-body)}
.ann-m{position:absolute;width:calc(var(--r)*2);height:calc(var(--r)*2);translate:-50% -50%}
.ann-shape{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ann-ring circle{fill:rgba(255,255,255,.08);stroke:#fff;stroke-width:3.5;stroke-dasharray:106;stroke-dashoffset:106}
.ann-brackets path{fill:none;stroke:#fff;stroke-width:3px;stroke-linecap:round;vector-effect:non-scaling-stroke;opacity:0;scale:1.5;transform-origin:50% 50%}
.ann-scan{position:absolute;left:0;right:0;top:0;height:3px;border-radius:2px;background:rgba(255,255,255,.85);opacity:0}
.ann-dot{position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px;border-radius:50%;background:#fff;box-shadow:0 0 0 0 rgba(255,255,255,.7);opacity:0}
.ann-chips{position:absolute;bottom:calc(100% + 6px);left:calc(100% - 6px);display:flex;flex-direction:column;align-items:flex-start;gap:5px;scale:var(--ls,1);transform-origin:0 100%}
.ann-left .ann-chips{left:auto;right:calc(100% - 6px);align-items:flex-end;transform-origin:100% 100%}
.ann-chip{position:relative;padding:6px 10px 7px;border:1px solid rgba(255,255,255,.35);border-radius:10px;background:rgba(16,24,20,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;font-size:11px;line-height:1.25;white-space:nowrap;opacity:0;translate:0 6px;transition:opacity .35s ease,translate .35s cubic-bezier(.2,.8,.2,1)}
.ann-chip small{display:block;font-size:9.5px;opacity:.7}
.ann-chip b{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.ann-sw{display:inline-block;width:8px;height:8px;margin-right:5px;border-radius:2px}
.ann-ring.in circle{transition:stroke-dashoffset .7s ease var(--d);stroke-dashoffset:0}
.ann-brackets.in path{transition:scale .45s cubic-bezier(.2,.8,.2,1) var(--d),opacity .3s var(--d);scale:1;opacity:1}
.ann.in .ann-scan{animation:ann-scan .6s ease-in-out calc(var(--d) + .3s) both}
.ann.in .ann-dot{opacity:1;transition:opacity .2s var(--d);animation:ann-pulse 1.1s ease-out var(--d) 2}
.ann.in .ann-chip{opacity:1;translate:0 0;transition-delay:calc(var(--d) + .6s)}
.ann.in .ann-chip+.ann-chip{transition-delay:calc(var(--d) + .8s)}
@keyframes ann-scan{0%{opacity:1;top:0}90%{opacity:1}100%{opacity:0;top:calc(100% - 3px)}}
@keyframes ann-pulse{to{box-shadow:0 0 0 calc(var(--r) - 6px) rgba(255,255,255,0)}}
.ann-edit .ann-m{pointer-events:auto!important;cursor:grab}
.ann-h{pointer-events:auto!important;position:absolute;left:100%;top:50%;width:calc(14px * var(--ed-px,1));height:calc(14px * var(--ed-px,1));margin:calc(-7px * var(--ed-px,1));border:calc(2px * var(--ed-px,1)) solid #0A84FF;border-radius:50%;background:#fff;cursor:ew-resize;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.ann-edit .ann-m:active{cursor:grabbing}
@media (prefers-reduced-motion:reduce){.ann *{transition:none!important;animation:none!important}}
`;
