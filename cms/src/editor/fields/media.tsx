import type { CustomField } from "@puckeditor/core";
import { useState } from "react";
import { updateNode } from "../../model/page-ops";
import { resolve, setOnly } from "../../responsive/resolve";
import { DEFAULT_FRAME_FIT, type FrameFit, type Node } from "../../schema";
import { uploadFile } from "../media";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { TextInput } from "../ui/kit";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { FocalPicker } from "./FocalPicker";

export type MediaKind = "image" | "video" | "audio" | "file" | "font" | "any";

/** Filled in by <MediaPickerHost>: opens the media library and resolves with the chosen URL. */
let picker: ((kind: MediaKind) => Promise<string | null>) | null = null;
export const registerMediaPicker = (fn: typeof picker) => {
  picker = fn;
};
export const pickMedia = (kind: MediaKind) => picker?.(kind) ?? Promise.resolve(null);

const GLYPH: Record<MediaKind, string> = { image: "◩", video: "▶", audio: "♪", file: "↓", font: "Aa", any: "◇" };
const FIT_NAME: Record<FrameFit["fit"], string> = { fill: "Cover", fit: "Fit", free: "Free" };
const IMAGE = /\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i;

/** "hero.jpg" from "/media/2026/hero.jpg?w=480". */
export const fileName = (url: string) => {
  try {
    return decodeURIComponent(url.split("?")[0]!.split("/").filter(Boolean).pop() ?? url);
  } catch {
    return url;
  }
};

/** The selected block when this field is its own picture (Image's src): its frame fit and alt text live on the node. */
function useOwner(owner: boolean): Node | null {
  const id = useEditor((s) => s.selection[0]);
  const page = useEditor(currentPage);
  if (!owner || !id) return null;
  for (const s of page.sections) for (const n of s.children) if (n.id === id) return n;
  return null;
}

/**
 * A media field as one compact row: thumbnail, file name and (for a framed
 * picture) the fit mode. Clicking it opens a frosted popover with the preview
 * and focal point, Replace and Remove, Cover / Fit / Free, and the alt text.
 * Dropping a file on the row uploads it and uses it.
 */
export function MediaInput({ value, onChange, kind, label, owner = false }: { value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string; owner?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Anchor | null>(null);
  const node = useOwner(owner);
  const bp = useEditor((s) => s.bp);
  const fit = node?.frame ? { ...DEFAULT_FRAME_FIT, ...resolve(node.frame, bp) } : null;
  const isImage = !!value && (kind === "image" || IMAGE.test(value));
  return (
    <div
      className={`ed-mediarow${busy ? " is-busy" : ""}`}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={async (e) => {
        const file = e.dataTransfer.files[0];
        if (!file) return;
        e.preventDefault();
        setBusy(true);
        try {
          onChange((await uploadFile(file)).url);
        } catch (err) {
          window.alert(err instanceof Error ? err.message : "Upload failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <button type="button" className="ed-mediarow-main" aria-label={`${label}: ${value ? fileName(value) : "none"}. Open media options`} aria-haspopup="dialog" aria-expanded={!!open} onClick={(e) => setOpen(open ? null : anchorOf(e.currentTarget))}>
        <span className="ed-mediarow-thumb">{isImage ? <img src={/\.(svg|gif)(\?|$)/i.test(value!) || /^https?:/.test(value!) ? value : `${value}?w=96`} alt="" /> : <span>{GLYPH[kind]}</span>}</span>
        <span className="ed-mediarow-name">{busy ? "Uploading…" : value ? fileName(value) : "Choose…"}</span>
        {fit && value ? <span className="ed-mediarow-fit">{FIT_NAME[fit.fit]}</span> : null}
      </button>
      {open ? <MediaPopover anchor={open} value={value} onChange={onChange} kind={kind} label={label} node={node} fit={fit} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function MediaPopover({ anchor, value, onChange, kind, label, node, fit, onClose }: { anchor: Anchor; value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string; node: Node | null; fit: FrameFit | null; onClose: () => void }) {
  const editNode = (fn: (n: Node) => Node, what: string, merge?: string) => node && updatePage(getState().pageId, (p) => updateNode(p, node.id, fn), what, { merge });
  const setFit = (patch: Partial<FrameFit>, merge?: string) =>
    editNode((n) => {
      const r = n.frame ?? { base: DEFAULT_FRAME_FIT };
      return { ...n, frame: setOnly(r, getState().bp, patch) };
    }, "Picture in frame", merge);
  const isImage = !!value && (kind === "image" || IMAGE.test(value));
  const hasAlt = !!node && "alt" in node.content;
  return (
    <Popover anchor={anchor} onClose={onClose} side="left" className="ed-mediapop" label={label} width={260}>
      <div className="ed-mediapop-preview">
        {isImage && fit ? (
          <FocalPicker src={value!} x={fit.focalX} y={fit.focalY} onChange={(focalX, focalY) => setFit({ focalX, focalY }, `focal:${node!.id}`)} />
        ) : isImage ? (
          <img src={value} alt="" />
        ) : (
          <span className="ed-mediapop-glyph">{value ? fileName(value) : "Nothing chosen"}</span>
        )}
      </div>
      <div className="ed-mediapop-actions">
        <button
          type="button"
          className="ed-btn ed-btn-accent ed-btn-sm"
          onClick={async () => {
            const chosen = await pickMedia(kind);
            if (chosen) onChange(chosen);
          }}
        >
          {value ? "Replace" : "Choose"}
        </button>
        {value ? (
          <button type="button" className="ed-btn ed-btn-sm" onClick={() => onChange("")}>
            Remove
          </button>
        ) : null}
      </div>
      {fit ? (
        <div className="ed-seg ed-seg-fill" role="group" aria-label="Content fit">
          {(["fill", "fit", "free"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={fit.fit === f} title={f === "fill" ? "Cover the frame" : f === "fit" ? "Show all of it" : "Pan and zoom freely (double-click the picture on the canvas)"} onClick={() => setFit({ fit: f })}>
              {FIT_NAME[f]}
            </button>
          ))}
        </div>
      ) : null}
      {hasAlt ? (
        <label className="ed-mediapop-field">
          <span>Alt text</span>
          <TextInput ariaLabel="Alt text" value={(node!.content.alt as string) ?? ""} placeholder="Describe the picture" onCommit={(alt) => editNode((n) => ({ ...n, content: { ...n.content, alt } }), "Alt text")} />
        </label>
      ) : null}
      <label className="ed-mediapop-field">
        <span>Link</span>
        <TextInput ariaLabel={`${label} URL`} value={value ?? ""} placeholder="Paste a URL" onCommit={onChange} />
      </label>
      {fit ? <p className="ed-hint">Double-click the picture on the canvas to move and scale it inside its frame.</p> : null}
    </Popover>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mediaField = (label: string, kind: MediaKind, opts: { owner?: boolean } = {}): CustomField<any> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <div className={`ed-field${label.length > 16 ? " is-long" : ""}`}>
      <span className="ed-field-label" title={label}>
        {label}
      </span>
      <MediaInput value={value} onChange={onChange} kind={kind} label={label} owner={opts.owner} />
    </div>
  ),
});
