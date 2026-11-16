import type { CustomField, Fields } from "@puckeditor/core";
import type { CodeContent } from "./Code";

const codeArea = (label: string, rows: number): CustomField<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <label className="ed-field">
      <span className="ed-field-label">{label}</span>
      <textarea className="ed-input ed-code" rows={rows} value={value ?? ""} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
    </label>
  ),
});

const modeField: CustomField<CodeContent["mode"]> = {
  type: "custom",
  label: "Runs as",
  render: ({ value, onChange }) => (
    <div className="ed-field">
      <span className="ed-field-label">Runs as</span>
      <div className="ed-seg ed-seg-fill" role="group" aria-label="Runs as">
        <button type="button" aria-pressed={value !== "inline"} onClick={() => onChange("sandboxed")}>
          Sandboxed (safe)
        </button>
        <button type="button" aria-pressed={value === "inline"} onClick={() => onChange("inline")}>
          Inline (advanced)
        </button>
      </div>
      {value === "inline" ? (
        <p className="ed-note" role="alert">
          Inline code runs inside the page itself: it can change or break anything on it, and it sees what visitors do. Only paste code you wrote or fully trust. Its script does not run here in the editor; use Preview to see it.
        </p>
      ) : (
        <p className="ed-hint">Runs in its own frame and resizes to fit. It can't touch the page or the editor.</p>
      )}
    </div>
  ),
};

export const fields: Fields<CodeContent> = {
  mode: modeField,
  html: codeArea("HTML", 6),
  css: codeArea("CSS", 5),
  js: codeArea("JavaScript", 5),
};
