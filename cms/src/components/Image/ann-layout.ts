/**
 * Fruit readings sit on the picture's content, not its frame: the layer is laid
 * over exactly the part of the image that shows (object-fit and focal point,
 * plus the zoom and pan of a "free" frame), so a reading stays on its fruit
 * whatever the crop on each screen size. Shared by the site script and the
 * editor canvas.
 */
const pct = (v: string, room: number) => (v.endsWith("%") ? (parseFloat(v) / 100) * room : parseFloat(v) || 0);

export function layoutAnn(ann: HTMLElement): boolean {
  const box = ann.parentElement;
  const img = box?.querySelector<HTMLImageElement>("img.media");
  if (!box || !img || !img.naturalWidth || !img.naturalHeight) return false;
  const W = img.clientWidth;
  const H = img.clientHeight;
  if (!W || !H) return false;
  const cs = getComputedStyle(img);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  let cw = W;
  let ch = H;
  if (cs.objectFit !== "fill") {
    const s = cs.objectFit === "contain" ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
    cw = iw * s;
    ch = ih * s;
  }
  const [px = "50%", py = "50%"] = cs.objectPosition.split(/\s+/);
  const left = img.offsetLeft + pct(px, W - cw);
  const top = img.offsetTop + pct(py, H - ch);
  const [ox = "0", oy = "0"] = cs.transformOrigin.split(/\s+/);
  const s = ann.style;
  s.inset = "auto";
  s.left = `${left}px`;
  s.top = `${top}px`;
  s.width = `${cw}px`;
  s.height = `${ch}px`;
  s.transform = cs.transform === "none" ? "" : cs.transform;
  s.transformOrigin = `${img.offsetLeft + parseFloat(ox) - left}px ${img.offsetTop + parseFloat(oy) - top}px`;
  return true;
}

/** Lay out every reading layer in a document now, after pictures load, and when frames change size. */
export function watchAnn(doc: Document): () => void {
  const win = doc.defaultView!;
  let queued = false;
  const all = () => {
    queued = false;
    doc.querySelectorAll<HTMLElement>("[data-ann]").forEach(layoutAnn);
  };
  const soon = () => {
    if (queued) return;
    queued = true;
    win.requestAnimationFrame(all);
  };
  const ro = new win.ResizeObserver(soon);
  const seen = new WeakSet<Element>();
  const scan = () => {
    doc.querySelectorAll<HTMLElement>("[data-ann]").forEach((a) => {
      const img = a.parentElement?.querySelector("img.media");
      if (!img || seen.has(img)) return;
      seen.add(img);
      ro.observe(img);
      img.addEventListener("load", soon);
    });
    soon();
  };
  // Content, pictures and the page's styles changing (the editor rewrites them as you edit); not the reading layers themselves.
  const mo = new win.MutationObserver((records) => {
    if (records.some((r) => !(r.target as Element).closest?.("[data-ann]"))) scan();
  });
  mo.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["src", "class"] });
  scan();
  return () => {
    ro.disconnect();
    mo.disconnect();
  };
}
