import { z } from "zod";
import { imageSources } from "../../render/media";
import { Shade } from "../shade";
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
  /** "player": YouTube's or Vimeo's own player straight away, with no cover. */
  play: z.enum(["classic", "disc", "glass", "pill", "ring", "square", "triangle", "player"]).optional(),
  /** The cover's corner line, like a channel line: the video's name, who it's from, their picture. */
  title: z.string().optional(),
  channel: z.string().optional(),
  avatar: z.string().optional(),
  /** Shown on the cover, e.g. "2:40". */
  duration: z.string().optional(),
});
export const PLAY_STYLES = ["classic", "disc", "glass", "pill", "ring", "square", "triangle", "player"] as const;
export type VideoContent = z.infer<typeof VideoContent>;

/** YouTube's thumbnail pictures, best first. All 16:9: the 4:3 ones (hqdefault, sddefault) have black bars. */
const YT_FALLBACK = ["hq720", "mqdefault"];
const ytThumb = (id: string, name: string) => `https://i.ytimg.com/vi/${id}/${name}.jpg`;
/** Step a thumbnail to the next size in its fallback list (the editor; the site does the same in runtime/video.ts). */
export function nextYtThumb(img: HTMLImageElement) {
  const [next, ...rest] = (img.dataset.ytFallback ?? "").split(" ").filter(Boolean);
  if (!next) return;
  img.dataset.ytFallback = rest.join(" ");
  img.src = next;
}

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
  Render: ({ node, content, ctx }) => {
    const label = content.alt || "Video";
    if (content.source === "link") {
      const info = content.url ? embedFor(content.url) : null;
      if (!info || (info.provider !== "youtube" && info.provider !== "vimeo")) return ctx.editing ? <div className="frame frame-empty">Double-click to paste a YouTube or Vimeo link</div> : null;
      const params = `?${info.provider === "youtube" ? "playsinline=1&rel=0" : "dnt=1"}${content.loop ? "&loop=1" : ""}${content.controls ? "" : "&controls=0"}`;
      // With a cover the player only loads on click: nothing from YouTube or Vimeo until then.
      // A YouTube link shows its own thumbnail as the cover by default; "player" asks for the plain player.
      const play = content.play && content.play !== "player" ? content.play : "classic";
      const ytId = info.provider === "youtube" ? info.src.split("/").pop() : undefined;
      // YouTube's full-size thumbnail (1280 wide), then the 720p and small 16:9 ones (never the 4:3 sizes, which
      // carry black bars): runtime/video.ts on the site, onError in the editor.
      const poster = content.play === "player" ? "" : content.poster || (ytId ? ytThumb(ytId, "maxresdefault") : "");
      if (poster) {
        const name = content.title?.trim();
        const channel = content.channel?.trim();
        return (
          <div className="frame vid">
            <button type="button" className={`vid-facade vid-p-${play}`} data-video-embed={ctx.editing ? undefined : `${info.src}${params}&autoplay=1`} aria-label={`Play ${name || label}`}>
              <img
                className="media"
                {...(poster.startsWith("/") ? imageSources(poster) : { src: poster })}
                {...(content.poster ? {} : { "data-yt-fallback": YT_FALLBACK.map((n) => ytThumb(ytId!, n)).join(" "), onError: (e: React.SyntheticEvent<HTMLImageElement>) => nextYtThumb(e.currentTarget) })}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <Shade node={node} />
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
          <Shade node={node} />
        </div>
      );
    }
    if (!content.src) return ctx.editing ? <div className="frame frame-empty">Double-click to choose a video or paste a link</div> : null;
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
        <Shade node={node} />
      </div>
    );
  },
});
