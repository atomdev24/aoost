import type { CustomField } from "@puckeditor/core";
import { useState } from "react";
import { updateNode } from "../../model/page-ops";
import { overriddenKeys, resetToDesktop, resetToMobile, resolve, setOnly } from "../../responsive/resolve";
import { itemAt } from "../../components/aoost/frames";
import type { FrameSlot } from "../../components/types";
import { DEFAULT_FRAME_FIT, type FrameFit, type Node, type Responsive } from "../../schema";
import { itemPathOfField, slotOf, withItemValue, withSlotFrame, type SlotPath } from "../canvas/slots";
import { uploadFile } from "../media";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { TextInput } from "../ui/kit";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { FocalPicker } from "./FocalPicker";
import { OverrideLabel } from "./ResponsiveEditor";

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

/** The selected block. */
function useSelectedNode(): Node | null {
  const id = useEditor((s) => s.selection[0]);
  const page = useEditor(currentPage);
  if (!id) return null;
  for (const s of page.sections) for (const n of s.children) if (n.id === id) return n;
  return null;
}

/** A picture inside the selected block's content (an aoost block's artwork or cover), found from its field's name. */
export type SlotRef = { node: Node; slot: FrameSlot; path: SlotPath };
function useSlot(name: string | undefined): SlotRef | null {
  const node = useSelectedNode();
  const path = itemPathOfField(name);
  if (!node || !path) return null;
  const slot = slotOf(node, path);
  return slot ? { node, slot, path } : null;
}

/** Change one content picture's frame at a breakpoint (one undo step, or merged while dragging). */
function editSlotFrame(ref: SlotRef, fn: (r: Responsive<FrameFit>) => Responsive<FrameFit>, what: string, merge?: string) {
  updatePage(
    getState().pageId,
    (p) =>
      updateNode(p, ref.node.id, (n) => {
        const r = slotOf(n, ref.path)?.frame ?? { base: DEFAULT_FRAME_FIT };
        return withSlotFrame(n, ref.path, fn(r));
      }),
    what,
    { merge },
  );
}

/**
 * A media field as one compact row: thumbnail, file name and (for a framed
 * picture) the fit mode. Clicking it opens a frosted popover with the preview
 * and focal point, Replace and Remove, Cover / Fit / Free, and the alt text.
 * Dropping a file on the row uploads it and uses it.
 */
export function MediaInput({ value, onChange, kind, label, owner = false, slot = null, altKey }: { value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string; owner?: boolean; slot?: SlotRef | null; altKey?: string }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Anchor | null>(null);
  const node = useOwner(owner);
  const bp = useEditor((s) => s.bp);
  const frame = slot ? (slot.slot.frame ?? { base: DEFAULT_FRAME_FIT }) : node?.frame;
  const fit = frame ? { ...DEFAULT_FRAME_FIT, ...resolve(frame, bp) } : null;
  const over = bp === "mobile" && !!slot?.slot.frame && overriddenKeys(slot.slot.frame).length > 0;
  const isImage = !!value && (kind === "image" || IMAGE.test(value));
  return (
    <div
      className={`ed-mediarow${busy ? " is-busy" : ""}${over ? " is-over" : ""}`}
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
      {open ? <MediaPopover anchor={open} value={value} onChange={onChange} kind={kind} label={label} node={node} slot={slot} altKey={altKey} fit={fit} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function MediaPopover({ anchor, value, onChange, kind, label, node, slot, altKey, fit, onClose }: { anchor: Anchor; value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string; node: Node | null; slot: SlotRef | null; altKey?: string; fit: FrameFit | null; onClose: () => void }) {
  const editNode = (fn: (n: Node) => Node, what: string, merge?: string) => node && updatePage(getState().pageId, (p) => updateNode(p, node.id, fn), what, { merge });
  const setFit = (patch: Partial<FrameFit>, merge?: string) =>
    slot
      ? editSlotFrame(slot, (r) => setOnly(r, getState().bp, patch), "Picture in frame", merge)
      : editNode((n) => {
          const r = n.frame ?? { base: DEFAULT_FRAME_FIT };
          return { ...n, frame: setOnly(r, getState().bp, patch) };
        }, "Picture in frame", merge);
  const isImage = !!value && (kind === "image" || IMAGE.test(value));
  const hasAlt = !!node && "alt" in node.content;
  // A content picture's alt text lives on its item (the hero reel's "alt").
  const itemAlt = slot && altKey ? ((itemAt(slot.node.content, slot.path)?.[altKey] as string | undefined) ?? "") : null;
  // Background pictures (journal covers) can cover or fit their frame, not pan and zoom.
  const fits = slot?.slot.kind === "bg" ? (["fill", "fit"] as const) : (["fill", "fit", "free"] as const);
  return (
    <Popover anchor={anchor} onClose={onClose} side="left" className="ed-mediapop" label={label} width={260}>
      <div className="ed-mediapop-preview">
        {isImage && fit ? (
          <FocalPicker src={value!} x={fit.focalX} y={fit.focalY} onChange={(focalX, focalY) => setFit({ focalX, focalY }, `focal:${slot ? `${slot.node.id}:${slot.path.join(".")}` : node!.id}`)} />
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
          {fits.map((f) => (
            <button key={f} type="button" aria-pressed={fit.fit === f} title={f === "fill" ? "Cover the frame" : f === "fit" ? "Show all of it" : "Pan and zoom freely (double-click the picture on the canvas)"} onClick={() => setFit({ fit: f })}>
              {FIT_NAME[f]}
            </button>
          ))}
        </div>
      ) : null}
      {itemAlt !== null ? (
        <label className="ed-mediapop-field">
          <span>Alt text</span>
          <TextInput ariaLabel="Alt text" value={itemAlt} placeholder="Describe the picture" onCommit={(alt) => updatePage(getState().pageId, (p) => updateNode(p, slot!.node.id, (n) => withItemValue(n, slot!.path, altKey!, alt)), "Alt text")} />
        </label>
      ) : hasAlt ? (
        <label className="ed-mediapop-field">
          <span>Alt text</span>
          <TextInput ariaLabel="Alt text" value={(node!.content.alt as string) ?? ""} placeholder="Describe the picture" onCommit={(alt) => editNode((n) => ({ ...n, content: { ...n.content, alt } }), "Alt text")} />
        </label>
      ) : null}
      <label className="ed-mediapop-field">
        <span>Link</span>
        <TextInput ariaLabel={`${label} URL`} value={value ?? ""} placeholder="Paste a URL" onCommit={onChange} />
      </label>
      {fit ? <p className="ed-hint">{slot?.slot.kind === "bg" ? "Double-click the picture on the canvas to move it inside its frame." : "Double-click the picture on the canvas to move and scale it inside its frame."}</p> : null}
    </Popover>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mediaField = (label: string, kind: MediaKind, opts: { owner?: boolean; framed?: boolean; altKey?: string } = {}): CustomField<any> => ({
  type: "custom",
  label,
  render: ({ value, onChange, name }) =>
    opts.framed ? (
      <FramedMediaField name={name} value={value} onChange={onChange} kind={kind} label={label} altKey={opts.altKey} />
    ) : (
      <div className={`ed-field${label.length > 16 ? " is-long" : ""}`}>
        <span className="ed-field-label" title={label}>
          {label}
        </span>
        <MediaInput value={value} onChange={onChange} kind={kind} label={label} owner={opts.owner} />
      </div>
    ),
});

/**
 * The picture of a content item that can be framed per screen size (an aoost block's artwork or
 * cover). On Mobile, a framing that differs from desktop tints the row, and the label offers
 * "Reset to desktop" and "Use on all sizes", like every other per-size value.
 */
function FramedMediaField({ name, value, onChange, kind, label, altKey }: { name: string; value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string; altKey?: string }) {
  const slot = useSlot(name);
  const bp = useEditor((s) => s.bp);
  const frame = slot?.slot.frame;
  const over = bp === "mobile" && !!frame && overriddenKeys(frame).length > 0;
  const desktop = frame ? resolve(frame, "desktop") : null;
  return (
    <div className={`ed-field${label.length > 16 ? " is-long" : ""}`}>
      {over && slot ? (
        <OverrideLabel
          label={label}
          desktop={desktop ? `${FIT_NAME[desktop.fit ?? "fill"]} at ${desktop.focalX ?? 50}% ${desktop.focalY ?? 50}%` : "not set"}
          onReset={() => editSlotFrame(slot, (r) => resetToDesktop(r), "Reset to desktop")}
          onUseEverywhere={() => editSlotFrame(slot, (r) => resetToMobile(r), "Use on all sizes")}
        />
      ) : (
        <span className="ed-field-label" title={label}>
          {label}
        </span>
      )}
      <MediaInput value={value} onChange={onChange} kind={kind} label={label} slot={slot} altKey={altKey} />
    </div>
  );
}
