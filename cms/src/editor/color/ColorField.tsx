import { useEffect, useMemo, useRef, useState } from "react";
import type { Page } from "../../schema";
import { beginGesture, currentPage, endGesture, useEditor } from "../store";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { formatColor, hsvToRgb, parseColor, parseFormatted, rgbToHsv, toHex, type ColorFormat, type HSV, type RGBA } from "./color";

const FORMAT_KEY = "aoost.colorFormat";
const readFormat = (): ColorFormat => {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(FORMAT_KEY) : null;
  return v === "rgb" || v === "hsl" ? v : "hex";
};

/** A stored colour (a CSS colour or "token:name") as RGBA, using the theme for tokens. */
export function useResolve() {
  const colors = useEditor((s) => s.site.theme.colors);
  return (value: string | undefined): RGBA | null => {
    if (!value) return null;
    const raw = value.startsWith("token:") ? colors[value.slice(6)] : value;
    return parseColor(raw) ?? cssColor(raw);
  };
}

/** Anything the browser understands ("rebeccapurple", "color(...)"), normalised through a canvas. */
function cssColor(raw: string | undefined): RGBA | null {
  if (!raw || typeof document === "undefined") return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = raw;
  return ctx.fillStyle === "#010203" && raw.toLowerCase() !== "#010203" ? null : parseColor(ctx.fillStyle);
}

/** Every colour set on a page's blocks and sections, most used first. */
export function pageColors(page: Page): string[] {
  const count = new Map<string, number>();
  const add = (v: unknown) => typeof v === "string" && v && count.set(v, (count.get(v) ?? 0) + 1);
  const style = (s: Record<string, unknown> | undefined) => {
    if (!s) return;
    add(s.background);
    add(s.color);
    add((s.border as { color?: string } | undefined)?.color);
    const f = s.filter as { dark?: string; light?: string } | undefined;
    add(f?.dark);
    add(f?.light);
  };
  const node = (n: Page["sections"][number]["children"][number]) => {
    style(n.style.base as Record<string, unknown>);
    style(n.style.desktop as Record<string, unknown> | undefined);
  };
  for (const s of page.sections) {
    for (const l of [s.layout.base, s.layout.desktop]) {
      add(l?.background?.color);
      add(l?.background?.overlay);
    }
    s.children.forEach(node);
  }
  page.overlays.forEach((o) => node(o.node));
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/**
 * A colour row: swatch, value and opacity. Clicking the swatch opens the
 * full picker. The value can be a theme colour ("token:ink") or any CSS
 * colour; the picker writes hex ("#rrggbb", or "#rrggbbaa" when see-through).
 */
export function ColorField({ value, onChange, label }: { value: string | undefined; onChange: (v: string | undefined) => void; label: string }) {
  const resolve = useResolve();
  const [open, setOpen] = useState<Anchor | null>(null);
  const c = resolve(value);
  const token = value?.startsWith("token:") ? value.slice(6) : null;
  const [text, setText] = useState("");
  const shown = value === undefined ? "" : token ? token : c ? formatColor(c, "hex") : value;
  useEffect(() => setText(shown), [shown]);
  const commitText = (t: string) => {
    const v = t.trim();
    if (!v) return onChange(undefined);
    if (v === shown) return;
    const parsed = parseFormatted(v, "hex", c?.a ?? 1) ?? parseColor(v) ?? cssColor(v);
    if (parsed) onChange(toHex(parsed));
    else setText(shown);
  };
  const alpha = c ? Math.round(c.a * 100) : 100;
  return (
    <span className="ed-colorrow">
      <button
        type="button"
        className="ed-colorrow-swatch"
        aria-label={`${label}: open colour picker`}
        aria-haspopup="dialog"
        aria-expanded={!!open}
        onClick={(e) => setOpen(open ? null : anchorOf(e.currentTarget.closest(".ed-colorrow")!))}
      >
        <span style={{ background: value === undefined ? "transparent" : (c ? toHex(c) : value) }} className={value === undefined ? "is-none" : undefined} />
      </button>
      <input
        className="ed-colorrow-value"
        aria-label={label}
        value={text}
        placeholder="None"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commitText(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitText(text);
          if (e.key === "Escape") setText(shown);
        }}
      />
      <span className="ed-colorrow-alpha" aria-label={`${label} opacity`}>
        {value === undefined ? "" : `${alpha}%`}
      </span>
      {open ? <ColorPopover anchor={open} value={value} onChange={onChange} onClose={() => setOpen(null)} label={label} /> : null}
    </span>
  );
}

/** Track a drag on an element as 0..1 fractions; the whole drag is one undo step. */
function drag(e: React.PointerEvent<HTMLElement>, onMove: (fx: number, fy: number) => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  const el = e.currentTarget;
  el.setPointerCapture(e.pointerId);
  beginGesture();
  const at = (p: { clientX: number; clientY: number }) => {
    const r = el.getBoundingClientRect();
    onMove(Math.min(1, Math.max(0, (p.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (p.clientY - r.top) / r.height)));
  };
  at(e);
  const move = (m: PointerEvent) => at(m);
  const up = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    endGesture();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

export function ColorPopover({ anchor, value, onChange, onClose, label }: { anchor: Anchor; value: string | undefined; onChange: (v: string | undefined) => void; onClose: () => void; label: string }) {
  const resolve = useResolve();
  const theme = useEditor((s) => s.site.theme.colors);
  const page = useEditor(currentPage);
  const used = useMemo(() => pageColors(page).slice(0, 14), [page]);
  const c = resolve(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  // Hue and saturation are kept here, so they survive greys and black (where RGB loses them).
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(c));
  const [alpha, setAlpha] = useState(c.a);
  const last = useRef(toHex(c));
  useEffect(() => {
    const hex = toHex(c);
    if (hex === last.current) return;
    last.current = hex;
    setHsv(rgbToHsv(c));
    setAlpha(c.a);
  }, [value]);
  const [format, setFormatState] = useState<ColorFormat>(readFormat);
  const setFormat = (f: ColorFormat) => {
    setFormatState(f);
    try {
      localStorage.setItem(FORMAT_KEY, f);
    } catch {
      /* private mode: just don't remember */
    }
  };
  const write = (next: HSV, a = alpha) => {
    setHsv(next);
    setAlpha(a);
    const hex = toHex({ ...hsvToRgb(next), a: Math.round(a * 100) / 100 });
    last.current = hex;
    onChange(hex);
  };
  const writeRgba = (rgba: RGBA) => write(rgbToHsv(rgba), rgba.a);
  const rgb = hsvToRgb(hsv);
  const solid = toHex({ ...rgb, a: 1 });
  const hueColor = toHex({ ...hsvToRgb({ h: hsv.h, s: 100, v: 100 }), a: 1 });
  const Eye = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;

  return (
    <Popover anchor={anchor} onClose={onClose} side="left" className="ed-picker" label={`${label} colour`} width={248}>
      <div
        className="ed-picker-sv"
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuetext={`${Math.round(hsv.s)}% saturation, ${Math.round(hsv.v)}% brightness`}
        tabIndex={0}
        style={{ background: hueColor }}
        onPointerDown={(e) => drag(e, (fx, fy) => write({ h: hsv.h, s: fx * 100, v: (1 - fy) * 100 }))}
      >
        <span className="ed-picker-knob" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: solid }} />
      </div>
      <div className="ed-picker-sliders">
        <div className="ed-picker-hue" role="slider" aria-label="Hue" aria-valuenow={Math.round(hsv.h)} aria-valuemin={0} aria-valuemax={360} tabIndex={0} onPointerDown={(e) => drag(e, (fx) => write({ ...hsv, h: Math.min(359.9, fx * 360) }))}>
          <span className="ed-picker-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }} />
        </div>
        <div
          className="ed-picker-alpha"
          role="slider"
          aria-label="Opacity"
          aria-valuenow={Math.round(alpha * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          style={{ ["--c" as string]: solid }}
          onPointerDown={(e) => drag(e, (fx) => write(hsv, Math.round(fx * 100) / 100))}
        >
          <span className="ed-picker-thumb" style={{ left: `${alpha * 100}%`, background: solid }} />
        </div>
      </div>
      <div className="ed-picker-inputs">
        {Eye ? (
          <button
            type="button"
            className="ed-picker-eye"
            aria-label="Pick a colour from the screen"
            title="Pick from the screen"
            onClick={async () => {
              try {
                const res = await new Eye().open();
                const picked = parseColor(res.sRGBHex);
                if (picked) writeRgba({ ...picked, a: alpha });
              } catch {
                /* cancelled */
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.5 2.5l3 3-1.5 1.5-3-3zM9 4L3 10v3h3l6-6M7.5 5.5l3 3" />
            </svg>
          </button>
        ) : null}
        <select className="ed-picker-format" aria-label="Colour format" value={format} onChange={(e) => setFormat(e.target.value as ColorFormat)}>
          <option value="hex">Hex</option>
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
        </select>
        <FormatInput key={format} format={format} color={{ ...rgb, a: alpha }} onChange={writeRgba} />
        <span className="ed-picker-pct">
          <input
            aria-label="Opacity percent"
            inputMode="numeric"
            defaultValue={Math.round(alpha * 100)}
            key={Math.round(alpha * 100)}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            onBlur={(e) => {
              const n = Number(e.currentTarget.value);
              if (!Number.isNaN(n)) write(hsv, Math.min(100, Math.max(0, n)) / 100);
            }}
          />
          %
        </span>
      </div>
      {used.length ? <Swatches title="On this page" values={used} resolve={resolve} current={value} onPick={onChange} theme={theme} /> : null}
      {Object.keys(theme).length ? <Swatches title="Site colours" values={Object.keys(theme).map((k) => `token:${k}`)} resolve={resolve} current={value} onPick={onChange} theme={theme} /> : null}
      <div className="ed-picker-foot">
        <button type="button" className="ed-link" onClick={() => onChange(undefined)}>
          No colour
        </button>
      </div>
    </Popover>
  );
}

/** The colour typed in the chosen format. Enter or leaving the box applies it. */
function FormatInput({ format, color, onChange }: { format: ColorFormat; color: RGBA; onChange: (c: RGBA) => void }) {
  const shown = formatColor(color, format);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const apply = () => {
    if (text === shown) return;
    const c = parseFormatted(text, format, color.a);
    if (c) onChange(c);
    else setText(shown);
  };
  return (
    <input
      className="ed-picker-value"
      aria-label={format === "hex" ? "Hex value" : format === "rgb" ? "RGB value" : "HSL value"}
      value={text}
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === "Enter") apply();
      }}
    />
  );
}

function Swatches({ title, values, resolve, current, onPick, theme }: { title: string; values: string[]; resolve: (v: string) => RGBA | null; current: string | undefined; onPick: (v: string) => void; theme: Record<string, string> }) {
  return (
    <div className="ed-picker-swatches">
      <span className="ed-picker-title">{title}</span>
      <div role="list" aria-label={title}>
        {values.map((v) => {
          const c = resolve(v);
          const name = v.startsWith("token:") ? v.slice(6) : v;
          return (
            <button
              key={v}
              type="button"
              role="listitem"
              className="ed-picker-swatch"
              aria-label={`Use ${name}`}
              aria-pressed={current === v}
              title={v.startsWith("token:") ? `${name} · ${theme[name]}` : name}
              style={{ background: c ? toHex(c) : v }}
              onClick={() => onPick(v)}
            />
          );
        })}
      </div>
    </div>
  );
}
