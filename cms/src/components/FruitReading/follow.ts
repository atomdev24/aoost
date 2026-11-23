import { layoutAnn } from "../Image/ann-layout";

/**
 * Keep anchored fruit readings on their spot: each frame, find where that spot
 * of the picture is now (its crop on this screen size, its parallax drift) and
 * shift the reading's layer there. Shared by the site script and the editor
 * canvas (which stays still while a layer is being dragged).
 */
const probes = new WeakMap<Element, HTMLElement>();

function contentBox(picture: Element): DOMRect | null {
  const img = picture.querySelector("img.media");
  if (!img?.parentElement) return null;
  let probe = probes.get(picture);
  if (!probe || !probe.isConnected) {
    probe = picture.ownerDocument.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;pointer-events:none;visibility:hidden";
    img.parentElement.appendChild(probe);
    probes.set(picture, probe);
  }
  return layoutAnn(probe) ? probe.getBoundingClientRect() : null;
}

export function followAnchors(doc: Document) {
  // Labels that scale with the ring: 1 at the default 96px ring.
  doc.querySelectorAll<HTMLElement>('[data-fr][data-labels="scale"]').forEach((fr) => fr.style.setProperty("--ls", String(Math.min(2.4, Math.max(0.5, Math.round((fr.offsetWidth / 96) * 100) / 100)))));
  doc.querySelectorAll<HTMLElement>("[data-fr][data-anchor]").forEach((fr) => {
    const layer = (fr.closest(".n") as HTMLElement | null) ?? fr;
    const picture = doc.querySelector(`.n-${CSS.escape(fr.dataset.anchor!)}`);
    const box = picture ? contentBox(picture) : null;
    if (!box) {
      layer.style.translate = "";
      return;
    }
    const tx = box.left + (Number(fr.dataset.ax) / 100) * box.width;
    const ty = box.top + (Number(fr.dataset.ay) / 100) * box.height;
    // The layer's own centre, without the shift we gave it last time.
    const [dx = 0, dy = 0] = (layer.style.translate || "0px 0px").split(" ").map((v) => parseFloat(v) || 0);
    const r = layer.getBoundingClientRect();
    const cx = r.left + r.width / 2 - dx;
    const cy = r.top + r.height / 2 - dy;
    const nx = Math.round((tx - cx) * 10) / 10;
    const ny = Math.round((ty - cy) * 10) / 10;
    layer.style.translate = nx || ny ? `${nx}px ${ny}px` : "";
  });
}

/** Follow on scroll and resize (the site), or on every change too (the editor). */
export function watchAnchors(doc: Document, opts: { editing?: boolean } = {}): () => void {
  const win = doc.defaultView!;
  if (!doc.querySelector("[data-fr]") && !opts.editing) return () => {};
  let queued = false;
  const run = () => {
    queued = false;
    if (opts.editing && doc.documentElement.classList.contains("ed-dragging")) {
      doc.querySelectorAll<HTMLElement>("[data-fr]").forEach((fr) => ((fr.closest(".n") as HTMLElement | null)?.style.removeProperty("translate")));
      return;
    }
    followAnchors(doc);
  };
  const soon = () => {
    if (queued) return;
    queued = true;
    win.requestAnimationFrame(run);
  };
  win.addEventListener("scroll", soon, { passive: true });
  win.addEventListener("resize", soon);
  win.addEventListener("load", soon);
  const mo = opts.editing ? new win.MutationObserver((recs) => recs.some((r) => !(r.target as Element).closest?.("[data-fr]")) && soon()) : null;
  mo?.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["src", "class"] });
  // Pictures load and the drift settles: catch up for a moment.
  const t = win.setInterval(soon, 250);
  win.setTimeout(() => win.clearInterval(t), 4000);
  soon();
  return () => {
    win.removeEventListener("scroll", soon);
    win.removeEventListener("resize", soon);
    win.removeEventListener("load", soon);
    mo?.disconnect();
    win.clearInterval(t);
  };
}
