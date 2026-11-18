import { addNode, addSection, createNode, createSection, locate, updateNode } from "../../model/page-ops";
import { uploadFile } from "../media";
import { currentPage, getState, updatePage } from "../store";
import { adjustable, startAdjust } from "./AdjustImage";

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

/** Add an Image block at the end of the page, in a new section when the page has none (the empty-page drop). */
export function addImageBlock(media: { url: string; width?: number; height?: number }) {
  const page = currentPage(getState());
  const node = createNode("Image", { content: { src: media.url, width: media.width, height: media.height, alt: "" } });
  const last = page.sections[page.sections.length - 1];
  updatePage(page.id, (p) => (last && last.kind !== "canvas" ? addNode(p, last.id, node) : addSection(p, createSection("flow", { children: [node] }))), "Add image");
  return node.id;
}

/**
 * Canvas behaviour wired into Puck's editable frame:
 *   double-click a picture → adjust it in its frame;
 *   drop an image file (or a media library item) on an Image block → replace it.
 */
export function attachCanvasDrops(doc: Document) {
  const dbl = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.("[data-node-id]");
    if (!el || !adjustable(el)) return;
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
    const id = imageBlockAt(e.target);
    if (!id) return mark(null);
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = "copy";
    mark((e.target as Element).closest("[data-node-id]"));
  };
  const drop = async (e: DragEvent) => {
    mark(null);
    if (!wanted(e)) return;
    const id = imageBlockAt(e.target);
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    const media = e.dataTransfer!.getData(MEDIA_MIME);
    if (media) {
      const m = JSON.parse(media) as DraggedMedia;
      if (m.kind === "image") replaceImage(id, m);
      return;
    }
    const file = [...e.dataTransfer!.files].find((f) => IMAGE_FILE.test(f.type));
    if (!file) return;
    try {
      const item = await uploadFile(file);
      replaceImage(id, item);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Upload failed.");
    }
  };
  const leave = (e: DragEvent) => {
    if (!e.relatedTarget) mark(null);
  };
  doc.addEventListener("dblclick", dbl, true);
  doc.addEventListener("dragover", over, true);
  doc.addEventListener("drop", drop, true);
  doc.addEventListener("dragleave", leave, true);
  return () => {
    doc.removeEventListener("dblclick", dbl, true);
    doc.removeEventListener("dragover", over, true);
    doc.removeEventListener("drop", drop, true);
    doc.removeEventListener("dragleave", leave, true);
  };
}
