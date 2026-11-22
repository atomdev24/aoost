import { addNode, addSection, createNode, createSection, locate, updateNode } from "../../model/page-ops";
import { isCancelled, uploadFile } from "../media";
import { currentPage, getState, updatePage } from "../store";
import { selectBlock } from "../board/bridge";
import { adjustable, startAdjust } from "./adjust-state";
import { slotAtPoint } from "./slots";
import { selectPiece } from "./ResizePiece";
import { attachDoubleTap } from "../touch/longpress";

/** What a media library item carries when it is dragged (see MediaLibrary). */
export const MEDIA_MIME = "application/x-aoost-media";
export type DraggedMedia = { url: string; kind: string; width?: number; height?: number; name: string };

const IMAGE_FILE = /^image\//;

/** The Image block under a point in the canvas, if any. */
function imageBlockAt(target: EventTarget | null): string | null {
  const el = (target as Element | null)?.closest?.("[data-node-id]");
  const id = el?.getAttribute("data-node-id");
  if (!id) return null;
  const at = locate(currentPage(getState()), id);
  const node = at?.kind === "node" ? at.node : at?.kind === "overlay" ? at.overlay.node : null;
  return node?.type === "Image" ? id : null;
}

/** Point an Image block at a new picture (one undo step). */
export function replaceImage(id: string, media: { url: string; width?: number; height?: number }, label = "Replace image") {
  const { pageId } = getState();
  updatePage(pageId, (p) => updateNode(p, id, (n) => ({ ...n, content: { ...n.content, src: media.url, width: media.width, height: media.height } })), label);
}

/**
 * Place a picture (or video) on the page as a new block: after the block it
 * was dropped on (flow and grid sections), at the end of the section it was
 * dropped in, or at the end of the page (a new section when there is none).
 * One undo step; the new block is selected.
 */
export function placeMedia(target: EventTarget | null, media: { url: string; kind?: string; width?: number; height?: number }) {
  const page = currentPage(getState());
  const node =
    media.kind === "video"
      ? createNode("Video", { content: { src: media.url } })
      : createNode("Image", { content: { src: media.url, width: media.width, height: media.height, alt: "" } });
  const el = (target as Element | null)?.closest?.("[data-node-id], [data-section-id]") ?? null;
  const id = el?.getAttribute("data-node-id") ?? el?.getAttribute("data-section-id") ?? null;
  const at = id ? locate(page, id) : null;
  updatePage(
    page.id,
    (p) => {
      if (at?.kind === "node" && at.section.kind !== "canvas") return addNode(p, at.section.id, node, at.section.children.indexOf(at.node) + 1);
      if (at?.kind === "section" && at.section.kind !== "canvas") return addNode(p, at.section.id, node);
      const index = at && at.kind !== "overlay" ? p.sections.findIndex((s) => s.id === at.section.id) + 1 : p.sections.length;
      return addSection(p, createSection("flow", { children: [node] }), index);
    },
    media.kind === "video" ? "Add video" : "Add image",
  );
  selectBlock(node.id);
  return node.id;
}

/**
 * Canvas behaviour wired into Puck's editable frame:
 *   double-click a picture (or a picture inside an aoost block) → adjust it in its frame;
 *   drop an image file (or a media library item) on an Image block → replace it;
 *   drop one anywhere else → place it as a new block there.
 */
export function attachCanvasDrops(doc: Document) {
  const dbl = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.("[data-node-id]");
    if (!el) return;
    // A picture inside a block's content (an aoost block's artwork or cover): adjust that one picture.
    const at = locate(currentPage(getState()), el.getAttribute("data-node-id") ?? "");
    const owner = at?.kind === "node" ? at.node : at?.kind === "overlay" ? at.overlay.node : null;
    const hit = owner ? slotAtPoint(owner, el, e.clientX, e.clientY) : null;
    if (owner && hit && (hit.slot.kind === "bg" || (hit.el as HTMLImageElement).naturalWidth)) {
      e.preventDefault();
      e.stopPropagation();
      // The block is selected too, so the inspector shows the picture being adjusted.
      if (!getState().selection.includes(owner.id)) selectBlock(owner.id);
      selectPiece(null);
      startAdjust(owner.id, hit.slot.path);
      return;
    }
    if (!adjustable(el)) return;
    const id = imageBlockAt(e.target) ?? el.getAttribute("data-node-id");
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    startAdjust(id);
  };
  const wanted = (e: DragEvent) => !!e.dataTransfer && (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes(MEDIA_MIME));
  let marked: Element | null = null;
  const mark = (el: Element | null) => {
    if (marked === el) return;
    marked?.classList.remove("ed-drop-target");
    marked = el;
    marked?.classList.add("ed-drop-target");
  };
  const over = (e: DragEvent) => {
    if (!wanted(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = "copy";
    const id = imageBlockAt(e.target);
    mark(id ? (e.target as Element).closest("[data-node-id]") : null);
  };
  const drop = async (e: DragEvent) => {
    mark(null);
    if (!wanted(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const id = imageBlockAt(e.target);
    const target = e.target;
    const media = e.dataTransfer!.getData(MEDIA_MIME);
    if (media) {
      const m = JSON.parse(media) as DraggedMedia;
      if (id && m.kind === "image") replaceImage(id, m);
      else if (m.kind === "image" || m.kind === "video") placeMedia(target, m);
      return;
    }
    const file = [...e.dataTransfer!.files].find((f) => IMAGE_FILE.test(f.type) || /^video\//.test(f.type));
    if (!file) return;
    try {
      const item = await uploadFile(file);
      if (id && item.kind === "image") replaceImage(id, item);
      else placeMedia(target, item);
    } catch (err) {
      // the upload tray already shows a failure or a cancel
      if (!isCancelled(err)) console.warn(err);
    }
  };
  const leave = (e: DragEvent) => {
    if (!e.relatedTarget) mark(null);
  };
  doc.addEventListener("dblclick", dbl, true);
  // Phones: a double tap does what a double-click does (enter Adjust image).
  const detachTap = attachDoubleTap(doc, (e) => dbl(e));
  doc.addEventListener("dragover", over, true);
  doc.addEventListener("drop", drop, true);
  doc.addEventListener("dragleave", leave, true);
  return () => {
    doc.removeEventListener("dblclick", dbl, true);
    detachTap();
    doc.removeEventListener("dragover", over, true);
    doc.removeEventListener("drop", drop, true);
    doc.removeEventListener("dragleave", leave, true);
  };
}
