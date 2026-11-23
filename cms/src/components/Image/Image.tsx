import { z } from "zod";
import { isExternal } from "../../render/links";
import { imageSources } from "../../render/media";
import { LinkTarget, type Node } from "../../schema/content";
import { defineComponent } from "../types";
import { css } from "./Image.styles";
import { Annotations, annotationCss, Mark, MARK_STYLES } from "./annotations";

export const ImageContent = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
  /** Tap to open full screen. */
  lightbox: z.boolean().optional(),
  /** Load eagerly (use for the first image on a page). Default is lazy. */
  eager: z.boolean().optional(),
  /** Intrinsic size, recorded on upload, so the browser can reserve space. */
  width: z.number().optional(),
  height: z.number().optional(),
  link: LinkTarget.optional(),
  /** With a link: how the picture answers a press ("press": it sinks a little while held). */
  press: z.enum(["press", "none"]).optional(),
  /** Fruit readings drawn on top (see ./annotations). */
  marks: z.array(Mark).optional(),
  markStyle: z.enum(MARK_STYLES).optional(),
  /** Labels grow and shrink with their rings ("scale"), or stay one size. */
  markLabels: z.enum(["fixed", "scale"]).optional(),
});
export type ImageContent = z.infer<typeof ImageContent>;

/**
 * How wide the picture may show, for the browser to pick a sharp enough file. A
 * picture can fill the screen at any size, and one zoomed inside its frame
 * shows a part of itself larger still, so it asks for that much more.
 */
export function imageSizes(node: Node): string {
  const zooms = Object.values(node.frame ?? {}).map((f) => (f && f.fit === "free" ? f.zoom : 1));
  const zoom = Math.min(3, Math.max(1, ...zooms));
  return `${Math.round(100 * zoom)}vw`;
}

export const Image = defineComponent<ImageContent>({
  type: "Image",
  label: "Image",
  category: "media",
  framed: true,
  schema: ImageContent,
  defaults: { content: { src: "", alt: "", lightbox: true } },
  css: css + annotationCss,
  Render: ({ node, content, ctx }) => {
    if (!content.src) {
      return ctx.editing ? <div className="frame frame-empty">Choose an image</div> : null;
    }
    const { src, srcSet } = imageSources(content.src);
    const img = (
      <img
        className="media"
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? imageSizes(node) : undefined}
        alt={content.alt}
        width={content.width}
        height={content.height}
        loading={content.eager ? "eager" : "lazy"}
        fetchPriority={content.eager ? "high" : undefined}
        decoding="async"
        draggable={false}
        data-parallax-inner=""
      />
    );
    const l = content.link;
    // A link field opened but left empty is no link (the picture keeps its full-screen tap).
    const linked = l && !(l.kind === "url" && !l.url.trim()) && !(l.kind === "email" && !l.email.trim());
    const href = linked ? ctx.href(l) : undefined;
    const press = content.press !== "none";
    const inner = href && !ctx.editing ? (
      <a href={href} className={press ? "press" : undefined} {...(isExternal(href) ? { target: "_blank", rel: "noopener" } : {})}>
        {img}
      </a>
    ) : (
      img
    );
    return (
      <figure className="frame" {...(content.lightbox && !href ? { "data-lightbox": content.src, "data-caption": content.caption ?? content.alt } : {})}>
        {inner}
        {content.marks?.length ? <Annotations marks={content.marks} style={content.markStyle ?? "ring"} editing={ctx.editing} grow={content.markLabels === "scale"} /> : null}
        {content.caption ? <figcaption className="t-small">{content.caption}</figcaption> : null}
      </figure>
    );
  },
});
