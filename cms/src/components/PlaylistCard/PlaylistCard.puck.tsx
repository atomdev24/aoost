import type { Fields } from "@puckeditor/core";
import { collectionField } from "../../editor/fields/custom";
import type { PlaylistCardContent } from "./PlaylistCard";

export const fields: Fields<PlaylistCardContent> = {
  source: {
    type: "radio",
    label: "Show",
    options: [
      { label: "All playlists", value: "all" },
      { label: "One playlist", value: "one" },
    ],
  },
  playlistId: collectionField("Playlist", (site) => site.collections.playlists.map((p) => ({ value: p.id, label: p.title }))),
};
