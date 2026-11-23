import type { Fields } from "@puckeditor/core";
import { useState } from "react";
import { mediaField } from "../../editor/fields/media";
import { updateNode } from "../../model/page-ops";
import { getState, updatePage } from "../../editor/store";

/** The video's title and channel, from the provider's public oEmbed. */
async function lookup(url: string): Promise<{ title?: string; author_name?: string } | null> {
  const api = /vimeo\.com/.test(url) ? "https://vimeo.com/api/oembed.json?url=" : /youtu\.?be/.test(url) ? "https://www.youtube.com/oembed?format=json&url=" : null;
  if (!api) return null;
  try {
    const r = await fetch(api + encodeURIComponent(url));
    return r.ok ? ((await r.json()) as { title?: string; author_name?: string }) : null;
  } catch {
    return null;
  }
}

function VideoLinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = async () => {
    if (draft === null) return;
    const url = draft.trim();
    setDraft(null);
    onChange(url);
    const id = getState().selection[0];
    const info = url ? await lookup(url) : null;
    if (!id || !info) return;
    updatePage(getState().pageId, (p) => updateNode(p, id, (n) => ({ ...n, content: { ...n.content, title: (n.content.title as string) || info.title || undefined, channel: (n.content.channel as string) || info.author_name || undefined } })), "Fill in the video's name");
  };
  return (
    <div className="ed-field">
      <span className="ed-field-label">YouTube or Vimeo link</span>
      <input className="ed-input" type="url" placeholder="https://youtu.be/…" value={draft ?? value} onChange={(e) => setDraft(e.target.value)} onBlur={() => void commit()} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
    </div>
  );
}
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
  // Pasting a link fills in the cover's name and "from" line (from YouTube/Vimeo) when they're empty.
  url: {
    type: "custom",
    label: "YouTube or Vimeo link",
    render: ({ value, onChange }) => <VideoLinkField value={(value as string) ?? ""} onChange={onChange} />,
  },
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
