import { z } from "zod";

/**
 * Reference images on the editor board: pictures dropped beside the frames for inspiration or
 * mock-ups. They are saved per page for the editor only, never in the site's content, so they
 * can never be published.
 */
export const RefItem = z.object({
  id: z.string().min(1).max(64),
  /** A media library URL (/media/…) or another https image. Empty for a parked block. */
  src: z.string().max(2000).refine((s) => s === "" || s.startsWith("/") || s.startsWith("https://"), "an image URL"),
  /**
   * A block taken off the page and parked on the board, drawn live as it looks on the page (board/
   * ParkedBlock.tsx): the block itself, the section it came from (its kind and layout, with no
   * other blocks) and the screen size it was taken from. Never published; put back by dragging it
   * onto a frame.
   */
  node: z.record(z.string(), z.unknown()).optional(),
  section: z.record(z.string(), z.unknown()).optional(),
  bp: z.enum(["mobile", "tablet", "desktop", "widescreen"]).optional(),
  /** Top-left corner and size in board (world) pixels. */
  x: z.number().finite().min(-200_000).max(200_000),
  y: z.number().finite().min(-200_000).max(200_000),
  w: z.number().finite().min(8).max(20_000),
  h: z.number().finite().min(8).max(20_000),
});
export type RefItem = z.infer<typeof RefItem>;

export const RefList = z.array(RefItem).max(500);

/** Accept a list from a client: valid items kept in order, anything malformed dropped. */
export function cleanRefs(input: unknown): RefItem[] {
  if (!Array.isArray(input)) return [];
  const out: RefItem[] = [];
  const seen = new Set<string>();
  for (const raw of input.slice(0, 500)) {
    const r = RefItem.safeParse(raw);
    // A reference needs a picture or a parked block, and a parked block stays under 200 KB.
    if (r.success && !seen.has(r.data.id) && (r.data.src || r.data.node) && JSON.stringify(r.data).length < 200_000) {
      seen.add(r.data.id);
      out.push(r.data);
    }
  }
  return out;
}

/** Fit a picture of natural size nw×nh to at most `max` on its long edge, centred on (cx, cy). */
export function placeRef(id: string, src: string, cx: number, cy: number, nw = 800, nh = 800, max = 600): RefItem {
  const s = Math.min(1, max / Math.max(nw || max, nh || max));
  const w = Math.max(8, Math.round((nw || max) * s));
  const h = Math.max(8, Math.round((nh || max) * s));
  return { id, src, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h };
}
