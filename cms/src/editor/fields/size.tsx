import type { CustomField } from "@puckeditor/core";
import { sizeAt } from "../../components/aoost/frames";
import { updateNode } from "../../model/page-ops";
import { overridesAt, REFERENCE, resetAt, resolve, setOnly } from "../../responsive/resolve";
import { DEFAULT_ITEM_SIZE, type Breakpoint, type ItemSize, type Node, type Responsive } from "../../schema";
import { itemPathOfField, itemSizeOf, withSlotSize, type SlotPath } from "../canvas/slots";
import { withItemKey } from "../../components/aoost/frames";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { OverrideLabel } from "./ResponsiveEditor";
import { ScrubNumber } from "./ScrubField";

export const SIZE_MIN = 0.4;
export const SIZE_MAX = 2.5;
export const clampScale = (n: number) => Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, n)) * 100) / 100;

/** A size that is full size everywhere is stored as no size at all, so the item reads as it did before. */
const tidy = (r: Responsive<ItemSize>): Responsive<ItemSize> | undefined =>
  !r.desktop && !r.tablet && !r.widescreen && r.base.scale === 1 && r.base.x == null && r.base.y == null ? undefined : r;

/** Change one item's size at the active breakpoint (or with `fn`), as one undo step or merged while dragging. */
export function editItemSize(nodeId: string, path: SlotPath, fn: (r: Responsive<ItemSize>, bp: Breakpoint) => Responsive<ItemSize>, what = "Resize piece") {
  const { pageId, bp } = getState();
  updatePage(pageId, (p) => updateNode(p, nodeId, (n) => withSlotSize(n, path, tidy(fn(itemSizeOf(n, path) ?? { base: DEFAULT_ITEM_SIZE }, bp)))), what);
}

/** Place an item (its centre, as fractions of the table) at the active breakpoint only. */
export const setItemPlace = (nodeId: string, path: SlotPath, x: number, y: number) =>
  editItemSize(
    nodeId,
    path,
    (r, bp) => {
      const at = { x: Math.round(Math.min(1, Math.max(0, x)) * 10000) / 10000, y: Math.round(Math.min(1, Math.max(0, y)) * 10000) / 10000 };
      // Placing on mobile mustn't move the piece on the bigger sizes, which inherit from it: they stay automatic.
      if (bp === "mobile" && r.desktop?.x === undefined && typeof r.base.x !== "number") r = { ...r, desktop: { ...(r.desktop ?? {}), x: null, y: null } };
      return setOnly(r, bp, at);
    },
    "Move piece",
  );

/** Let the table place an item again at the active breakpoint (the other sizes keep theirs). */
export const clearItemPlace = (nodeId: string, path: SlotPath) =>
  editItemSize(
    nodeId,
    path,
    (r, bp) => {
      const strip = <T extends Partial<ItemSize> | undefined>(v: T) => (v ? (({ x: _x, y: _y, ...rest }) => rest)(v) : v);
      if (bp === "mobile") {
        // desktop may only be inheriting the base's spot: give it its own copy before the base forgets it
        const desk = r.desktop?.x === undefined && typeof r.base.x === "number" ? { ...(r.desktop ?? {}), x: r.base.x, y: r.base.y } : r.desktop;
        return { ...r, base: strip(r.base) as ItemSize, ...(desk ? { desktop: desk } : {}) };
      }
      return { ...r, [bp === "desktop" ? "desktop" : bp]: strip(r[bp === "desktop" ? "desktop" : bp]) };
    },
    "Let the table place the piece",
  );

/** Set plain keys on a content item (a fixture's x, y, width): shared by every size; one undo step or merged while dragging. */
export function setItemKeys(nodeId: string, path: SlotPath, patch: Record<string, number>, what: string) {
  const { pageId } = getState();
  updatePage(pageId, (p) => updateNode(p, nodeId, (n) => ({ ...n, content: Object.entries(patch).reduce((c, [k, v]) => withItemKey(c, path, k, v), n.content) })), what);
}

/** Set an item's scale at the active breakpoint only. */
export const setItemScale = (nodeId: string, path: SlotPath, scale: number) => editItemSize(nodeId, path, (r, bp) => setOnly(r, bp, { scale: clampScale(scale) }));

function useSelectedNode(): Node | null {
  const id = useEditor((s) => s.selection[0]);
  const page = useEditor(currentPage);
  if (!id) return null;
  for (const s of page.sections) for (const n of s.children) if (n.id === id) return n;
  return null;
}

/**
 * A content item's size on this screen size, as a percentage (drag the glyph to scrub; the drag is one
 * undo step). A size that differs from the one this size inherits tints the row, and the label offers
 * "Reset to …" and "Use on all sizes", like every other per-size value.
 */
function SizeField({ name, label }: { name: string; label: string }) {
  const node = useSelectedNode();
  const bp = useEditor((s) => s.bp);
  const path = itemPathOfField(name);
  if (!node || !path) return null;
  const size = itemSizeOf(node, path);
  const pct = Math.round(sizeAt(size, bp).scale * 100);
  const over = !!size && overridesAt(size, bp).length > 0;
  const from = REFERENCE[bp] ?? "desktop";
  return (
    <div className={`ed-field ed-sizefield${over ? " is-over" : ""}`}>
      {over ? (
        <OverrideLabel
          label={label}
          bp={bp}
          reference={`${Math.round(sizeAt(size, from).scale * 100)}%`}
          onReset={() => editItemSize(node.id, path, (r, b) => resetAt(r, b), `Reset to ${from}`)}
          onUseEverywhere={() => editItemSize(node.id, path, (r, b) => ({ base: { ...DEFAULT_ITEM_SIZE, ...resolve(r, b) } }), "Use on all sizes")}
        />
      ) : (
        <span className="ed-field-label" title={label}>
          {label}
        </span>
      )}
      <ScrubNumber value={pct} onChange={(v) => setItemScale(node.id, path, (v ?? 100) / 100)} glyph="↔" suffix="%" min={SIZE_MIN * 100} max={SIZE_MAX * 100} step={1} ariaLabel={label} />
    </div>
  );
}

/** The size of an item that can be resized on the canvas (a project piece). Stored as `size` per screen size. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sizeField = (label: string): CustomField<any> => ({
  type: "custom",
  label,
  render: ({ name }) => <SizeField name={name} label={label} />,
});
