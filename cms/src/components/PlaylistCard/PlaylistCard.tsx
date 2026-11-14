import { z } from "zod";
import { imageSources } from "../../render/media";
import { defineComponent } from "../types";
import { css } from "./PlaylistCard.styles";

export const PlaylistCardContent = z.object({
  /** "all" lists every playlist; "one" shows the chosen one. */
  source: z.enum(["all", "one"]),
  playlistId: z.string(),
});
export type PlaylistCardContent = z.infer<typeof PlaylistCardContent>;

/** Accepts a Spotify playlist URL, URI or bare id. */
export function spotifyPlaylistUrl(value: string): string {
  const m = /playlist[/:]([A-Za-z0-9]+)/.exec(value);
  const id = m ? m[1] : value.replace(/[^A-Za-z0-9]/g, "");
  return `https://open.spotify.com/playlist/${id}`;
}

export const PlaylistCard = defineComponent<PlaylistCardContent>({
  type: "PlaylistCard",
  label: "Playlist card",
  category: "site",
  schema: PlaylistCardContent,
  defaults: { content: { source: "all", playlistId: "" } },
  css,
  Render: ({ content, ctx }) => {
    const all = ctx.site.collections.playlists;
    const list = content.source === "all" ? all : all.filter((p) => p.id === content.playlistId);
    if (!list.length) return ctx.editing ? <div className="frame-empty">No playlists yet</div> : null;
    return (
      <ul className="pls">
        {list.map((p) => (
          <li key={p.id}>
            <a className="pl" href={ctx.editing ? undefined : spotifyPlaylistUrl(p.spotify)} target="_blank" rel="noopener">
              <span className="pl-cover">
                {p.cover ? <img {...imageSources(p.cover)} alt="" loading="lazy" decoding="async" /> : null}
              </span>
              <span className="pl-meta">
                <span className="t-h3">{p.title}</span>
                {p.note ? <span className="t-small">{p.note}</span> : null}
                <span className="t-label pl-go">Play on Spotify</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  },
});
