import { z } from "zod";
import { defineComponent } from "../../types";
import { Block, Head } from "../Block";
import { aoostKit, matBand } from "../kit";
import { css } from "./AoostPlaylistBand.styles";

export const AoostPlaylist = z.object({
  /** Shown until Spotify answers with the playlist's real name (on the site Spotify's name wins). */
  title: z.string(),
  /** A Spotify playlist link, or just its id. */
  spotify: z.string(),
  /** Your own cover (square, 1080 × 1080). Without one the Spotify cover is used. */
  cover: z.string().optional(),
  /** The frame's colour behind the cover while it loads. */
  color: z.string().optional(),
  hidden: z.boolean().optional(),
});

export const AoostPlaylistBandContent = z.object({
  mat: z.enum(["none", "light", "dark"]),
  heading: z.string(),
  /** The breadcrumb over the frames: the bold part, then the rest. */
  crumbBold: z.string(),
  crumb: z.string(),
  /** The line shown on phones, where the Spotify player itself has to be tapped. */
  hint: z.string(),
  playlists: z.array(AoostPlaylist),
});
export type AoostPlaylistBandContent = z.infer<typeof AoostPlaylistBandContent>;

/** Spotify calls them "Disc - 1 - Rock"; on the canvas that reads "Disc 1 · Rock" (same rule as the script). */
export function frameName(title: string, i: number): string {
  const m = /disc\s*-?\s*(\d+)\s*-\s*(.+)/i.exec(title);
  return m ? `Disc ${m[1]} · ${m[2]}` : title.includes(" - ") ? title.split(/\s+-\s+/).join(" · ") : `Disc ${i + 1} · ${title}`;
}

export const AoostPlaylistBand = defineComponent<AoostPlaylistBandContent>({
  type: "AoostPlaylistBand",
  label: "Playlists: discs and the mini player",
  category: "aoost",
  kit: aoostKit,
  band: matBand,
  schema: AoostPlaylistBandContent,
  defaults: {
    content: {
      mat: "dark",
      heading: "playlists",
      crumbBold: "aoost",
      crumb: " / Page 1 / playlist",
      hint: "Tap play on the player below. Tap a disc to switch playlists.",
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
    return (
      <Block name="playlists" mat={content.mat} data={content}>
        <section className="cv focus-sec" id="band" aria-labelledby="h-pl">
          <div className="cv-in" id="cvIn">
            <Head id="h-pl" title={content.heading} index={3} className="cv-head" />
            <p className="cv-pg" id="h-discs">
              <b>{content.crumbBold}</b>
              {content.crumb}
            </p>
            {/* The script builds these frames (and keeps them in step with Spotify); this is the same markup for the first paint and the editor. */}
            <div className="cv-frames" id="discs" role="group" aria-label="Playlists">
              {list.map((p, i) => (
                <div key={i} className="cv-frame" data-on={i === 0 ? 1 : 0}>
                  <span className="cv-fl">{frameName(p.title, i)}</span>
                  <button className="disc" aria-pressed={i === 0} aria-label={`${p.title} playlist`} style={p.color ? { background: p.color } : undefined}>
                    {p.cover ? <img src={p.cover} alt="" decoding="async" /> : null}
                  </button>
                  <div className="cv-sel" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <em />
                  </div>
                </div>
              ))}
            </div>
            <div className="cv-cursor" id="cvCursor" aria-hidden="true">
              <svg viewBox="0 0 18 18">
                <path d="M2 1.5l13 6.2-5.6 1.6-2.4 5.3z" fill="#F24E9C" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="cv-tool" id="mw">
              <button className="cv-b cv-skip" id="mwPrev" aria-label="Previous playlist">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6h2v12H6z" fill="currentColor" />
                  <path d="M9.5 12l8.5 6V6z" fill="currentColor" />
                </svg>
              </button>
              <button className="cv-b cv-play" id="mwPlay" aria-label="Play" />
              <button className="cv-b cv-skip" id="mwNext" aria-label="Next playlist">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 6h2v12h-2z" fill="currentColor" />
                  <path d="M6 6v12l8.5-6z" fill="currentColor" />
                </svg>
              </button>
              <span className="cv-sep" />
              <div className="cv-mid">
                <div className="cv-t">
                  <span id="mwTitle">{list[0]?.title ?? ""}</span>
                  <span className="cv-time" id="mwTime">
                    00:00 / 00:00
                  </span>
                </div>
                <div className="cv-bar" id="mwWave" role="slider" tabIndex={0} aria-label="Playback position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
                  <b id="mwFill" />
                </div>
              </div>
              <span className="cv-sep" />
              <a className="cv-b" id="mwOpen" href="https://open.spotify.com/" target="_blank" rel="noopener" aria-label="Open in Spotify">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </a>
            </div>
          </div>
          <p className="sp-hint">
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24" width="12" height="12">
                <path d="M7 4.5v15l12.5-7.5z" fill="#fff" />
              </svg>
            </i>
            {content.hint}
          </p>
          <div className="sp-host" aria-hidden="true">
            <div id="spHost" />
          </div>
        </section>
      </Block>
    );
  },
});
