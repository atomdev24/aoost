import type { CustomField } from "@puckeditor/core";

/** A colour: pick it, or type any CSS colour (blank for the default). */
export const colorField = (label: string): CustomField<string | undefined> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => {
    const hex = /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : "#e2c12f";
    return (
      <div className="ed-field">
        <span className="ed-field-label">{label}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="color" aria-label={`${label}: pick`} value={hex} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 30, padding: 0, border: 0, background: "none", cursor: "pointer" }} />
          <input className="ed-input" placeholder="Default" aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} style={{ flex: 1 }} />
        </div>
      </div>
    );
  },
});
