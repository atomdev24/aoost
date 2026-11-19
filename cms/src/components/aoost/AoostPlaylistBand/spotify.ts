/**
 * Spotify playlist data for the playlists band, read at build time from Spotify's public embed
 * page (no API key). The page carries the playlist as JSON in its __NEXT_DATA__ script.
 */

export type Track = {
  title: string;
  artist: string;
  /** Milliseconds; 0 when unknown (manual rows). */
  durationMs: number;
  /** spotify:track:… ; empty for manual rows and local files, which can't be played from the site. */
  uri: string;
};

export type FetchedPlaylist = { name: string; tracks: Track[] };

/** The committed copy: playlist id → what Spotify's embed page said the last time it answered. */
export type GeneratedPlaylists = { playlists: Record<string, FetchedPlaylist> };

/** A Spotify playlist link, URI or bare id → the id. */
export function spotifyId(v: string | undefined): string {
  const m = /playlist[/:]([A-Za-z0-9]+)/.exec(v || "");
  return m ? m[1]! : String(v || "").replace(/[^A-Za-z0-9]/g, "");
}

export const embedUrl = (id: string) => `https://open.spotify.com/embed/playlist/${id}`;

/** 194666 → "3:15". Empty for unknown durations. */
export function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return "";
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

type RawTrack = { uri?: unknown; title?: unknown; subtitle?: unknown; duration?: unknown };

/** Read a playlist out of an embed page's HTML. Throws when the page has no playlist in it. */
export function parseEmbed(html: string): FetchedPlaylist {
  const m = /<script[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("no __NEXT_DATA__ on the page");
  const data = JSON.parse(m[1]!);
  const entity = data?.props?.pageProps?.state?.data?.entity;
  if (!entity || !Array.isArray(entity.trackList)) throw new Error("no track list in __NEXT_DATA__");
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const tracks = (entity.trackList as RawTrack[])
    .map((t) => {
      const uri = str(t.uri);
      return { title: str(t.title), artist: str(t.subtitle), durationMs: typeof t.duration === "number" ? Math.round(t.duration) : 0, uri: uri.startsWith("spotify:track:") ? uri : "" };
    })
    .filter((t) => t.title);
  return { name: str(entity.name) || str(entity.title), tracks };
}
