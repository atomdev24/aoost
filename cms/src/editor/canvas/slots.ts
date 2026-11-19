import { itemAt, withItemFrame, withItemKey } from "../../components/aoost/frames";
import { getComponent } from "../../components/registry";
import type { FrameSlot } from "../../components/types";
import type { FrameFit, ItemSize, Node, Responsive } from "../../schema";

/**
 * Editor helpers for pictures framed inside a block's content (the aoost blocks' frame slots).
 * A slot is addressed by its node id and the path to its content item, e.g. ["reel", 1].
 */
export type SlotPath = (string | number)[];

export const samePath = (a: SlotPath, b: SlotPath) => a.length === b.length && a.every((k, i) => String(k) === String(b[i]));

/** The block's content with its defaults filled in, as the page renders it. */
const contentOf = (node: Node) => ({ ...(getComponent(node.type)?.defaults.content as object), ...node.content });

/** Every framable picture in a block (none for blocks without frame slots). */
export function nodeSlots(node: Node): FrameSlot[] {
  const def = getComponent(node.type);
  return def?.frames ? def.frames(contentOf(node)) : [];
}

export const slotOf = (node: Node, path: SlotPath) => nodeSlots(node).find((s) => samePath(s.path, path)) ?? null;

/** The block with one picture's frame replaced (undefined removes it). */
export function withSlotFrame(node: Node, path: SlotPath, frame: Responsive<FrameFit> | undefined): Node {
  // Content that still relies on the block's defaults for this list gets them written out first.
  const content = itemAt(node.content, path) ? node.content : contentOf(node);
  return { ...node, content: withItemFrame(content, path, frame) };
}

/** The block with one item's size replaced (undefined removes it, so the item is stored as before). */
export function withSlotSize(node: Node, path: SlotPath, size: Responsive<ItemSize> | undefined): Node {
  const content = itemAt(node.content, path) ? node.content : contentOf(node);
  return { ...node, content: withItemKey(content, path, "size", size) };
}

/** An item's stored size (read from the content with defaults, so it works for any item, shown or not). */
export const itemSizeOf = (node: Node, path: SlotPath) => itemAt(contentOf(node), path)?.size as Responsive<ItemSize> | undefined;

/** A field's Puck name ("reel[0].src", "note.image") → the path of the item it belongs to. */
export function itemPathOfField(name: string | undefined): SlotPath | null {
  if (!name) return null;
  const parts = name.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(0, -1).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}

/**
 * The picture under a point (in the canvas frame's pixels) inside a block's element on the canvas.
 * Hit-tested by box rather than by event target: Puck's own layers can sit over the block. A picture's
 * box is its frame: an <img>'s parent (it may be scaled past it), a background's own element.
 */
export function slotAtPoint(node: Node, blockEl: Element, x: number, y: number): { slot: FrameSlot; el: HTMLElement } | null {
  for (const slot of nodeSlots(node)) {
    const el = blockEl.querySelector<HTMLElement>(slot.selector);
    const box = (slot.kind === "img" ? el?.parentElement : el)?.getBoundingClientRect();
    if (el && box && box.width && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return { slot, el };
  }
  return null;
}

/** Natural sizes of background pictures (an <img> knows its own). */
const sizes = new Map<string, { w: number; h: number } | "loading">();
export function naturalSize(src: string): { w: number; h: number } | null {
  const known = sizes.get(src);
  if (known && known !== "loading") return known;
  if (!known) {
    sizes.set(src, "loading");
    const img = new Image();
    img.onload = () => sizes.set(src, { w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => sizes.delete(src);
    img.src = src;
  }
  return null;
}

/** The block with one value of a content item changed (the item's alt text, say). */
export function withItemValue(node: Node, path: SlotPath, key: string, value: unknown): Node {
  const content = itemAt(node.content, path) ? node.content : contentOf(node);
  const set = (at: unknown, i: number): unknown => {
    if (i === path.length) return { ...(at as Record<string, unknown>), [key]: value };
    const k = path[i]!;
    if (Array.isArray(at)) return at.map((x, j) => (j === k ? set(x, i + 1) : x));
    return { ...(at as Record<string, unknown>), [k]: set((at as Record<string, unknown>)[k as string], i + 1) };
  };
  return { ...node, content: set(content, 0) as Node["content"] };
}
