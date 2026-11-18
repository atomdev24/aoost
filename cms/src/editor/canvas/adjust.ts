import type { FrameFit } from "../../schema";

/**
 * InDesign-style "adjust image" maths. The picture sits in its frame with
 * object-fit (cover for Fill and Free, contain for Fit) at the focal point;
 * Free adds translate(pan%) scale(zoom) around the focal point. These
 * functions work in the frame's own pixels.
 */
export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Where the whole picture is drawn, relative to the frame's top-left corner. */
export function imageRect(f: FrameFit, frame: Size, natural: Size): Rect {
  const s = f.fit === "fit" ? Math.min(frame.w / natural.w, frame.h / natural.h) : Math.max(frame.w / natural.w, frame.h / natural.h);
  const iw = natural.w * s;
  const ih = natural.h * s;
  const x = (frame.w - iw) * (f.focalX / 100);
  const y = (frame.h - ih) * (f.focalY / 100);
  if (f.fit !== "free") return { x, y, w: iw, h: ih };
  const ox = (frame.w * f.focalX) / 100;
  const oy = (frame.h * f.focalY) / 100;
  return { x: ox + (x - ox) * f.zoom + (f.panX / 100) * frame.w, y: oy + (y - oy) * f.zoom + (f.panY / 100) * frame.h, w: iw * f.zoom, h: ih * f.zoom };
}

/** Move the picture by (dx, dy) frame pixels: the focal point in Fill and Fit, the pan in Free. */
export function dragImage(f: FrameFit, frame: Size, natural: Size, dx: number, dy: number): FrameFit {
  if (f.fit === "free") return { ...f, panX: r2(clamp(f.panX + (dx / frame.w) * 100, -500, 500)), panY: r2(clamp(f.panY + (dy / frame.h) * 100, -500, 500)) };
  const r = imageRect(f, frame, natural);
  const slackX = frame.w - r.w;
  const slackY = frame.h - r.h;
  const focalX = Math.abs(slackX) < 0.5 ? f.focalX : clamp(((r.x + dx) / slackX) * 100, 0, 100);
  const focalY = Math.abs(slackY) < 0.5 ? f.focalY : clamp(((r.y + dy) / slackY) * 100, 0, 100);
  return { ...f, focalX: Math.round(focalX * 10) / 10, focalY: Math.round(focalY * 10) / 10 };
}

/** Scale the picture. Scaling needs Free mode, which starts out looking exactly like Fill. */
export function scaleImage(f: FrameFit, factor: number): FrameFit {
  const base = f.fit === "free" ? f : { ...f, fit: "free" as const, zoom: 1, panX: 0, panY: 0 };
  return { ...base, zoom: r2(clamp(base.zoom * factor, 0.2, 10)) };
}
