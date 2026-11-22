import type { CustomField } from "@puckeditor/core";

/** Small field helpers shared by the aoost blocks' editor forms. */

/** A list row that shows the picture it holds next to its name (the text stays the row's name). */
export const withThumb = (src: string | undefined, text: string) =>
  src ? (
    <span className="ed-sum">
      <img src={src} alt="" loading="lazy" decoding="async" />
      <span>{text}</span>
    </span>
  ) : (
    text
  );
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onOff = (label: string): any => ({
  type: "radio",
  label,
  options: [
    { label: "On", value: true },
    { label: "Off", value: false },
  ],
});

export const matField = {
  type: "select" as const,
  label: "Cutting-mat background",
  options: [
    { label: "Light mat", value: "light" as const },
    { label: "Dark mat", value: "dark" as const },
    { label: "None", value: "none" as const },
  ],
};

/** A list of short strings typed as "one, two, three". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listField = (label: string, placeholder = ""): CustomField<any> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <label className="ed-field">
      <span className="ed-field-label">{label}</span>
      <input
        className="ed-input"
        defaultValue={Array.isArray(value) ? value.join(", ") : ""}
        placeholder={placeholder}
        onBlur={(e) => {
          const list = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
          onChange(list.length ? list : undefined);
        }}
      />
    </label>
  ),
});

/** A colour as a swatch plus its hex value. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hexField = (label: string): CustomField<any> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <label className="ed-field">
      <span className="ed-field-label">{label}</span>
      <span className="ed-color">
        <input type="color" className="ed-colorwell" value={/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#141516"} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label} />
        <input className="ed-input" defaultValue={value ?? ""} key={value} placeholder="#141516" onBlur={(e) => onChange(e.target.value.trim() || undefined)} aria-label={`${label} value`} />
      </span>
    </label>
  ),
});
