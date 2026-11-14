import { useEffect, useId, useState, type ReactNode } from "react";
import { useEditor } from "../store";

/** Small dark-workspace form controls shared by every editor panel. */

export function Group({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="ed-group">
      <header className="ed-group-head">
        <h4>{title}</h4>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Row({ label, children, dot, htmlFor, stack }: { label: string; children: ReactNode; dot?: ReactNode; htmlFor?: string; stack?: boolean }) {
  return (
    <div className={`ed-row${stack ? " ed-row-stack" : ""}`}>
      <label className="ed-label" htmlFor={htmlFor}>
        {label}
        {dot}
      </label>
      <div className="ed-control">{children}</div>
    </div>
  );
}

/** A text input that commits on blur or Enter, and can veto invalid values. */
export function TextInput({
  value,
  onCommit,
  placeholder,
  validate,
  id,
  live,
  type = "text",
  ariaLabel,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  validate?: (v: string) => boolean;
  id?: string;
  /** Commit on every keystroke instead of on blur. */
  live?: boolean;
  type?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [bad, setBad] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const commit = (v: string) => {
    if (v !== "" && validate && !validate(v)) return setBad(true);
    setBad(false);
    if (v !== value) onCommit(v);
  };
  return (
    <input
      id={id}
      className="ed-input"
      type={type}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={bad || undefined}
      onChange={(e) => {
        setDraft(e.target.value);
        if (live) commit(e.target.value);
      }}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(draft);
        if (e.key === "Escape") setDraft(value);
      }}
    />
  );
}

export function NumberInput({
  value,
  onCommit,
  min,
  max,
  step = 1,
  placeholder,
  id,
  ariaLabel,
  suffix,
}: {
  value: number | undefined;
  onCommit: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);
  const commit = (raw: string) => {
    if (raw.trim() === "") return onCommit(undefined);
    let n = Number(raw);
    if (Number.isNaN(n)) return setDraft(value === undefined ? "" : String(value));
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    if (n !== value) onCommit(n);
  };
  return (
    <span className="ed-number">
      <input
        id={id}
        className="ed-input"
        type="number"
        inputMode="decimal"
        value={draft}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
      />
      {suffix ? <span className="ed-suffix">{suffix}</span> : null}
    </span>
  );
}

export function Select<T extends string>({ value, options, onChange, id, ariaLabel }: { value: T | ""; options: { value: T | ""; label: string }[]; onChange: (v: T | "") => void; id?: string; ariaLabel?: string }) {
  return (
    <select id={id} className="ed-input ed-select" value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value as T | "")}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ed-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="ed-toggle" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

/** Pick a theme colour token, or a custom colour. "" means not set. */
export function ColorInput({ value, onChange, label }: { value: string | undefined; onChange: (v: string | undefined) => void; label: string }) {
  const colors = useEditor((s) => s.site.theme.colors);
  const token = value?.startsWith("token:") ? value.slice(6) : null;
  const mode = value === undefined ? "" : token && token in colors ? value : "custom";
  const hex = token ? (colors[token] ?? "#000000") : (value ?? "#141414");
  return (
    <span className="ed-color">
      <span className="ed-swatch" style={{ background: value === undefined ? "transparent" : hex }} aria-hidden="true" />
      <Select
        ariaLabel={label}
        value={mode}
        options={[{ value: "", label: "None" }, ...Object.keys(colors).map((k) => ({ value: `token:${k}`, label: k })), { value: "custom", label: "Custom" }]}
        onChange={(v) => onChange(v === "" ? undefined : v === "custom" ? hex : v)}
      />
      {mode === "custom" ? <TextInput ariaLabel={`${label} value`} value={value ?? ""} onCommit={(v) => onChange(v || undefined)} placeholder="#141414" /> : null}
    </span>
  );
}

export function Button({ children, onClick, variant = "ghost", disabled, title, type = "button" }: { children: ReactNode; onClick?: () => void; variant?: "ghost" | "primary" | "accent" | "danger"; disabled?: boolean; title?: string; type?: "button" | "submit" }) {
  return (
    <button type={type} className={`ed-btn ed-btn-${variant}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ed-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`ed-modal${wide ? " ed-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header>
          <h3 id={id}>{title}</h3>
          <button type="button" className="ed-icon" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l14 14M17 3L3 17" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
