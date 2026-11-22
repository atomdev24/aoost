import { frameDecls, type Decls, type Sheet } from "../../responsive/css";
import { resolve } from "../../responsive/resolve";
import { DEFAULT_FRAME_FIT, DEFAULT_ITEM_SIZE, type Breakpoint, type FrameFit, type ItemSize, type Responsive } from "../../schema";
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

/** The content with one key of one item replaced (or removed when undefined). Nothing else is copied. */
export function withItemKey<C>(content: C, path: (string | number)[], key: string, value: unknown): C {
  const set = (at: unknown, i: number): unknown => {
    if (i === path.length) {
      const item = { ...(at as Obj) };
      if (value !== undefined) item[key] = value;
      else delete item[key];
      return item;
    }
    const k = path[i]!;
    if (Array.isArray(at)) return at.map((x, j) => (j === k ? set(x, i + 1) : x));
    return { ...(at as Obj), [k]: set((at as Obj)[k as string], i + 1) };
  };
  return set(content, 0) as C;
}

/** The content with one item's frame replaced (or removed when undefined). */
export const withItemFrame = <C>(content: C, path: (string | number)[], frame: Responsive<FrameFit> | undefined): C => withItemKey(content, path, "frame", frame);

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

/** The size in effect at a breakpoint, complete. */
export const sizeAt = (r: Responsive<ItemSize> | undefined, bp: Breakpoint): ItemSize => ({ ...DEFAULT_ITEM_SIZE, ...(r ? resolve(r, bp) : {}) });

/**
 * A resized item grows or shrinks around its own centre (CSS `scale`, on top of the transform the
 * layout gives it), so its neighbours keep their places and it overlaps them like paper on a table.
 * Full size writes nothing.
 */
export const sizeDecls = (s: ItemSize): Decls => ({
  ...(s.scale === 1 ? {} : { scale: String(Math.round(s.scale * 1000) / 1000) }),
  // A placed item: where its centre sits, read by the table's layout (projects.js, the editor's frames).
  ...(typeof s.x === "number" && typeof s.y === "number"
    ? { "--px": String(Math.round(s.x * 10000) / 10000), "--py": String(Math.round(s.y * 10000) / 10000) }
    : s.x === null
      ? { "--px": "none", "--py": "none" }
      : {}),
});

/**
 * A fixture's spot and size on one screen size. Its spot is a % of the table (--fxp/--fyp, read before
 * its shared --fx/--fy); null puts it back on the shared spot. Its size is a CSS scale on its width.
 */
export const fixtureDecls = (s: ItemSize): Decls => ({
  ...(s.scale === 1 ? {} : { scale: String(Math.round(s.scale * 1000) / 1000) }),
  ...(typeof s.x === "number" && typeof s.y === "number"
    ? { "--fxp": `${Math.round(s.x * 10000) / 100}%`, "--fyp": `${Math.round(s.y * 10000) / 100}%` }
    : s.x === null
      ? { "--fxp": "var(--fx,50%)", "--fyp": "var(--fy,50%)" }
      : {}),
});

/** One rule per framed picture: the mobile value, and each other size's in its media query (tablet and widescreen only when set). */
export function addSlotCss(sheet: Sheet, nodeId: string, slots: FrameSlot[]) {
  for (const s of slots) {
    if (s.box && s.size) {
      const z = s.size;
      const d = s.fixture ? fixtureDecls : sizeDecls;
      const extra = { tablet: z.tablet ? d(sizeAt(z, "tablet")) : undefined, widescreen: z.widescreen ? d(sizeAt(z, "widescreen")) : undefined };
      sheet.add(`.n-${nodeId} ${s.box}`, d(sizeAt(z, "mobile")), d(sizeAt(z, "desktop")), extra);
    }
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
  slot: (item: T, i: number, k: number) => Omit<FrameSlot, "frame" | "size"> | null,
): FrameSlot[] {
  const out: FrameSlot[] = [];
  let k = 0;
  items.forEach((item, i) => {
    if (!shown(item)) return;
    k++;
    const s = slot(item, i, k);
    if (s) out.push({ ...s, frame: item.frame as Responsive<FrameFit> | undefined, ...(s.box ? { size: item.size as Responsive<ItemSize> | undefined } : {}) });
  });
  return out;
}
