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
  /** A YouTube or Vimeo link behind our own cover: the play button's look. */
  play: z.enum(["classic", "disc", "glass", "pill", "ring", "square", "triangle"]).optional(),
  /** The cover's corner line, like a channel line: the video's name, who it's from, their picture. */
  title: z.string().optional(),
  channel: z.string().optional(),
  avatar: z.string().optional(),
  /** Shown on the cover, e.g. "2:40". */
  duration: z.string().optional(),
});
export const PLAY_STYLES = ["classic", "disc", "glass", "pill", "ring", "square", "triangle"] as const;
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
      // With a cover the player only loads on click: nothing from YouTube or Vimeo until then
      // (without a poster of our own, YouTube's thumbnail picture stands in).
      const play = content.play ?? "classic";
      const ytId = info.provider === "youtube" ? info.src.split("/").pop() : undefined;
      const poster = content.poster || (content.play && ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : "");
      if (poster) {
        const name = content.title?.trim();
        const channel = content.channel?.trim();
        return (
          <div className="frame vid">
            <button type="button" className={`vid-facade vid-p-${play}`} data-video-embed={ctx.editing ? undefined : `${info.src}${params}&autoplay=1`} aria-label={`Play ${name || label}`}>
              <img className="media" {...(poster.startsWith("/") ? imageSources(poster) : { src: poster })} alt="" loading="lazy" decoding="async" />
              {name || channel ? (
                <span className="vid-chan">
                  <span className="vid-av">{content.avatar ? <img src={content.avatar} alt="" /> : (channel || name || "?").slice(0, 1).toUpperCase()}</span>
                  <span className="vid-chan-text">
                    {name ? <b>{name}</b> : null}
                    {channel ? <small>{channel}</small> : null}
                  </span>
                </span>
              ) : null}
              {play === "classic" ? (
                <span className="vid-play">
                  <PlayIcon />
                </span>
              ) : (
                <span className="vid-pb" aria-hidden="true">
                  {play === "pill" ? (
                    <>
                      <i>
                        <span className="vid-tri" />
                      </i>
                      Watch the video{content.duration ? <span className="vid-pill-dur">{content.duration}</span> : null}
                    </>
                  ) : (
                    <span className="vid-tri" />
                  )}
                </span>
              )}
              {content.duration && play !== "pill" ? <span className="vid-dur">{content.duration}</span> : null}
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
