import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { VideoContent } from "./Video";

const onOff = (label: string) => ({
  type: "radio" as const,
  label,
  options: [
    { label: "On", value: true },
    { label: "Off", value: false },
  ],
});

export const fields: Partial<Fields<VideoContent>> = {
  source: {
    type: "radio",
    label: "Source",
    options: [
      { label: "Upload", value: "upload" },
      { label: "YouTube / Vimeo", value: "link" },
    ],
  },
  src: mediaField("Video file (MP4 or WebM)", "video"),
  url: { type: "text", label: "YouTube or Vimeo link" },
  poster: mediaField("Poster frame (shows before it loads)", "image"),
  alt: { type: "text", label: "Description (for screen readers)" },
  autoplay: onOff("Autoplay muted"),
  loop: onOff("Loop"),
  controls: onOff("Controls"),
  playInView: onOff("Play only when in view"),
  mobileSrc: mediaField("Lighter file for phones (optional)", "video"),
  mobileStill: onOff("On phones show the poster instead"),
};
