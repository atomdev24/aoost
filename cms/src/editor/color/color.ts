/** Colour maths for the picker: parse CSS colours, convert between RGB, HSV and HSL, and format them. */
export type RGBA = { r: number; g: number; b: number; a: number };
export type HSV = { h: number; s: number; v: number };
export type HSL = { h: number; s: number; l: number };
export type ColorFormat = "hex" | "rgb" | "hsl";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

function num(part: string, max: number): number {
  const p = part.trim();
  return p.endsWith("%") ? (parseFloat(p) / 100) * max : parseFloat(p);
}

/** Parse hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba() and hsl()/hsla(). Null for anything else. */
export function parseColor(input: string | undefined): RGBA | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round(n(6) / 255, 3) : 1 };
  }
  const fn = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const a = parts[3] !== undefined ? clamp(num(parts[3], 1), 0, 1) : 1;
  if (fn[1]!.startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map((p) => clamp(Math.round(num(p, 255)), 0, 255)) as [number, number, number];
    return [r, g, b].some(Number.isNaN) ? null : { r, g, b, a };
  }
  const h = parseFloat(parts[0]!);
  const sat = parseFloat(parts[1]!) / 100;
  const l = parseFloat(parts[2]!) / 100;
  if ([h, sat, l].some(Number.isNaN)) return null;
  return { ...hslToRgb({ h, s: sat * 100, l: l * 100 }), a };
}

export function rgbToHsv({ r, g, b }: Omit<RGBA, "a">): HSV {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? (d / max) * 100 : 0, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: HSV): Omit<RGBA, "a"> {
  const S = s / 100;
  const V = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((V - V * S * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return { r: f(5), g: f(3), b: f(1) };
}

export function rgbToHsl({ r, g, b }: Omit<RGBA, "a">): HSL {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): Omit<RGBA, "a"> {
  const S = s / 100;
  const L = l / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return { r: f(0), g: f(8), b: f(4) };
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

/** "#rrggbb", or "#rrggbbaa" when the colour is see-through. This is what the picker stores. */
export function toHex({ r, g, b, a }: RGBA): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ""}`;
}

/** The colour written in one format, without the alpha (the picker shows opacity separately). */
export function formatColor(c: RGBA, format: ColorFormat): string {
  if (format === "hex") return toHex({ ...c, a: 1 }).slice(1).toUpperCase();
  if (format === "rgb") return `${c.r}, ${c.g}, ${c.b}`;
  const { h, s, l } = rgbToHsl(c);
  return `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
}

/** Read what was typed in a format's box back into a colour (alpha kept). */
export function parseFormatted(text: string, format: ColorFormat, alpha: number): RGBA | null {
  const t = text.trim();
  if (format === "hex") {
    const c = parseColor(t.startsWith("#") ? t : `#${t}`);
    return c ? { ...c, a: t.replace("#", "").length === 8 || t.replace("#", "").length === 4 ? c.a : alpha } : null;
  }
  const c = parseColor(`${format}(${t.replace(/%/g, format === "hsl" ? "%" : "")})`);
  return c ? { ...c, a: alpha } : null;
}

export const sameColor = (a: RGBA | null, b: RGBA | null) => !!a && !!b && toHex(a) === toHex(b);
