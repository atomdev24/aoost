import { z } from "zod";
import generated from "../../../generated/playlists.json";
import { ResponsiveFrameFit } from "../../../schema";
import { defineComponent } from "../../types";
import { Block, Head } from "../Block";
import { shownSlots } from "../frames";
import { aoostKit, matBand } from "../kit";
import { fmtDuration, spotifyId, type GeneratedPlaylists, type Track } from "./spotify";
import { css } from "./AoostPlaylistBand.styles";

export const AoostPlaylist = z.object({
  /** The name on the chip. */
  title: z.string(),
  /** A Spotify playlist link, or just its id. */
  spotify: z.string(),
  /** Your own cover (square, 1080 × 1080), on the sleeve and the disc's label. */
  cover: z.string().optional(),
  /** Framing of the cover, per screen size. */
  frame: ResponsiveFrameFit.optional(),
  /** The sleeve's colour behind the cover while it loads. */
  color: z.string().optional(),
  hidden: z.boolean().optional(),
  /** Typed-in tracks, used instead of the list fetched from Spotify (for when the fetch fails). */
  tracks: z.array(z.object({ title: z.string(), artist: z.string().optional() })).optional(),
});
export type AoostPlaylist = z.infer<typeof AoostPlaylist>;

export const AoostPlaylistBandContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  heading: z.string(),
  playlists: z.array(AoostPlaylist),
});
export type AoostPlaylistBandContent = z.infer<typeof AoostPlaylistBandContent>;

/** How many tracks show before "+ N more". */
export const SHOWN_TRACKS = 8;

const FETCHED = (generated as GeneratedPlaylists).playlists;

/** The tracks to list: the manual override when it has rows, else the copy fetched from Spotify at build time. */
export function tracksFor(p: AoostPlaylist, fetched: GeneratedPlaylists["playlists"] = FETCHED): Track[] {
  const manual = (p.tracks ?? []).filter((t) => t.title?.trim());
  if (manual.length) return manual.map((t) => ({ title: t.title.trim(), artist: t.artist?.trim() ?? "", durationMs: 0, uri: "" }));
  return fetched[spotifyId(p.spotify)]?.tracks ?? [];
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Tracklist({ playlist, tracks, index, shown }: { playlist: AoostPlaylist; tracks: Track[]; index: number; shown: boolean }) {
  const first = tracks.slice(0, SHOWN_TRACKS);
  const more = tracks.length - first.length;
  const open = `https://open.spotify.com/playlist/${spotifyId(playlist.spotify)}`;
  return (
    <div className="pl-list" data-i={index} hidden={!shown}>
      {first.length ? (
        <ol className="pl-tracks" aria-label={`${playlist.title} tracks`}>
          {first.map((t, k) => {
            const inner = (
              <>
                <span className="pl-n">{pad(k + 1)}</span>
                <span className="pl-tt">
                  <span className="pl-ti">{t.title}</span>
                  {t.artist ? <span className="pl-ar"> · {t.artist}</span> : null}
                </span>
                <span className="pl-du">{fmtDuration(t.durationMs)}</span>
              </>
            );
            return (
              <li key={k}>
                {t.uri ? (
                  <button className="pl-track" type="button" data-uri={t.uri} aria-current={k === 0 ? "true" : undefined}>
                    {inner}
                  </button>
                ) : (
                  <span className="pl-track" aria-current={k === 0 ? "true" : undefined}>
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
      <a className="pl-more" href={open} target="_blank" rel="noopener">
        {more > 0 ? `+ ${more} more · open in Spotify ↗` : "open in Spotify ↗"}
      </a>
    </div>
  );
}

export const AoostPlaylistBand = defineComponent<AoostPlaylistBandContent>({
  type: "AoostPlaylistBand",
  label: "Playlists: sleeve and tracklist",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostPlaylistBandContent,
  frames: (content) =>
    shownSlots(content.playlists, (p) => !!p.spotify && !p.hidden, (p, i, k) => (p.cover ? { path: ["playlists", i], label: `${p.title} cover`, kind: "img", selector: `.pl-sleeves>.pl-rec:nth-child(${k})>.pl-sleeve>img`, src: p.cover } : null)),
  defaults: {
    content: {
      mat: "dark",
      heading: "Playlists",
      // Today's live playlists.
      playlists: [
        { title: "Rock", spotify: "2FeVxQ6ZPLOAuoejGJj9Fb", cover: "/art/cover-disc1.jpg" },
        { title: "Alt", spotify: "3PbXJWUZ4RooUU0aSSdDi0", cover: "/art/cover-disc2.jpg" },
        { title: "H | T | R", spotify: "6KYCNr0X6Zt189pYxHMx1j", cover: "/art/cover-disc3.jpg" },
      ],
    },
  },
  css,
  Render: ({ content }) => {
    const list = content.playlists.filter((p) => p.spotify && !p.hidden);
    // The script only needs each playlist's id, in chip order.
    const data = { playlists: list.map((p) => ({ id: spotifyId(p.spotify) })) };
    return (
      <Block name="playlists" mat={content.mat} data={data}>
        <section className="pl focus-sec" id="band" aria-labelledby="h-pl">
          <div className="pl-in">
            <Head id="h-pl" title={content.heading} index={3} className="pl-head" />
            <div className="pl-chips" role="group" aria-label="Playlists">
              {list.map((p, i) => (
                <button key={i} className="pl-chip" type="button" data-i={i} aria-pressed={i === 0}>
                  {p.title}
                </button>
              ))}
            </div>
            <div className="pl-stage">
              <div className="pl-sleeves">
                {list.map((p, i) => (
                  <figure key={i} className="pl-rec" data-i={i} hidden={i !== 0}>
                    <div className="pl-sleeve" style={p.color ? { background: p.color } : undefined}>
                      {p.cover ? <img src={p.cover} alt="" decoding="async" /> : null}
                    </div>
                    <div className="pl-disc" aria-hidden="true">
                      <span className="pl-lbl">{p.cover ? <img src={p.cover} alt="" decoding="async" /> : null}</span>
                    </div>
                  </figure>
                ))}
              </div>
              <div className="pl-side">
                {list.map((p, i) => (
                  <Tracklist key={i} playlist={p} tracks={tracksFor(p)} index={i} shown={i === 0} />
                ))}
                <div className="pl-player">
                  <div id="spHost" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </Block>
    );
  },
});
