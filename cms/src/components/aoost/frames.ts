import { frameDecls, type Decls, type Sheet } from "../../responsive/css";
import { resolve } from "../../responsive/resolve";
import { DEFAULT_FRAME_FIT, type Breakpoint, type FrameFit, type Responsive } from "../../schema";
import type { FrameSlot } from "../types";

/**
 * Per-screen-size framing of the pictures inside the aoost blocks (hero reel, project pieces,
 * journal covers, playlist covers). Each picture item may carry an optional `frame`, the same
 * ResponsiveFrameFit the standard media blocks use. Items without one render exactly as before.
 */

type Obj = Record<string, unknown>;

/** The content item a slot's path points at. */
export function itemAt(content: unknown, path: (string | number)[]): Obj | undefined {
  let at: unknown = content;
  for (const key of path) {
    if (at === null || typeof at !== "object") return undefined;
    at = (at as Obj)[key as string];
  }
  return at !== null && typeof at === "object" ? (at as Obj) : undefined;
}

/** The content with one item's frame replaced (or removed when undefined). Nothing else is copied. */
export function withItemFrame<C>(content: C, path: (string | number)[], frame: Responsive<FrameFit> | undefined): C {
  const set = (at: unknown, i: number): unknown => {
    if (i === path.length) {
      const item = { ...(at as Obj) };
      if (frame) item.frame = frame;
      else delete item.frame;
      return item;
    }
    const key = path[i]!;
    if (Array.isArray(at)) return at.map((x, j) => (j === key ? set(x, i + 1) : x));
    return { ...(at as Obj), [key]: set((at as Obj)[key as string], i + 1) };
  };
  return set(content, 0) as C;
}

const r4 = (n: number) => `${Math.round(Math.max(0, n) * 10000) / 10000}%`;

/**
 * An <img>'s frame. Free mode also clips the picture to its own box (the aoost blocks have no
 * .frame wrapper to do it), using the inverse of the free transform: the box's edges in the
 * picture's own coordinates.
 */
export function slotImgDecls(f: FrameFit): Decls {
  const d = frameDecls(f);
  if (f.fit !== "free") return d;
  const edges = (focal: number, pan: number) => {
    const a = focal / 100;
    const p = pan / 100;
    return [(a - (a + p) / f.zoom) * 100, (1 - a - (1 - a - p) / f.zoom) * 100] as const;
  };
  const [l, r] = edges(f.focalX, f.panX);
  const [t, b] = edges(f.focalY, f.panY);
  return { ...d, "clip-path": `inset(${r4(t)} ${r4(r)} ${r4(b)} ${r4(l)})` };
}

/** A background picture's frame: the focal point, covering or fitting its box. */
export function slotBgDecls(f: FrameFit): Decls {
  return { "background-position": `${f.focalX}% ${f.focalY}%`, "background-size": f.fit === "fit" ? "contain" : "cover" };
}

/** The frame in effect at a breakpoint, complete. */
export const frameAt = (r: Responsive<FrameFit> | undefined, bp: Breakpoint): FrameFit => ({ ...DEFAULT_FRAME_FIT, ...(r ? resolve(r, bp) : {}) });

/** One rule per framed picture: the mobile value, and each other size's in its media query (tablet and widescreen only when set). */
export function addSlotCss(sheet: Sheet, nodeId: string, slots: FrameSlot[]) {
  for (const s of slots) {
    if (!s.frame) continue;
    const decls = s.kind === "bg" ? slotBgDecls : slotImgDecls;
    const f = s.frame;
    const extra = { tablet: f.tablet ? decls(frameAt(f, "tablet")) : undefined, widescreen: f.widescreen ? decls(frameAt(f, "widescreen")) : undefined };
    sheet.add(`.n-${nodeId} ${s.selector}`, decls(frameAt(f, "mobile")), decls(frameAt(f, "desktop")), extra);
  }
}

/** Number every item with a picture by its place among the shown items (1-based, for nth-child). */
export function shownSlots<T extends Obj>(
  items: T[],
  shown: (item: T) => boolean,
  slot: (item: T, i: number, k: number) => Omit<FrameSlot, "frame"> | null,
): FrameSlot[] {
  const out: FrameSlot[] = [];
  let k = 0;
  items.forEach((item, i) => {
    if (!shown(item)) return;
    k++;
    const s = slot(item, i, k);
    if (s) out.push({ ...s, frame: item.frame as Responsive<FrameFit> | undefined });
  });
  return out;
}
