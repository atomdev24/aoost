import { z } from "zod";
import { imageSources } from "../../render/media";
import { embedFor } from "../Embed/providers";
import { defineComponent } from "../types";
import { css } from "./Video.styles";

export const VideoContent = z.object({
  /** An uploaded MP4/WebM, or a YouTube/Vimeo link. */
  source: z.enum(["upload", "link"]),
  src: z.string(),
  url: z.string().optional(),
  /** Poster frame: shows before the video loads. */
  poster: z.string().optional(),
  alt: z.string().optional(),
  autoplay: z.boolean(),
  loop: z.boolean(),
  controls: z.boolean(),
  /** Play only while on screen. */
  playInView: z.boolean().optional(),
  /** On phones: a lighter file, or just the poster. */
  mobileSrc: z.string().optional(),
  mobileStill: z.boolean().optional(),
});
export type VideoContent = z.infer<typeof VideoContent>;

const PlayIcon = () => (
  <svg width="56" height="56" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="22" cy="22" r="20" />
    <path d="M18 14l12 8-12 8z" fill="currentColor" />
  </svg>
);

export const Video = defineComponent<VideoContent>({
  type: "Video",
  label: "Video",
  category: "media",
  framed: true,
  schema: VideoContent,
  defaults: { content: { source: "upload", src: "", autoplay: true, loop: true, controls: false, playInView: true }, style: { aspectRatio: "16/9" } },
  css,
  Render: ({ content, ctx }) => {
    const label = content.alt || "Video";
    if (content.source === "link") {
      const info = content.url ? embedFor(content.url) : null;
      if (!info || (info.provider !== "youtube" && info.provider !== "vimeo")) return ctx.editing ? <div className="frame frame-empty">Paste a YouTube or Vimeo link</div> : null;
      const params = `?${info.provider === "youtube" ? "playsinline=1&rel=0" : "dnt=1"}${content.loop ? "&loop=1" : ""}${content.controls ? "" : "&controls=0"}`;
      // With a poster the player only loads on click: nothing third-party until then.
      if (content.poster) {
        return (
          <div className="frame vid">
            <button type="button" className="vid-facade" data-video-embed={`${info.src}${params}&autoplay=1`} aria-label={`Play ${label}`}>
              <img className="media" {...imageSources(content.poster)} alt="" loading="lazy" decoding="async" />
              <span className="vid-play">
                <PlayIcon />
              </span>
            </button>
          </div>
        );
      }
      return (
        <div className="frame vid">
          <iframe className="media" {...(ctx.editing ? { src: `${info.src}${params}` } : { "data-src": `${info.src}${params}` })} title={label} loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" />
        </div>
      );
    }
    if (!content.src) return ctx.editing ? <div className="frame frame-empty">Choose a video</div> : null;
    const auto = content.autoplay && !ctx.editing;
    return (
      <div className={`frame vid${content.mobileStill && content.poster ? " vid-still-mobile" : ""}`}>
        <video
          className="media"
          src={content.src}
          poster={content.poster}
          aria-label={label}
          // Autoplay is always muted and inline, or browsers block it.
          muted={content.autoplay}
          playsInline
          loop={content.loop}
          controls={content.controls || !content.autoplay}
          autoPlay={auto && !content.playInView}
          preload={auto ? "metadata" : "none"}
          data-inview={auto && content.playInView ? "" : undefined}
          data-mobile-src={content.mobileSrc || undefined}
        />
        {content.mobileStill && content.poster ? <img className="media vid-still" {...imageSources(content.poster)} alt={content.alt ?? ""} loading="lazy" decoding="async" /> : null}
      </div>
    );
  },
});
