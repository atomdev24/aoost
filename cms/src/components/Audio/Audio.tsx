import { z } from "zod";
import { defineComponent } from "../types";
import { css } from "./Audio.styles";

export const AudioContent = z.object({ src: z.string(), title: z.string(), artist: z.string().optional() });
export type AudioContent = z.infer<typeof AudioContent>;

export const Audio = defineComponent<AudioContent>({
  type: "Audio",
  label: "Audio player",
  category: "media",
  schema: AudioContent,
  defaults: { content: { src: "", title: "Untitled track" } },
  css,
  Render: ({ content, ctx }) => {
    if (!content.src) return ctx.editing ? <div className="frame-empty">Choose an audio file</div> : null;
    return (
      <figure className="aud">
        <figcaption>
          <span className="t-h3">{content.title}</span>
          {content.artist ? <span className="t-small">{content.artist}</span> : null}
        </figcaption>
        <audio controls preload="none" src={content.src} aria-label={content.title} />
      </figure>
    );
  },
});
