import { useState } from "react";

export type AlignValue = "start" | "center" | "end" | "stretch" | undefined;
/** null leaves that axis as it is; undefined clears it (back to the default). */
export type AlignPatch = { x: AlignValue | null; y: AlignValue | null };

const AXIS = ["start", "center", "end"] as const;
const ROW_NAME = { start: "top", center: "middle", end: "bottom" } as const;
const COL_NAME = { start: "left", center: "centre", end: "right" } as const;
const MORE_KEY = "aoost.alignMore";

const readMore = () => {
  try {
    return localStorage.getItem(MORE_KEY) === "1";
  } catch {
    return false;
  }
};

const JUSTIFY = [
  { value: "start", label: "Start" },
  { value: "center", label: "Centre" },
  { value: "end", label: "End" },
  { value: "stretch", label: "Stretch" },
] as const;
const ITEMS = [
  { value: "start", label: "Top" },
  { value: "center", label: "Middle" },
  { value: "end", label: "Bottom" },
  { value: "stretch", label: "Stretch" },
] as const;

/**
 * A 3×3 alignment grid that sets both axes at once, and a "More" button that
 * opens the fine controls (Justify and Items) underneath. Both edit the same
 * two values, so they always agree. The open/closed state is remembered.
 * The layout model has no direction, wrap or space-between, so those aren't offered.
 */
export function AlignControl({ x, y, onChange }: { x: AlignValue; y: AlignValue; onChange: (patch: AlignPatch) => void }) {
  const [more, setMoreState] = useState(readMore);
  const setMore = (v: boolean) => {
    setMoreState(v);
    try {
      localStorage.setItem(MORE_KEY, v ? "1" : "0");
    } catch {
      /* not remembered */
    }
  };
  return (
    <div className="ed-align2">
      <div className="ed-align2-top">
        <div className="ed-align-grid" role="group" aria-label="Alignment">
          {AXIS.map((row) =>
            AXIS.map((col) => {
              const on = x === col && y === row;
              // A stretched axis lights the whole row or column.
              const near = (x === "stretch" && y === row) || (y === "stretch" && x === col) || (x === "stretch" && y === "stretch");
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  aria-label={`Align ${ROW_NAME[row]} ${COL_NAME[col]}`}
                  aria-pressed={on}
                  className={near ? "is-near" : undefined}
                  onClick={() => onChange({ x: col, y: row })}
                >
                  <span />
                </button>
              );
            }),
          )}
        </div>
        <button type="button" className={`ed-align-more${more ? " is-on" : ""}`} aria-expanded={more} aria-label="More alignment options" title="More alignment options" onClick={() => setMore(!more)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <path d="M2 4.5h12M2 11.5h12" />
            <circle cx="5.5" cy="4.5" r="1.6" fill="currentColor" />
            <circle cx="10.5" cy="11.5" r="1.6" fill="currentColor" />
          </svg>
        </button>
      </div>
      {more ? (
        <div className="ed-align-fine">
          <FineRow label="Justify" value={x} options={JUSTIFY} onPick={(v) => onChange({ x: v, y: null })} />
          <FineRow label="Items" value={y} options={ITEMS} onPick={(v) => onChange({ x: null, y: v })} />
        </div>
      ) : null}
    </div>
  );
}

function FineRow({ label, value, options, onPick }: { label: string; value: AlignValue; options: readonly { value: Exclude<AlignValue, undefined>; label: string }[]; onPick: (v: AlignValue) => void }) {
  return (
    <div className="ed-align-fine-row">
      <span className="ed-label">{label}</span>
      <div className="ed-seg ed-seg-fill" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} title={value === o.value ? "Click again for the default" : undefined} onClick={() => onPick(value === o.value ? undefined : o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
