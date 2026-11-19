import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../../editor/fields/media";
import { hexField, matField, onOff } from "../fields";
import type { AoostPlaylistBandContent } from "./AoostPlaylistBand";

export const fields: Fields<AoostPlaylistBandContent> = {
  heading: { type: "text", label: "Heading" },
  playlists: {
    type: "array",
    label: "Playlists",
    arrayFields: {
      title: { type: "text", label: "Title (on the chip)" },
      spotify: { type: "text", label: "Spotify playlist link or id" },
      cover: mediaField("Cover (square), on the sleeve and the disc", "image", { framed: true }),
      color: hexField("Sleeve colour behind the cover"),
      hidden: onOff("Hidden"),
      tracks: {
        type: "array",
        label: "Tracklist override (optional; replaces the list fetched from Spotify)",
        arrayFields: {
          title: { type: "text", label: "Track" },
          artist: { type: "text", label: "Artist" },
        },
        defaultItemProps: { title: "", artist: "" },
        getItemSummary: (t) => [t.title, t.artist].filter(Boolean).join(" · ") || "Track",
      },
    },
    defaultItemProps: { title: "New playlist", spotify: "" },
    getItemSummary: (p) => p.title || "Playlist",
  },
  mat: matField,
};
