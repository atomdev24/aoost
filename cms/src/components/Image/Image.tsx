import type { CSSProperties } from "react";
import { z } from "zod";
import { isExternal } from "../../render/links";
import { imageSources } from "../../render/media";
import { LinkTarget, type Node } from "../../schema/content";
import { defineComponent } from "../types";
import { css } from "./Image.styles";
import { Shade } from "../shade";
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
  /** Seconds to wait (after the picture comes into view) before the readings play. */
  markDelay: z.number().min(0).max(20).optional(),
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

/**
 * The slide wrapper's look. The slow pan's speed; and in the editor (which keeps scroll effects
 * still) the enlargement parallax gives the picture on the page, so the crop you set is the one
 * the page shows at first.
 */
function driftStyle(node: Node, editing: boolean): CSSProperties | undefined {
  const fx = node.effects;
  const s: Record<string, string> = {};
  if (fx?.pan) s["--kb"] = `${fx.panSeconds ?? 60}s`;
  if (editing && fx?.parallax) {
    const f = fx.parallax;
    s.scale = String(Math.round((1 + Math.abs(f) * 0.45) * 1000) / 1000);
    s.transformOrigin = f > 0 ? "50% 100%" : "50% 0%";
  }
  return Object.keys(s).length ? (s as CSSProperties) : undefined;
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
    const marks = content.marks?.length ? (
      <Annotations marks={content.marks} style={content.markStyle ?? "ring"} editing={ctx.editing} grow={content.markLabels === "scale"} delay={content.markDelay} />
    ) : null;
    return (
      <figure className="frame" {...(content.lightbox && !href ? { "data-lightbox": content.src, "data-caption": content.caption ?? content.alt } : {})}>
        {/* With parallax, the picture and its readings slide together inside the frame (runtime/effects.ts). */}
        {node.effects?.parallax || node.effects?.pan ? (
          <div
            className={`drift${node.effects.pan ? ` kb kb-${node.effects.pan}` : ""}`}
            data-parallax-inner={node.effects.parallax ? "" : undefined}
            style={driftStyle(node, ctx.editing)}
          >
            {inner}
            <Shade node={node} />
            {marks}
          </div>
        ) : (
          <>
            {inner}
            <Shade node={node} />
            {marks}
          </>
        )}
        {content.caption ? <figcaption className="t-small">{content.caption}</figcaption> : null}
      </figure>
    );
  },
});
