import type { CustomField } from "@puckeditor/core";
import type { LinkTarget } from "../../schema";
import { useEditor } from "../store";
import { Select } from "../ui/kit";
import { LinkField } from "./LinkField";

/** Helpers that wrap our controls as Puck custom fields. */

export const linkField = (label: string): CustomField<LinkTarget> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <div className="ed-field">
      <span className="ed-field-label">{label}</span>
      <LinkField value={value} onChange={onChange} />
    </div>
  ),
});

/** Pick one of the theme's text styles. */
export const typeStyleField = (label = "Text style"): CustomField<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => <TypeStylePicker label={label} value={value} onChange={onChange} />,
});

function TypeStylePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const styles = useEditor((s) => s.site.theme.typeStyles);
  return (
    <div className="ed-field">
      <span className="ed-field-label">{label}</span>
      <Select ariaLabel={label} value={value} options={Object.entries(styles).map(([id, t]) => ({ value: id, label: t.name }))} onChange={(v) => v && onChange(v)} />
    </div>
  );
}

/** Pick from a collection in the site (playlists, global components). */
export const collectionField = (label: string, pick: (site: import("../../schema").Site) => { value: string; label: string }[]): CustomField<string> => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => <CollectionPicker label={label} value={value} onChange={onChange} pick={pick} />,
});

function CollectionPicker({ label, value, onChange, pick }: { label: string; value: string; onChange: (v: string) => void; pick: (site: import("../../schema").Site) => { value: string; label: string }[] }) {
  const site = useEditor((s) => s.site);
  return (
    <div className="ed-field">
      <span className="ed-field-label">{label}</span>
      <Select ariaLabel={label} value={value ?? ""} options={[{ value: "", label: "Choose…" }, ...pick(site)]} onChange={onChange} />
    </div>
  );
}
