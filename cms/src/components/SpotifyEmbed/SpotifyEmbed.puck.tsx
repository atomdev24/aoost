import type { Fields } from "@puckeditor/core";
import type { SpotifyEmbedContent } from "./SpotifyEmbed";

export const fields: Fields<SpotifyEmbedContent> = {
  url: { type: "text", label: "Spotify link (playlist, album, track, show) or playlist id" },
  compact: {
    type: "radio",
    label: "Player size",
    options: [
      { label: "Full", value: false },
      { label: "Compact", value: true },
    ],
  },
};
