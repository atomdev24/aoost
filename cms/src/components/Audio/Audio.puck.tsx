import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { AudioContent } from "./Audio";

export const fields: Fields<AudioContent> = {
  src: mediaField("Audio file (MP3, M4A, WAV, OGG)", "audio"),
  title: { type: "text", label: "Title" },
  artist: { type: "text", label: "Artist or note" },
};
