/** Paste-a-link embeds (SPEC §7): turn a share URL into a safe iframe source. */
export type EmbedInfo = {
  provider: "spotify" | "youtube" | "vimeo" | "soundcloud" | "instagram" | "maps";
  src: string;
  title: string;
  /** Fixed height in px, or an aspect ratio for video-like embeds. */
  height?: number;
  aspect?: string;
};

const clean = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "");

export function embedFor(raw: string, opts: { compact?: boolean } = {}): EmbedInfo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "open.spotify.com") {
    const i = parts.findIndex((p) => ["playlist", "album", "track", "artist", "episode", "show"].includes(p));
    if (i < 0 || !parts[i + 1]) return null;
    const type = parts[i]!;
    const tall = type !== "track" && type !== "episode" && !opts.compact;
    return { provider: "spotify", src: `https://open.spotify.com/embed/${type}/${clean(parts[i + 1]!)}`, title: `Spotify ${type}`, height: tall ? 352 : 152 };
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id = host === "youtu.be" ? parts[0] : (url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0] ?? "") ? parts[1] : undefined));
    if (!id) return null;
    return { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${clean(id)}`, title: "YouTube video", aspect: parts[0] === "shorts" ? "9/16" : "16/9" };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((p) => /^\d+$/.test(p));
    return id ? { provider: "vimeo", src: `https://player.vimeo.com/video/${id}`, title: "Vimeo video", aspect: "16/9" } : null;
  }
  if (host === "soundcloud.com" && parts.length >= 1) {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com/${parts.map(clean).join("/")}`)}&color=%23B5421A&show_comments=false&hide_related=true`;
    return { provider: "soundcloud", src, title: "SoundCloud player", height: parts.includes("sets") || parts.length === 1 ? 352 : 166 };
  }
  if (host === "instagram.com" && ["p", "reel", "tv"].includes(parts[0] ?? "") && parts[1]) {
    return { provider: "instagram", src: `https://www.instagram.com/${parts[0]}/${clean(parts[1])}/embed`, title: "Instagram post", height: 620 };
  }
  if ((host === "google.com" || host.endsWith(".google.com") || host === "maps.app.goo.gl" || host === "goo.gl") && (host !== "google.com" || parts[0] === "maps")) {
    if (parts[1] === "embed") return { provider: "maps", src: url.toString(), title: "Google Map", aspect: "4/3" };
    // /maps/place/<name>/… or ?q=<query>
    const query = url.searchParams.get("q") ?? (parts[1] === "place" && parts[2] ? decodeURIComponent(parts[2].replace(/\+/g, " ")) : null);
    return query ? { provider: "maps", src: `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`, title: `Map of ${query}`, aspect: "4/3" } : null;
  }
  return null;
}

export const EMBED_PROVIDERS = "Spotify, YouTube, Vimeo, SoundCloud, Instagram or Google Maps";
