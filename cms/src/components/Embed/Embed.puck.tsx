import type { Fields } from "@puckeditor/core";
import type { EmbedContent } from "./Embed";

export const fields: Fields<EmbedContent> = {
  url: { type: "text", label: "Link (Spotify, YouTube, Vimeo, SoundCloud, Instagram, Google Maps)" },
  compact: {
    type: "radio",
    label: "Spotify player size",
    options: [
      { label: "Full", value: false },
      { label: "Compact", value: true },
    ],
  },
};
