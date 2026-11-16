import { z } from "zod";
import { EmbedFrame } from "../Embed/Embed";
import { css } from "../Embed/Embed.styles";
import { defineComponent } from "../types";

export const SpotifyEmbedContent = z.object({
  /** A Spotify share link or a bare playlist id. */
  url: z.string(),
  compact: z.boolean(),
});
export type SpotifyEmbedContent = z.infer<typeof SpotifyEmbedContent>;

/** Accept "2FeVxQ…" as shorthand for a playlist link. */
export const spotifyUrl = (value: string) => (/^[A-Za-z0-9]{16,}$/.test(value.trim()) ? `https://open.spotify.com/playlist/${value.trim()}` : value);

export const SpotifyEmbed = defineComponent<SpotifyEmbedContent>({
  type: "SpotifyEmbed",
  label: "Spotify embed",
  category: "embed",
  schema: SpotifyEmbedContent,
  defaults: { content: { url: "", compact: false } },
  css,
  Render: ({ content, ctx }) => {
    const url = spotifyUrl(content.url);
    if (url && !/^https?:\/\/open\.spotify\.com\//.test(url)) return ctx.editing ? <div className="frame-empty">That is not a Spotify link</div> : null;
    return <EmbedFrame url={url} compact={content.compact} editing={ctx.editing} />;
  },
});
