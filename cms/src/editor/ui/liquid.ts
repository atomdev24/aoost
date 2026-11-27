import "./liquid.css";
import { glassStyle, isChromium, onDisplayChange } from "../display";

/*
 * Liquid glass on every floating toolbar: the top bar's islands, the rail, the zoom bar, the
 * variant band and the phone tab bar (the "Liquid glass" setting, display.ts). An SVG
 * displacement map, the size of the element, shifts what is behind it near the rounded edges;
 * the middle stays still. Only Chromium can use an SVG filter in backdrop-filter, so everywhere
 * else (and with Frosted or Solid chosen, or reduced motion or transparency) nothing happens and
 * the frosted glass stays.
 */

const TARGETS: { selector: string; scale: number }[] = [
  { selector: ".ed-island", scale: 30 },
  { selector: ".ed-rail", scale: 26 },
  { selector: ".bd-zoombar", scale: 26 },
  { selector: ".ed-variant-band", scale: 26 },
  { selector: ".ed-phone-tabs", scale: 36 },
];
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * How far a point of a w×h rounded box (corner radius r) is pushed, from -1 to 1 on each axis.
 * Zero deeper than `band` px inside the edge; growing (eased) towards the edge, pointing inwards:
 * the left edge pushes right (+x), the top edge pushes down (+y).
 */
export function edgeOffset(x: number, y: number, w: number, h: number, r: number, band: number): [number, number] {
  const rr = Math.min(r, w / 2, h / 2);
  const px = x - w / 2;
  const py = y - h / 2;
  const qx = Math.abs(px) - (w / 2 - rr);
  const qy = Math.abs(py) - (h / 2 - rr);
  // Signed distance to the rounded box (negative inside) and the outward direction.
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const dist = outside + Math.min(Math.max(qx, qy), 0) - rr;
  const depth = -dist;
  if (depth >= band || band <= 0) return [0, 0];
  let nx: number;
  let ny: number;
  if (qx > 0 && qy > 0) {
    nx = (qx / outside) * Math.sign(px);
    ny = (qy / outside) * Math.sign(py);
  } else if (qx > qy) {
    nx = Math.sign(px);
    ny = 0;
  } else {
    nx = 0;
    ny = Math.sign(py);
  }
  const k = (1 - Math.max(0, depth) / band) ** 2;
  return [-nx * k + 0, -ny * k + 0];
}

/** The displacement map as a picture: red carries x, green carries y, 128 = no shift. */
function mapUrl(doc: Document, w: number, h: number, r: number): string {
  const canvas = doc.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const band = Math.max(6, Math.min(w, h) * 0.14);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [dx, dy] = edgeOffset(x + 0.5, y + 0.5, w, h, r, band);
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(128 + dx * 127);
      img.data[i + 1] = Math.round(128 + dy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

const wanted = (win: Window) =>
  isChromium() && glassStyle() === "liquid" && !win.matchMedia("(prefers-reduced-motion: reduce)").matches && !win.matchMedia("(prefers-reduced-transparency: reduce)").matches;

export function startLiquid(doc: Document): () => void {
  const win = doc.defaultView;
  if (!win || typeof ResizeObserver === "undefined") return () => {};
  let svg: SVGSVGElement | null = null;
  let n = 0;
  const attached = new Map<Element, { image: SVGFEImageElement; size: string }>();

  const sizes = new ResizeObserver((entries) => {
    for (const e of entries) draw(e.target);
  });

  function draw(el: Element) {
    const a = attached.get(el);
    if (!a) return;
    const w = Math.round((el as HTMLElement).offsetWidth);
    const h = Math.round((el as HTMLElement).offsetHeight);
    const size = `${w}x${h}`;
    if (!w || !h || size === a.size) return;
    a.size = size;
    const r = parseFloat(win!.getComputedStyle(el).borderTopLeftRadius) || 0;
    a.image.setAttribute("href", mapUrl(doc, w, h, r));
    a.image.setAttribute("width", String(w));
    a.image.setAttribute("height", String(h));
  }

  function attach(el: Element, scale: number) {
    if (attached.has(el)) return;
    if (!svg) {
      svg = doc.createElementNS(SVG_NS, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      doc.body.appendChild(svg);
    }
    const id = `ed-liquid-${++n}`;
    const filter = doc.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    filter.setAttribute("width", "100%");
    filter.setAttribute("height", "100%");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    const image = doc.createElementNS(SVG_NS, "feImage") as SVGFEImageElement;
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("result", "map");
    const shift = doc.createElementNS(SVG_NS, "feDisplacementMap");
    shift.setAttribute("in", "SourceGraphic");
    shift.setAttribute("in2", "map");
    shift.setAttribute("scale", String(scale));
    shift.setAttribute("xChannelSelector", "R");
    shift.setAttribute("yChannelSelector", "G");
    filter.append(image, shift);
    svg.appendChild(filter);
    attached.set(el, { image, size: "" });
    (el as HTMLElement).style.setProperty("--ed-liquid-filter", `url(#${id}) saturate(160%)`);
    el.classList.add("ed-liquid");
    sizes.observe(el);
    draw(el);
  }

  function detachAll() {
    for (const el of attached.keys()) {
      el.classList.remove("ed-liquid");
      (el as HTMLElement).style.removeProperty("--ed-liquid-filter");
      sizes.unobserve(el);
    }
    attached.clear();
    svg?.remove();
    svg = null;
  }

  function scan() {
    if (!wanted(win!)) {
      if (attached.size) detachAll();
      return;
    }
    for (const el of [...attached.keys()]) if (!el.isConnected) {
      sizes.unobserve(el);
      attached.delete(el);
    }
    for (const t of TARGETS) doc.querySelectorAll(t.selector).forEach((el) => attach(el, t.scale));
  }

  // The bars mount (and the phone layout swaps in) after start: watch for them.
  let queued = false;
  const mounts = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    win.requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  });
  mounts.observe(doc.body, { childList: true, subtree: true });
  const stopDisplay = onDisplayChange(scan);
  scan();
  return () => {
    mounts.disconnect();
    stopDisplay();
    sizes.disconnect();
    detachAll();
  };
}
