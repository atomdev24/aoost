import type { Breakpoint } from "../schema";
import { DESIGN_WIDTH } from "../schema";

const MAX_HEIGHT = 6000;

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Capture the draft preview of a page as a PNG (base64, no prefix).
 *
 * The draft page is static HTML with all its CSS inline, so it can be drawn
 * exactly: fetch /preview/<slug>, inline its images and uploaded fonts, wrap
 * it in an SVG <foreignObject> as wide as the breakpoint (so the page's own
 * media queries pick the layout), and paint that onto a canvas.
 * Third-party frames (YouTube, Spotify…) are drawn as labelled boxes, and
 * Google Fonts fall back to system fonts, because an SVG image can't load
 * anything from the network.
 */
export async function capturePreview(slug: string, bp: Breakpoint): Promise<string> {
  const width = DESIGN_WIDTH[bp];
  const html = await (await fetch(`/preview${slug === "/" ? "/" : slug}`, { credentials: "same-origin" })).text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("script, link, #nav-sheet, #nav-search, .skip, noscript").forEach((el) => el.remove());
  doc.querySelectorAll("iframe, model-viewer, audio").forEach((el) => {
    const box = doc.createElement("div");
    box.setAttribute("style", "display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:60px;background:#1C1C1F;color:#CFC8BB;font:12px sans-serif;border-radius:inherit");
    box.textContent = el.getAttribute("title") || el.tagName.toLowerCase();
    el.replaceWith(box);
  });
  doc.querySelectorAll("video").forEach((v) => {
    const poster = v.getAttribute("poster");
    const stand = doc.createElement(poster ? "img" : "div");
    stand.setAttribute("class", v.getAttribute("class") ?? "");
    if (poster) stand.setAttribute("src", poster);
    else stand.setAttribute("style", "background:#0F0F11;width:100%;height:100%");
    v.replaceWith(stand);
  });

  // Images and uploaded fonts must be inside the SVG: fetch each once and embed it.
  const cache = new Map<string, Promise<string | null>>();
  const embed = (url: string) => {
    if (!cache.has(url)) cache.set(url, toDataUrl(url));
    return cache.get(url)!;
  };
  await Promise.all(
    [...doc.querySelectorAll("img")].map(async (img) => {
      const src = img.getAttribute("src");
      img.removeAttribute("srcset");
      img.removeAttribute("loading");
      const data = src ? await embed(src) : null;
      if (data) img.setAttribute("src", data);
      else img.removeAttribute("src");
    }),
  );
  for (const style of doc.querySelectorAll("style")) {
    let css = style.textContent ?? "";
    for (const m of [...css.matchAll(/url\('(\/[^']+)'\)/g)]) {
      const data = await embed(m[1]!);
      if (data) css = css.replace(m[0], `url('${data}')`);
    }
    // The capture has no scroll position: show the nav where it sits at the top of the page.
    style.textContent = `${css}\n.nav{position:absolute}`;
  }
  doc.documentElement.setAttribute("style", `width:${width}px`);

  // Lay the page out off-screen at the breakpoint width to learn its height.
  const frame = document.createElement("iframe");
  frame.setAttribute("style", `position:fixed;left:-99999px;top:0;width:${width}px;height:800px;border:0;visibility:hidden`);
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.srcdoc = `<!doctype html>${doc.documentElement.outerHTML}`;
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    setTimeout(resolve, 4000);
  });
  await new Promise((r) => setTimeout(r, 150));
  const height = Math.min(MAX_HEIGHT, Math.max(200, frame.contentDocument?.documentElement.scrollHeight ?? 800));
  frame.remove();

  const xhtml = new XMLSerializer().serializeToString(doc.documentElement);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F3EFE6";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png").split(",")[1]!;
}
