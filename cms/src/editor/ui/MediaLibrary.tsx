import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./uploads.css";
import { MEDIA_MIME, type DraggedMedia } from "../canvas/drops";
import type { MediaKind } from "../fields/media";
import { deleteMedia, formatSize, isCancelled, listMedia, uploadFile, type MediaItem } from "../media";
import { mediaUsage } from "../media-usage";
import { useEditor } from "../store";
import { tagName, versionCounts, versionKey } from "./media-names";

const KIND_FILTER: Record<MediaKind, (item: MediaItem) => boolean> = {
  image: (i) => i.kind === "image",
  video: (i) => i.kind === "video",
  audio: (i) => i.kind === "audio",
  font: (i) => i.kind === "font",
  file: (i) => i.kind === "file" || i.kind === "model" || i.kind === "lottie",
  any: () => true,
};

const KIND_GLYPH: Record<string, string> = { video: "▶", audio: "♪", file: "↓", font: "Aa", model: "3D", lottie: "{ }" };
type Chip = "all" | "images" | "video" | "unused";
type View = "masonry" | "list";
const VIEW_KEY = "aoost.media.view";

const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "masonry";
  } catch {
    return "masonry";
  }
};
const thumbUrl = (item: MediaItem, w = 480) => (/\.(svg|gif)$/i.test(item.key) || !item.variants?.length ? item.url : `${item.url}?w=${w}`);
const duration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Start dragging a library item: drop it on an image to replace it, or on the page to place it. */
const dragStart = (item: MediaItem) => (e: React.DragEvent) => {
  const data: DraggedMedia = { url: item.url, kind: item.kind, width: item.width, height: item.height, name: item.name };
  e.dataTransfer.setData(MEDIA_MIME, JSON.stringify(data));
  e.dataTransfer.setData("text/uri-list", item.url);
  e.dataTransfer.effectAllowed = "copy";
};

/**
 * The media library: a two-column masonry (or a list) of what is in R2, with
 * a blue dot on files used anywhere on the site and an "Unused" filter.
 * Upload with the button or by dropping files anywhere on it; drag an item
 * onto the canvas or onto an image to place or replace it. Used as the Media
 * flyout and as the picker behind every "Choose" / "Replace" button.
 */
export function MediaLibrary({ kind = "any", onPick, compact }: { kind?: MediaKind; onPick?: (item: MediaItem) => void; compact?: boolean }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [chip, setChip] = useState<Chip>("all");
  const [query, setQuery] = useState("");
  const [view, setViewState] = useState<View>(readView);
  const input = useRef<HTMLInputElement>(null);
  const site = useEditor((s) => s.site);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not remembered */
    }
  };

  const refresh = useCallback(() => {
    listMedia()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    const list = [...files];
    // All at once: each shows in the upload tray with its own progress bar and Cancel button.
    await Promise.all(
      list.map(async (file) => {
        try {
          const item = await uploadFile(file);
          setItems((prev) => [item, ...(prev ?? [])]);
          if (onPick && list.length === 1 && KIND_FILTER[kind](item)) onPick(item);
        } catch (e) {
          // the tray says what happened; nothing more to show here
          if (!isCancelled(e)) console.warn(e);
        }
      }),
    );
  };

  const usage = useMemo(() => mediaUsage(site, (items ?? []).map((i) => i.url)), [site, items]);
  const versions = useMemo(() => versionCounts((items ?? []).map((i) => i.name)), [items]);
  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter(
    (i) =>
      KIND_FILTER[kind](i) &&
      (chip === "all" || (chip === "images" && i.kind === "image") || (chip === "video" && i.kind === "video") || (chip === "unused" && !usage.get(i.url)?.length)) &&
      (!q || i.name.toLowerCase().includes(q)),
  );

  const tools = (item: MediaItem) => (
    <span className="ed-asset-tools">
      <button
        type="button"
        className="ed-mini"
        aria-label={`Copy the URL of ${item.name}`}
        title="Copy URL"
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard?.writeText(item.url);
          setCopied(item.key);
          setTimeout(() => setCopied(null), 1200);
        }}
      >
        {copied === item.key ? "✓" : "⧉"}
      </button>
      <button
        type="button"
        className="ed-mini"
        aria-label={`Delete ${item.name}`}
        title="Delete from the library"
        onClick={(e) => {
          e.stopPropagation();
          const used = usage.get(item.url) ?? [];
          if (!window.confirm(`Delete ${item.name}?${used.length ? ` It is used on ${used.join(", ")}, which will show a broken image.` : ""}`)) return;
          deleteMedia(item.key)
            .then(() => setItems((prev) => (prev ?? []).filter((x) => x.key !== item.key)))
            .catch((err: Error) => setError(err.message));
        }}
      >
        ×
      </button>
    </span>
  );

  const preview = (item: MediaItem, w?: number) =>
    item.kind === "image" ? (
      <img src={thumbUrl(item, w)} alt="" loading="lazy" draggable={false} width={item.width} height={item.height} />
    ) : item.kind === "video" ? (
      <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline draggable={false} />
    ) : (
      <span className="ed-asset-glyph">{KIND_GLYPH[item.kind] ?? "↓"}</span>
    );

  return (
    <div
      className={`ed-library ed-medialib${over ? " is-over" : ""}${compact ? " is-compact" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        void upload(e.dataTransfer.files);
      }}
    >
      <div className="ed-medialib-head">
        <input className="ed-input ed-search" type="search" placeholder="Search" aria-label="Search media" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="ed-seg ed-viewtoggle" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "masonry"} aria-label="Grid view" title="Grid" onClick={() => setView("masonry")}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="2" y="2" width="5" height="7" rx="1" />
              <rect x="9" y="2" width="5" height="4" rx="1" />
              <rect x="2" y="11" width="5" height="3" rx="1" />
              <rect x="9" y="8" width="5" height="6" rx="1" />
            </svg>
          </button>
          <button type="button" aria-pressed={view === "list"} aria-label="List view" title="List" onClick={() => setView("list")}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 4h8M6 8h8M6 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5" />
            </svg>
          </button>
        </div>
        <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" onClick={() => input.current?.click()}>
          Upload
        </button>
      </div>
      <div className="ed-chips" role="tablist" aria-label="Media filter">
        {(
          [
            ["all", "All"],
            ...(kind === "any" ? [["images", "Images"] as const, ["video", "Video"] as const] : []),
            ["unused", "Unused"],
          ] as [Chip, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" className="ed-chip-sm" aria-selected={chip === id} onClick={() => setChip(id)}>
            {label}
          </button>
        ))}
      </div>
      <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files?.length && void upload(e.target.files).then(() => (e.target.value = ""))} />
      <button type="button" className="ed-drop ed-medialib-drop" onClick={() => input.current?.click()}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13V3.5M6 7.5l4-4 4 4M3.5 12.5v2.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
        </svg>
        <span>Drop files here, or click to choose</span>
        <small>Pictures, video, audio and fonts, up to 95 MB each</small>
      </button>
      {over ? (
        <div className="ed-medialib-over" aria-hidden="true">
          <span>Drop to upload</span>
        </div>
      ) : null}
      {!compact ? <p className="ed-hint ed-medialib-tip">Drag an item onto the page, or onto a picture to replace it.</p> : null}
      {error ? (
        <p className="ed-note" role="alert">
          {error}
        </p>
      ) : null}
      {items === null && !error ? <p className="ed-hint">Loading…</p> : null}
      {items && !shown.length ? <p className="ed-hint">{chip === "unused" ? "Every file is in use." : q ? `Nothing matches "${query}".` : "Nothing here yet."}</p> : null}
      {view === "masonry" ? (
        <ul className="ed-masonry ed-masonry-tagged" aria-label="Media">
          {shown.map((item) => {
            const used = usage.get(item.url) ?? [];
            return (
              <li key={item.key} className="ed-masonry-item" data-used={used.length ? "true" : "false"}>
                <button type="button" className="ed-masonry-tile" draggable onDragStart={dragStart(item)} onClick={() => onPick?.(item)} title={`${item.name}${used.length ? ` · used on ${used.join(", ")}` : " · not used"}${onPick ? "" : " · drag onto the page"}`} aria-label={onPick ? `Use ${item.name}` : item.name}>
                  <span className="ed-masonry-media" style={item.width && item.height ? { aspectRatio: `${item.width} / ${item.height}` } : undefined}>
                    {preview(item)}
                    {item.kind === "video" ? <span className="ed-play" aria-hidden="true">▶</span> : null}
                    <span className="ed-mtag">{tagName(item.name)}</span>
                    {(versions.get(versionKey(item.name)) ?? 1) > 1 ? (
                      <span className="ed-mversions" title={`${versions.get(versionKey(item.name))} versions of this picture. Search "${versionKey(item.name)}" to see them together.`}>
                        {versions.get(versionKey(item.name))}
                      </span>
                    ) : null}
                  </span>
                  {used.length ? <span className="ed-used-dot" aria-label={`Used on ${used.join(", ")}`} role="img" /> : null}
                </button>
                {tools(item)}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="ed-medialist" aria-label="Media">
          {shown.map((item) => {
            const used = usage.get(item.url) ?? [];
            return (
              <li key={item.key} data-used={used.length ? "true" : "false"}>
                <button type="button" className="ed-medialist-row" draggable onDragStart={dragStart(item)} onClick={() => onPick?.(item)} aria-label={onPick ? `Use ${item.name}` : item.name}>
                  <span className="ed-medialist-thumb">
                    {item.kind === "video" ? <VideoThumb item={item} /> : preview(item, 96)}
                    {used.length ? <span className="ed-used-dot" role="img" aria-label="Used" /> : null}
                  </span>
                  <span className="ed-medialist-text">
                    <span className="ed-medialist-name">{item.name}</span>
                    <span className="ed-medialist-meta">
                      {item.width ? `${item.width}×${item.height}` : item.kind === "video" ? <VideoLength url={item.url} /> : item.kind} · {formatSize(item.size)}
                    </span>
                    <span className={`ed-medialist-used${used.length ? " is-used" : ""}`}>{used.length ? `used on: ${used.join(", ")}` : "not used"}</span>
                  </span>
                </button>
                {tools(item)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VideoThumb({ item }: { item: MediaItem }) {
  return (
    <>
      <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline />
      <span className="ed-play" aria-hidden="true">
        ▶
      </span>
    </>
  );
}

/** A video's length, read from its metadata. */
function VideoLength({ url }: { url: string }) {
  const [len, setLen] = useState<number | null>(null);
  useEffect(() => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => setLen(v.duration);
    return () => {
      v.removeAttribute("src");
      v.load();
    };
  }, [url]);
  return <>{len && Number.isFinite(len) ? duration(len) : "video"}</>;
}
