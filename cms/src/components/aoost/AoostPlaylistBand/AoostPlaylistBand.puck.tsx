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
      title: { type: "text", label: "Title (Spotify's own name replaces it on the site)" },
      spotify: { type: "text", label: "Spotify playlist link or id" },
      cover: mediaField("Your cover (square); empty = Spotify's cover", "image", { framed: true }),
      color: hexField("Frame colour behind the cover"),
      hidden: onOff("Hidden"),
    },
    defaultItemProps: { title: "New playlist", spotify: "" },
    getItemSummary: (p) => p.title || "Playlist",
  },
  crumbBold: { type: "text", label: "Breadcrumb, bold part" },
  crumb: { type: "text", label: "Breadcrumb, the rest" },
  hint: { type: "text", label: "Line shown on phones above the Spotify player" },
  mat: matField,
};
