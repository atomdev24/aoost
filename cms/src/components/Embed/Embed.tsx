import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./Embed.styles";
import { EMBED_PROVIDERS, embedFor } from "./providers";

export const EmbedContent = z.object({
  /** A share link from Spotify, YouTube, Vimeo, SoundCloud, Instagram or Google Maps. */
  url: z.string(),
  /** Spotify only: the short player. */
  compact: z.boolean().optional(),
});
export type EmbedContent = z.infer<typeof EmbedContent>;

export function EmbedFrame({ url, compact, editing }: { url: string; compact?: boolean; editing: boolean }) {
  const info = url ? embedFor(url, { compact }) : null;
  if (!info) return editing ? <div className="frame-empty">{url ? `That link isn't from ${EMBED_PROVIDERS}` : `Paste a link from ${EMBED_PROVIDERS}`}</div> : null;
  return (
    <div className="embed" data-provider={info.provider} style={info.height ? { height: info.height } : { aspectRatio: info.aspect }}>
      <iframe
        // On the site the frame gets its address only when scrolled near (runtime/lazy.ts); the editor shows it right away.
        {...(editing ? { src: info.src } : { "data-src": info.src })}
        title={info.title}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms"
      />
    </div>
  );
}

export const Embed = defineComponent<EmbedContent>({
  type: "Embed",
  label: "Embed",
  category: "embed",
  schema: EmbedContent,
  defaults: { content: { url: "" } },
  css,
  Render: ({ content, ctx }) => <EmbedFrame url={content.url} compact={content.compact} editing={ctx.editing} />,
});
