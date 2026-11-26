import { addNode, addSection, createNode, createSection, locate, updateNode } from "../../model/page-ops";
import { isCancelled, uploadFile } from "../media";
import { pickMedia } from "../fields/media";
import { showTip } from "../tips/tips";
import { dropAt, showDropBar, type DropHit } from "./drop-place";
import { placeNear } from "../../model/side-by-side";
import { embedFor } from "../../components/Embed/providers";
import { currentPage, getState, updatePage } from "../store";
import { selectBlock } from "../board/bridge";
import { adjustable, startAdjust } from "./adjust-state";
import { slotAtPoint } from "./slots";
import { selectPiece } from "./ResizePiece";
import { attachDoubleTap } from "../touch/longpress";
import { addMark, ANNOTATION_MIME, framePoint } from "./annotations";
import { addReadingLayer, pictureAt } from "./reading-anchor";

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
  showTip("image");
}

/**
 * Fill an Image or Video block from the media library (a video can also take a YouTube or Vimeo
 * link pasted in the same dialog). One undo step.
 */
export async function chooseMedia(id: string, kind: "image" | "video") {
  const url = await pickMedia(kind);
  if (!url) return;
  if (kind === "image") return replaceImage(id, { url }, "Choose image");
  const info = embedFor(url);
  const link = info && (info.provider === "youtube" || info.provider === "vimeo");
  updatePage(
    getState().pageId,
    (p) => updateNode(p, id, (n) => ({ ...n, content: link ? { ...n.content, source: "link", url } : { ...n.content, source: "upload", src: url } })),
    "Choose video",
  );
  showTip("video");
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
  showTip(media.kind === "video" ? "video" : "image");
  return node.id;
}

/** The middle of a block (not near an edge): a picture dropped there replaces the one under it. */
const isMiddle = (hit: DropHit, x: number, y: number) => {
  const r = hit.rect;
  const rx = (x - r.left) / r.width;
  const ry = (y - r.top) / r.height;
  return rx > 0.22 && rx < 0.78 && ry > 0.25 && ry < 0.75;
};

/** A new picture or video above, below or beside a block. One undo step; selected. */
function placeMediaNear(hit: DropHit, media: { url: string; kind?: string; width?: number; height?: number }) {
  const node =
    media.kind === "video" ? createNode("Video", { content: { src: media.url } }) : createNode("Image", { content: { src: media.url, width: media.width, height: media.height, alt: "" } });
  const page = currentPage(getState());
  updatePage(page.id, (p) => placeNear(p, hit.targetId, node, hit.where, { share: hit.share }), media.kind === "video" ? "Add video" : "Add image");
  selectBlock(node.id);
  showTip(media.kind === "video" ? "video" : "image");
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
    // An empty picture, or a video with nothing to adjust yet: double-click chooses what goes in it.
    if (owner && !adjustable(el) && (owner.type === "Image" || owner.type === "Video")) {
      e.preventDefault();
      e.stopPropagation();
      if (!getState().selection.includes(owner.id)) selectBlock(owner.id);
      void chooseMedia(owner.id, owner.type === "Video" ? "video" : "image");
      return;
    }
    if (!adjustable(el)) return;
    const id = imageBlockAt(e.target) ?? el.getAttribute("data-node-id");
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    startAdjust(id);
  };
  const wanted = (e: DragEvent) => !!e.dataTransfer && (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes(MEDIA_MIME) || e.dataTransfer.types.includes(ANNOTATION_MIME));
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
    if (e.dataTransfer!.types.includes(ANNOTATION_MIME)) return mark(pictureAt(doc, e.clientX, e.clientY)?.el ?? null);
    // On the middle of a picture: replace it. Anywhere else on a block: a line shows above, below or beside.
    const hit = dropAt(doc, e.clientX, e.clientY);
    const id = imageBlockAt(e.target);
    const replace = !!id && !!hit && hit.targetId === id && isMiddle(hit, e.clientX, e.clientY);
    mark(replace ? (e.target as Element).closest("[data-node-id]") : null);
    showDropBar(doc, replace ? null : hit);
  };
  const drop = async (e: DragEvent) => {
    mark(null);
    showDropBar(doc, null);
    if (!wanted(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const hit = dropAt(doc, e.clientX, e.clientY);
    const onImage = imageBlockAt(e.target);
    const id = onImage && hit?.targetId === onImage && isMiddle(hit, e.clientX, e.clientY) ? onImage : null;
    const place = (m: { url: string; kind?: string; width?: number; height?: number }) => (hit && !id ? placeMediaNear(hit, m) : placeMedia(e.target, m));
    // A fruit reading dropped on a picture: a mark where it landed.
    if (e.dataTransfer!.types.includes(ANNOTATION_MIME)) {
      // Found by position, so a locked picture (which ignores the pointer) counts too.
      const pic = pictureAt(doc, e.clientX, e.clientY);
      const el = pic?.el ?? null;
      const id = pic?.id ?? null;
      const at = id ? locate(currentPage(getState()), id) : null;
      // On a picture in a free-layout section: a reading layer of its own, anchored where it landed.
      if (el && at?.kind === "node" && at.section.kind === "canvas") addReadingLayer(at.section, el, e.clientX, e.clientY);
      else if (id && el) addMark(id, framePoint(el, e.clientX, e.clientY));
      return;
    }
    const media = e.dataTransfer!.getData(MEDIA_MIME);
    if (media) {
      const m = JSON.parse(media) as DraggedMedia;
      if (id && m.kind === "image") replaceImage(id, m);
      else if (m.kind === "image" || m.kind === "video") place(m);
      return;
    }
    const file = [...e.dataTransfer!.files].find((f) => IMAGE_FILE.test(f.type) || /^video\//.test(f.type));
    if (!file) return;
    try {
      const item = await uploadFile(file);
      if (id && item.kind === "image") replaceImage(id, item);
      else place(item);
    } catch (err) {
      // the upload tray already shows a failure or a cancel
      if (!isCancelled(err)) console.warn(err);
    }
  };
  const leave = (e: DragEvent) => {
    if (!e.relatedTarget) (mark(null), showDropBar(doc, null));
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
