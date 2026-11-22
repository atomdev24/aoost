import { uploadFile } from "./media";

/**
 * Trim the empty transparent space around a picture (a journal cover exported on a big canvas),
 * so it fills its slot like the others. Returns the trimmed copy's address (uploaded to the media
 * library next to the original), or null when there is nothing worth trimming: not a PNG or
 * WebP, no transparency, or margins under 3% of its size. The original is left as it is.
 */
const MIN_MARGIN = 0.03;
const PAD = 4;

export async function trimTransparent(url: string): Promise<string | null> {
  if (!/\.(png|webp)(\?|$)/i.test(url) || /-trimmed[-.]/.test(url)) return null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url.split("?")[0]!;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const W = img.naturalWidth, H = img.naturalHeight;
  if (!W || !H) return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, W, H).data;
  // The box around everything that isn't (nearly) see-through; faint haze under 20/255 doesn't count.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3]! > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null; // all transparent
  const margins = [x0 / W, y0 / H, (W - 1 - x1) / W, (H - 1 - y1) / H];
  if (Math.max(...margins) < MIN_MARGIN) return null;
  x0 = Math.max(0, x0 - PAD);
  y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(W - 1, x1 + PAD);
  y1 = Math.min(H - 1, y1 + PAD);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const og = out.getContext("2d")!;
  og.drawImage(img, x0, y0, w, h, 0, 0, w, h);
  // Clear the faint haze left at the edges, so the trimmed picture has clean transparency.
  const px = og.getImageData(0, 0, w, h);
  for (let i = 3; i < px.data.length; i += 4) if (px.data[i]! <= 8) px.data[i] = 0;
  og.putImageData(px, 0, 0);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
  if (!blob) return null;
  const base = (url.split("?")[0]!.split("/").pop() ?? "picture").replace(/\.[a-z0-9]+$/i, "").replace(/-[a-z0-9]{4}$/i, "");
  const item = await uploadFile(new File([blob], `${base}-trimmed.png`, { type: "image/png" }));
  return item.url;
}
