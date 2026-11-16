import type { CustomField } from "@puckeditor/core";
import { useState } from "react";
import { uploadFile } from "../media";
import { TextInput } from "../ui/kit";

export type MediaKind = "image" | "video" | "audio" | "file" | "font" | "any";

/** Filled in by <MediaPickerHost>: opens the media library and resolves with the chosen URL. */
let picker: ((kind: MediaKind) => Promise<string | null>) | null = null;
export const registerMediaPicker = (fn: typeof picker) => {
  picker = fn;
};

export function MediaInput({ value, onChange, kind, label }: { value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      className={`ed-media${busy ? " is-busy" : ""}`}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={async (e) => {
        // Drop a file straight onto the field: upload it and use it.
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
      {kind === "image" && value ? <img src={value} alt="" /> : null}
      <TextInput ariaLabel={label} value={value ?? ""} placeholder="Paste a URL or choose…" onCommit={onChange} />
      <button
        type="button"
        className="ed-btn ed-btn-ghost"
        onClick={async () => {
          const chosen = await picker?.(kind);
          if (chosen) onChange(chosen);
        }}
      >
        {busy ? "Uploading…" : "Choose"}
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mediaField = (label: string, kind: MediaKind): CustomField<any> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <div className="ed-field">
      <span className="ed-field-label">{label}</span>
      <MediaInput value={value} onChange={onChange} kind={kind} label={label} />
    </div>
  ),
});
