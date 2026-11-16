import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaKind } from "../fields/media";
import { deleteMedia, formatSize, listMedia, uploadFile, type MediaItem } from "../media";

const KIND_FILTER: Record<MediaKind, (item: MediaItem) => boolean> = {
  image: (i) => i.kind === "image",
  video: (i) => i.kind === "video",
  audio: (i) => i.kind === "audio",
  font: (i) => i.kind === "font",
  file: (i) => i.kind === "file" || i.kind === "model" || i.kind === "lottie",
  any: () => true,
};

const KIND_GLYPH: Record<string, string> = { video: "▶", audio: "♪", file: "↓", font: "Aa", model: "3D", lottie: "{ }" };

/**
 * The media library: drop files anywhere on it (or click to browse), see
 * what is in R2, and pick, copy or delete. Used as the Assets panel and as
 * the picker behind every "Choose" button.
 */
export function MediaLibrary({ kind = "any", onPick, compact }: { kind?: MediaKind; onPick?: (item: MediaItem) => void; compact?: boolean }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    listMedia()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    const list = [...files];
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${file.name}${list.length > 1 ? ` (${i + 1} of ${list.length})` : ""}…`);
      try {
        const item = await uploadFile(file);
        setItems((prev) => [item, ...(prev ?? [])]);
        if (onPick && list.length === 1 && KIND_FILTER[kind](item)) onPick(item);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
    }
    setBusy(null);
  };

  const shown = (items ?? []).filter(KIND_FILTER[kind]);

  return (
    <div
      className={`ed-library${over ? " is-over" : ""}${compact ? " is-compact" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      }}
    >
      <button type="button" className="ed-drop" onClick={() => input.current?.click()} disabled={!!busy}>
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 12V3M5.500 6.500L9 3l3.500 3.500M3 15h12" />
        </svg>
        <span>{busy ?? "Drop files here, or click to upload"}</span>
        <small>Images, video, audio, fonts, PDF, zip, Lottie, .glb · up to 95 MB</small>
      </button>
      <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files?.length && void upload(e.target.files).then(() => (e.target.value = ""))} />
      {error ? (
        <p className="ed-note" role="alert">
          {error}
        </p>
      ) : null}
      {items === null && !error ? <p className="ed-hint">Loading…</p> : null}
      {items && !shown.length ? <p className="ed-hint">Nothing here yet.</p> : null}
      <ul className="ed-assets">
        {shown.map((item) => (
          <li key={item.key}>
            <button type="button" className="ed-asset" onClick={() => onPick?.(item)} disabled={!onPick} title={onPick ? `Use ${item.name}` : item.name}>
              {item.kind === "image" ? <img src={/\.(svg|gif)$/i.test(item.key) ? item.url : `${item.url}?w=480`} alt="" loading="lazy" /> : <span className="ed-asset-glyph">{KIND_GLYPH[item.kind] ?? "↓"}</span>}
            </button>
            <span className="ed-asset-name" title={item.name}>
              {item.name}
            </span>
            <span className="ed-asset-meta">
              {item.width ? `${item.width}×${item.height} · ` : ""}
              {formatSize(item.size)}
            </span>
            <span className="ed-asset-tools">
              <button
                type="button"
                className="ed-mini"
                aria-label={`Copy the URL of ${item.name}`}
                title="Copy URL"
                onClick={() => {
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
                onClick={() => {
                  if (!window.confirm(`Delete ${item.name}? Pages that use it will show a broken image.`)) return;
                  deleteMedia(item.key)
                    .then(() => setItems((prev) => (prev ?? []).filter((x) => x.key !== item.key)))
                    .catch((e: Error) => setError(e.message));
                }}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
