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
  play: {
    type: "select",
    label: "Cover play button (YouTube / Vimeo)",
    options: [
      { label: "Classic outline", value: "classic" },
      { label: "Blue disc", value: "disc" },
      { label: "Frosted glass", value: "glass" },
      { label: "Labelled pill", value: "pill" },
      { label: "Pulsing ring", value: "ring" },
      { label: "App icon", value: "square" },
      { label: "Bare triangle", value: "triangle" },
    ],
  },
  title: { type: "text", label: "Cover: video name (top left)" },
  channel: { type: "text", label: "Cover: from (e.g. your company)" },
  avatar: mediaField("Cover: logo in the round badge", "image"),
  duration: { type: "text", label: "Cover: length (e.g. 2:40)" },
  autoplay: onOff("Autoplay muted"),
  loop: onOff("Loop"),
  controls: onOff("Controls"),
  playInView: onOff("Play only when in view"),
  mobileSrc: mediaField("Lighter file for phones (optional)", "video"),
  mobileStill: onOff("On phones show the poster instead"),
};
