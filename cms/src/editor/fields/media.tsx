import type { CustomField } from "@puckeditor/core";
import { TextInput } from "../ui/kit";

export type MediaKind = "image" | "video" | "audio" | "file" | "font" | "any";

/** Slot the media library fills in (Phase 4). Until then it is a URL box. */
let picker: ((kind: MediaKind) => Promise<string | null>) | null = null;
export const registerMediaPicker = (fn: typeof picker) => {
  picker = fn;
};

export function MediaInput({ value, onChange, kind, label }: { value: string | undefined; onChange: (v: string) => void; kind: MediaKind; label: string }) {
  return (
    <div className="ed-media">
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
        Choose
      </button>
    </div>
  );
}

export const mediaField = (label: string, kind: MediaKind): CustomField<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <div className="ed-field">
      <span className="ed-field-label">{label}</span>
      <MediaInput value={value} onChange={onChange} kind={kind} label={label} />
    </div>
  ),
});
