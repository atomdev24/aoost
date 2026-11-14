import { z } from "zod";
import { imageSources } from "../../render/media";
import { defineComponent } from "../types";
import { css } from "./GalleryGrid.styles";

export const GalleryItem = z.object({ src: z.string(), alt: z.string(), title: z.string().optional() });
export const GalleryGridContent = z.object({
  items: z.array(GalleryItem),
  /** Columns on mobile and on desktop. The grid is content, so both live here. */
  columns: z.number().int().min(1).max(6),
  columnsDesktop: z.number().int().min(1).max(8),
  gap: z.number().min(0).max(80),
  lightbox: z.boolean(),
});
export type GalleryGridContent = z.infer<typeof GalleryGridContent>;

export const GalleryGrid = defineComponent<GalleryGridContent>({
  type: "GalleryGrid",
  label: "Gallery grid",
  category: "media",
  schema: GalleryGridContent,
  defaults: { content: { items: [], columns: 2, columnsDesktop: 3, gap: 12, lightbox: true } },
  css,
  Render: ({ content, ctx }) => {
    if (!content.items.length) return ctx.editing ? <div className="frame-empty">Add images to the gallery</div> : null;
    const vars = { "--gc": content.columns, "--gcd": content.columnsDesktop, "--gg": `${content.gap}px` } as React.CSSProperties;
    return (
      <ul className="gal" style={vars}>
        {content.items.map((item, i) => {
          const { src, srcSet } = imageSources(item.src);
          return (
            <li key={i}>
              <figure className="frame" {...(content.lightbox ? { "data-lightbox": item.src, "data-caption": item.title ?? item.alt } : {})}>
                <img className="media" src={src} srcSet={srcSet} sizes={srcSet ? "(min-width:900px) 33vw, 50vw" : undefined} alt={item.alt} loading="lazy" decoding="async" draggable={false} />
              </figure>
            </li>
          );
        })}
      </ul>
    );
  },
});
