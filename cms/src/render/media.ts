/** Widths the Worker can serve for uploaded images (see worker/media.ts). */
export const IMAGE_WIDTHS = [480, 960, 1600, 2400] as const;

const RASTER = /\.(jpe?g|png|webp|avif)$/i;

/** Uploaded raster images get a srcset; static files and SVG/GIF are served as they are. */
export function imageSources(src: string): { src: string; srcSet?: string } {
  if (!src.startsWith("/media/") || !RASTER.test(src)) return { src };
  return {
    src: `${src}?w=960`,
    srcSet: IMAGE_WIDTHS.map((w) => `${src}?w=${w} ${w}w`).join(", "),
  };
}
