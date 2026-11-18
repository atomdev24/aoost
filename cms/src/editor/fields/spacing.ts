/**
 * Padding and margin are stored as CSS shorthand strings ("56px 20px"). The
 * inspector edits them as two numbers, vertical and horizontal. Values it
 * can't split that way (four different sides, other units) stay as text.
 */
export type VH = { v: number; h: number };

const PX = /^(-?\d*\.?\d+)(px)?$|^0$/;

export function parseSpacing(value: string | undefined): VH | null {
  if (value === undefined || value.trim() === "") return { v: 0, h: 0 };
  const parts = value.trim().split(/\s+/);
  if (parts.length > 4 || parts.some((p) => !PX.test(p))) return null;
  const n = parts.map((p) => Number(p.replace("px", "")));
  const [t, r = t, b = t, l = r] = n as [number, number?, number?, number?];
  if (t !== b || r !== l) return null;
  return { v: t, h: r! };
}

export function formatSpacing({ v, h }: VH): string {
  return v === h ? `${v}px` : `${v}px ${h}px`;
}

/** A CSS length split into its number and unit ("auto" and empty have no number). */
export function parseLength(value: string | undefined): { n: number; unit: string } | null {
  const m = /^(-?\d*\.?\d+)(px|%|rem|em|vw|vh|svh|dvh|fr|ch)?$/.exec((value ?? "").trim());
  return m ? { n: Number(m[1]), unit: m[2] ?? "px" } : null;
}
