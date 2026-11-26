import { locate, updateNode, updateSection } from "../../model/page-ops";
import { resolve, setOnly } from "../../responsive/resolve";
import type { Node, Section, SectionLayout, Style } from "../../schema";
import { getComponent } from "../../components/registry";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage } from "../store";
import { keepsRatio } from "./ratio";

const round = (n: number, d = 10) => Math.round(n * d) / d;

export type FlowHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const FLOW_HANDLES: FlowHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
export const FLOW_HANDLE_TIP: Record<FlowHandle, string> = {
  nw: "Drag to scale",
  ne: "Drag to scale",
  se: "Drag to scale",
  sw: "Drag to scale",
  e: "Drag to change the width",
  w: "Drag to change the width",
  n: "Drag to change the height",
  s: "Drag to change the height",
};

/** A side-by-side row: a grid whose columns have their own widths at this size. */
const rowWidths = (s: Section, bp: ReturnType<typeof getState>["bp"]): number[] | null => {
  if (s.kind !== "grid") return null;
  const l = resolve(s.layout, bp) as SectionLayout;
  return l.colWidths && l.colWidths.length === l.columns && l.columns >= 2 ? l.colWidths : null;
};

/**
 * Resize a block in a stacked or grid section from its handles, as in a design app: corners scale,
 * left and right edges change the width, top and bottom edges the height. Pictures and video keep
 * their proportions unless set to Free (or Shift is held): then the sides change the shape and the
 * picture fills its new frame. Text and other blocks get a width and a minimum height. In a
 * side-by-side row the width is the column's: dragging it moves the split between the two columns,
 * so the other side takes up the rest. Stored on the size being edited; one undo step.
 */
export function attachFlowResize(doc: Document) {
  const down = (e: PointerEvent) => {
    const handleEl = (e.target as Element | null)?.closest?.<HTMLElement>("[data-ed-flow-handle]");
    const el = handleEl?.closest<HTMLElement>("[data-node-id]");
    const id = el?.dataset.nodeId;
    if (!handleEl || !el || !id || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const page = currentPage(getState());
    const at = locate(page, id);
    if (at?.kind !== "node") return;
    const node = at.node;
    const section = at.section;
    const handle = (handleEl.dataset.edFlowHandle || "se") as FlowHandle;
    const { bp } = getState();
    const framed = !!getComponent(node.type)?.framed;
    const box = el.getBoundingClientRect();
    // The section's content box (a stack's column sits inside it).
    const inner = el.closest<HTMLElement>(".si") ?? el.parentElement!;
    const cell = inner.getBoundingClientRect();
    const cs = getComputedStyle(inner);
    const room = cell.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const widths = rowWidths(section, bp);
    // Which column the block is in: its stack in a stacks row, else its place in the grid.
    const index = section.stacks ? Math.min(section.stacks - 1, node.col ?? 0) : section.children.indexOf(node);
    // In a row, the whole content width is what the columns share (the gap stays as it is).
    const gap = parseFloat(cs.columnGap) || 0;
    const rowRoom = widths ? room - gap * (widths.length - 1) : room;
    const colStart = widths ? (rowRoom * widths.slice(0, index % widths.length).reduce((a, b) => a + b, 0)) / widths.reduce((a, b) => a + b, 0) : 0;
    const maxW = widths ? rowRoom : room;
    const free0 = !keepsRatio(node);
    const ratio = box.width / Math.max(1, box.height);
    const start = { x: e.clientX, y: e.clientY };
    const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
    const sy = handle.includes("s") ? 1 : handle.startsWith("n") ? -1 : 0;
    let w = box.width;
    let h = box.height;
    let moved = false;
    const move = (m: PointerEvent) => {
      moved = true;
      const free = framed ? free0 !== m.shiftKey : true;
      const dx = (m.clientX - start.x) * sx;
      const dy = (m.clientY - start.y) * sy;
      w = sx ? Math.max(24, Math.min(maxW - (widths ? 0 : 0), box.width + dx)) : box.width;
      h = sy ? Math.max(16, box.height + dy) : box.height;
      if (framed && !free) {
        // Keep the proportions: whichever side is pulled sets the size.
        if (sx && sy) h = w / ratio;
        else if (sy) w = Math.min(maxW, h * ratio);
        else h = w / ratio;
      }
      if (widths && (sx || framed)) {
        // A row: move the split live; the block fills its column.
        const next = splitFor(widths, index % widths.length, w, rowRoom, colStart);
        inner.style.gridTemplateColumns = next.map((x) => `minmax(0, ${x}fr)`).join(" ");
        el.style.width = "100%";
      } else el.style.width = `${w}px`;
      el.style.maxWidth = "none";
      if (framed) el.style.aspectRatio = `${w}/${h}`;
      else if (sy) el.style.minHeight = `${h}px`;
    };
    const up = () => {
      doc.removeEventListener("pointermove", move, true);
      doc.removeEventListener("pointerup", up, true);
      if (!moved) return;
      const shown = resolve(node.style, bp) as Style;
      const patch: Partial<Style> = {};
      if (sx || framed) {
        // In a row the block fills its column and the column takes the width; elsewhere it's a share of the space.
        if (widths) patch.width = "100%";
        else patch.width = `${round((w / room) * 100)}%`;
        patch.maxWidth = undefined;
      }
      if (framed) {
        patch.aspectRatio = `${Math.round(w)}/${Math.round(h)}`;
        if (shown.height) patch.height = undefined;
      } else if (sy) patch.minHeight = `${Math.round(h)}px`;
      const nextWidths = widths && (sx || framed) ? splitFor(widths, index % widths.length, w, rowRoom, colStart) : null;
      updatePage(
        getState().pageId,
        (p) => {
          let q = updateNode(p, id, (n: Node) => ({ ...n, style: setOnly(n.style, bp, patch) }));
          if (nextWidths) q = updateSection(q, section.id, (s) => ({ ...s, layout: setOnly(s.layout, bp, { colWidths: nextWidths }) }));
          return q;
        },
        framed ? "Resize picture" : "Resize block",
      );
      setTimeout(() => {
        ["width", "maxWidth", "aspectRatio", "minHeight"].forEach((k) => el.style.removeProperty(k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())));
        inner.style.removeProperty("grid-template-columns");
      }, 80);
      selectBlock(id);
      doc.addEventListener("click", (c) => c.stopPropagation(), { capture: true, once: true });
    };
    doc.addEventListener("pointermove", move, true);
    doc.addEventListener("pointerup", up, true);
  };
  doc.addEventListener("pointerdown", down, true);
  return () => doc.removeEventListener("pointerdown", down, true);
}

/** New column shares for a row when one column becomes `w` wide; the others share what's left as before. */
export function splitFor(widths: number[], col: number, w: number, room: number, _colStart = 0): number[] {
  const total = widths.reduce((a, b) => a + b, 0);
  const share = Math.max(10, Math.min(90, (w / room) * 100));
  const restBefore = total - widths[col]!;
  return widths.map((x, i) => round(i === col ? share : restBefore ? (x / restBefore) * (100 - share) : (100 - share) / (widths.length - 1)));
}
