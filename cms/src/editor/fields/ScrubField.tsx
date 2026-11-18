import { useEffect, useState } from "react";
import { parseLength } from "./spacing";

type Common = {
  glyph?: string;
  suffix?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  min?: number;
  max?: number;
  step?: number;
};

const clamp = (n: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
const show = (n: number | undefined) => (n === undefined ? "" : String(Math.round(n * 1000) / 1000));

/**
 * A dense inspector number: a small leading glyph and the value. Typing
 * commits on Enter or blur; Esc puts the old value back.
 */
export function ScrubNumber({ value, onChange, glyph, suffix, placeholder, id, ariaLabel, min, max, step = 1 }: Common & { value: number | undefined; onChange: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState(show(value));
  useEffect(() => setDraft(show(value)), [value]);
  const commit = (raw: string) => {
    if (raw.trim() === "") return value !== undefined && onChange(undefined);
    const n = Number(raw);
    if (Number.isNaN(n)) return setDraft(show(value));
    const next = clamp(step >= 1 ? Math.round(n) : n, min, max);
    if (next !== value) onChange(next);
    else setDraft(show(value));
  };
  return (
    <span className="ed-scrub">
      {glyph ? (
        <span className="ed-scrub-glyph" aria-hidden="true">
          {glyph}
        </span>
      ) : null}
      <input
        id={id}
        className="ed-scrub-input"
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") setDraft(show(value));
        }}
      />
      {suffix ? <span className="ed-scrub-suffix">{suffix}</span> : null}
    </span>
  );
}

/** A CSS length ("320px", "50%", "auto"). The number part scrubs; the unit is kept. */
export function ScrubLength({ value, onChange, validate, ...rest }: Common & { value: string | undefined; onChange: (v: string | undefined) => void; validate?: (v: string) => boolean }) {
  const [draft, setDraft] = useState(value ?? "");
  const [bad, setBad] = useState(false);
  useEffect(() => setDraft(value ?? ""), [value]);
  const commit = (raw: string) => {
    const v = /^-?\d*\.?\d+$/.test(raw.trim()) ? `${raw.trim()}px` : raw.trim();
    if (v !== "" && validate && !validate(v)) return setBad(true);
    setBad(false);
    if (v !== (value ?? "")) onChange(v || undefined);
  };
  void parseLength;
  return (
    <span className="ed-scrub">
      {rest.glyph ? (
        <span className="ed-scrub-glyph" aria-hidden="true">
          {rest.glyph}
        </span>
      ) : null}
      <input
        id={rest.id}
        className="ed-scrub-input"
        type="text"
        value={draft}
        placeholder={rest.placeholder}
        aria-label={rest.ariaLabel}
        aria-invalid={bad || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") setDraft(value ?? "");
        }}
      />
    </span>
  );
}
